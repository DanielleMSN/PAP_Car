// =====================================================================
// diagnostico.js
// Comportamento do ecrã "Diagnóstico": procurar o leitor, ligar, mostrar
// a rotação, a temperatura e os códigos de avaria.
//
// Este ficheiro só trata do que se vê e dos toques. O trabalho com o
// Bluetooth e com o leitor está nos ficheiros da pasta servicos/.
//
// REGRA DO PROJETO: só aparecem no ecrã valores que vieram mesmo do carro.
// Se uma leitura falhar, aparece o erro e o valor fica com "--".
// =====================================================================

import {
  bluetoothDisponivel,
  dispositivosEmparelhados,
  iniciarPesquisa,
  pararPesquisa,
  prepararBluetooth,
} from '../servicos/bluetooth.js';
import {
  definirRegisto,
  desligarLeitor,
  esquecerLigacao,
  lerCodigosAvaria,
  lerRpm,
  lerTemperatura,
  ligarLeitor,
} from '../servicos/leitor_obd.js';
import { sistemaDoCodigo } from '../utilitarios/interpretar_obd.js';

// ---------------------------------------------------------------------
// BLOCO 1: Valores fixos e elementos da página
// ---------------------------------------------------------------------
const DURACAO_PESQUISA = 15000; // 15 segundos
const INTERVALO_LEITURA = 1000; // pausa de 1 segundo entre leituras

// Palavras que costumam aparecer no nome destes leitores. Servem apenas
// para pôr esses dispositivos no topo da lista.
const NOMES_PROVAVEIS = /obd|elm|norauto|vlink|v-link|icar|scan|car|ble/i;

// Função curta para não repetir document.getElementById tantas vezes.
const elemento = (id) => document.getElementById(id);

const mensagem = elemento('diagnostico-mensagem');
const zonaPesquisa = elemento('diagnostico-pesquisa');
const zonaLigado = elemento('diagnostico-ligado');
const botaoProcurar = elemento('botao-procurar');
const listaEncontrados = elemento('lista-encontrados');
const listaEmparelhados = elemento('lista-emparelhados');
const nomeLeitor = elemento('nome-leitor');
const valorRpm = elemento('valor-rpm');
const valorTemperatura = elemento('valor-temperatura');
const botaoContinua = elemento('botao-leitura-continua');
const botaoCodigos = elemento('botao-ler-codigos');
const botaoDesligar = elemento('botao-desligar');
const listaCodigos = elemento('lista-codigos');
const registoTecnico = elemento('registo-tecnico');
const botaoCopiar = elemento('botao-copiar-registo');

// Dispositivos encontrados na pesquisa. Um Map guarda pares chave/valor, e
// usamos o endereço como chave para o mesmo dispositivo não aparecer duas vezes.
const encontrados = new Map();

let aLigar = false;
let leituraContinua = false;

// ---------------------------------------------------------------------
// BLOCO 2: Pequenas funções de apoio ao ecrã
// ---------------------------------------------------------------------

// Escreve uma mensagem no cartão do topo.
function mostrarMensagem(texto) {
  mensagem.textContent = texto;
}

// Acrescenta uma linha ao registo técnico, com a hora. O registo existe
// para sabermos exatamente o que o leitor respondeu durante o teste no carro.
function registar(texto) {
  const hora = new Date().toLocaleTimeString('pt-PT');
  registoTecnico.textContent += `${hora}  ${texto}\n`;
  registoTecnico.scrollTop = registoTecnico.scrollHeight;
}

// Atualiza as etiquetas de estado (aqui e no ecrã inicial). Ambas têm o
// atributo data-estado-obd, por isso basta um único ciclo.
function atualizarEtiquetas(ligado) {
  document.querySelectorAll('[data-estado-obd]').forEach((etiqueta) => {
    etiqueta.classList.toggle('etiqueta--ligado', ligado);
    etiqueta.querySelector('[data-estado-texto]').textContent = ligado ? 'Ligado' : 'Não ligado';
  });
}

// Mostra a zona de pesquisa ou a zona de leitor ligado.
function mostrarZonaLigado(ligado) {
  zonaPesquisa.hidden = ligado;
  zonaLigado.hidden = !ligado;
  atualizarEtiquetas(ligado);
}

// ---------------------------------------------------------------------
// BLOCO 3: Desenhar um dispositivo na lista
// Usamos createElement e textContent, em vez de escrever HTML como texto.
// O nome vem do próprio dispositivo: assim, nunca é tratado como código.
// ---------------------------------------------------------------------
function criarLinhaDispositivo(dispositivo, detalhe) {
  const linha = document.createElement('button');
  linha.type = 'button';
  linha.className = 'dispositivo';

  const nome = document.createElement('span');
  nome.className = 'dispositivo__nome';
  nome.textContent = dispositivo.name || 'Sem nome';

  const info = document.createElement('span');
  info.className = 'dispositivo__info';
  info.textContent = detalhe;

  linha.append(nome, info);
  linha.addEventListener('click', () => ligar(dispositivo));
  return linha;
}

// Volta a desenhar a lista toda, com os nomes prováveis primeiro e, dentro
// disso, os dispositivos com o sinal mais forte.
function desenharEncontrados() {
  const ordenados = Array.from(encontrados.values()).sort((a, b) => {
    const provavelA = NOMES_PROVAVEIS.test(a.name ?? '') ? 1 : 0;
    const provavelB = NOMES_PROVAVEIS.test(b.name ?? '') ? 1 : 0;
    return provavelB - provavelA || b.rssi - a.rssi;
  });

  // replaceChildren substitui todo o conteúdo da lista de uma só vez. Os
  // "..." (espalhar) passam cada elemento do array como um argumento.
  listaEncontrados.replaceChildren(
    ...ordenados.map((d) => criarLinhaDispositivo(d, `${d.deviceId}  ·  sinal ${d.rssi} dBm`)),
  );
}

// ---------------------------------------------------------------------
// BLOCO 4: Procurar dispositivos
// ---------------------------------------------------------------------
async function procurar() {
  if (!bluetoothDisponivel()) {
    mostrarMensagem('O Bluetooth só funciona na aplicação instalada no telemóvel.');
    return;
  }

  botaoProcurar.disabled = true;
  encontrados.clear();
  listaEncontrados.replaceChildren();

  // try/catch: tenta fazer o que está no try. Se algo lançar um erro, salta
  // para o catch. O finally corre sempre, com ou sem erro.
  try {
    mostrarMensagem('A preparar o Bluetooth...');
    const { localizacaoLigada } = await prepararBluetooth();
    if (!localizacaoLigada) {
      registar('Aviso: a Localização do telemóvel está desligada.');
    }

    const emparelhados = await dispositivosEmparelhados();
    registar(`Emparelhados no telemóvel: ${emparelhados.length}`);
    listaEmparelhados.replaceChildren(
      ...emparelhados.map((d) => criarLinhaDispositivo(d, d.deviceId)),
    );

    mostrarMensagem(
      localizacaoLigada
        ? 'A procurar durante 15 segundos...'
        : 'A procurar... Liga a Localização do telemóvel, porque sem ela o Android pode não mostrar dispositivos.',
    );

    await iniciarPesquisa((resultado) => {
      const { deviceId, name } = resultado.device;
      const primeiraVez = !encontrados.has(deviceId);
      encontrados.set(deviceId, {
        deviceId,
        name: name || resultado.localName,
        rssi: resultado.rssi,
      });
      if (primeiraVez) {
        registar(`Encontrado: ${name || resultado.localName || 'sem nome'} (${deviceId})`);
      }
      desenharEncontrados();
    });

    // Espera 15 segundos e depois pára. A Promise permite usar await com
    // o setTimeout, que normalmente não sabe esperar assim.
    await new Promise((resolve) => setTimeout(resolve, DURACAO_PESQUISA));
    await pararPesquisa();

    mostrarMensagem(
      encontrados.size > 0
        ? 'Pesquisa terminada. Toca no leitor para ligar.'
        : 'Nenhum dispositivo encontrado. Confirma que o leitor está na porta do carro e a ignição ligada.',
    );
  } catch (erro) {
    mostrarMensagem(`Não foi possível procurar: ${erro.message}`);
    registar(`Erro na pesquisa: ${erro.message}`);
  } finally {
    botaoProcurar.disabled = false;
  }
}

// ---------------------------------------------------------------------
// BLOCO 5: Ligar ao dispositivo escolhido
// ---------------------------------------------------------------------
async function ligar(dispositivo) {
  // Evita dois toques seguidos a iniciar duas ligações.
  if (aLigar) {
    return;
  }
  aLigar = true;

  try {
    await pararPesquisa();
    mostrarMensagem(`A ligar a ${dispositivo.name || dispositivo.deviceId}...`);

    const versao = await ligarLeitor(dispositivo.deviceId, aoPerderLigacao);

    registar(`Leitor pronto: ${versao}`);
    nomeLeitor.textContent = dispositivo.name || dispositivo.deviceId;
    mostrarZonaLigado(true);
    mostrarMensagem('Leitor ligado. Liga a ignição e pede uma leitura.');
  } catch (erro) {
    mostrarMensagem(`Não foi possível ligar: ${erro.message}`);
    registar(`Erro ao ligar: ${erro.message}`);
  } finally {
    aLigar = false;
  }
}

// O plugin chama esta função se a ligação cair sozinha.
function aoPerderLigacao() {
  registar('A ligação caiu.');
  esquecerLigacao();
  pararLeituraContinua();
  mostrarZonaLigado(false);
  mostrarMensagem('A ligação ao leitor caiu. Procura o leitor outra vez.');
}

async function desligar() {
  pararLeituraContinua();
  await desligarLeitor();
  registar('Desligado pelo utilizador.');
  mostrarZonaLigado(false);
  mostrarMensagem('Leitor desligado.');
}

// ---------------------------------------------------------------------
// BLOCO 6: Ler a rotação e a temperatura
// As duas leituras são independentes: se uma falhar, a outra ainda aparece.
// Quando falha, o valor volta a "--", para nunca ficar um número antigo a
// parecer atual.
// ---------------------------------------------------------------------
async function lerValor(funcaoLeitura, elementoValor, unidade) {
  try {
    const valor = await funcaoLeitura();
    elementoValor.textContent = `${Math.round(valor)} ${unidade}`;
    return true;
  } catch (erro) {
    elementoValor.textContent = '--';
    mostrarMensagem(erro.message);
    registar(`Erro: ${erro.message}`);
    return false;
  }
}

// ---------------------------------------------------------------------
// BLOCO 7: Leitura contínua
// Um ciclo while: repete enquanto leituraContinua for verdadeiro. O await
// garante que uma leitura acaba antes de começar a seguinte.
// ---------------------------------------------------------------------
async function iniciarLeituraContinua() {
  leituraContinua = true;
  botaoContinua.textContent = 'Parar leitura';

  while (leituraContinua) {
    await lerValor(lerRpm, valorRpm, 'rpm');
    if (!leituraContinua) break;
    await lerValor(lerTemperatura, valorTemperatura, '°C');
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_LEITURA));
  }
}

function pararLeituraContinua() {
  leituraContinua = false;
  botaoContinua.textContent = 'Iniciar leitura';
}

// ---------------------------------------------------------------------
// BLOCO 8: Ler os códigos de avaria
// Mostra só o código e o sistema a que pertence. A explicação simples de
// cada código virá mais tarde, de uma tabela própria.
// ---------------------------------------------------------------------
async function lerCodigos() {
  botaoCodigos.disabled = true;
  mostrarMensagem('A ler os códigos de avaria...');

  try {
    const codigos = await lerCodigosAvaria();
    registar(`Códigos lidos: ${codigos.length > 0 ? codigos.join(', ') : 'nenhum'}`);

    if (codigos.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'cartao__texto';
      vazio.textContent = 'O carro não reportou códigos de avaria.';
      listaCodigos.replaceChildren(vazio);
    } else {
      listaCodigos.replaceChildren(
        ...codigos.map((codigo) => {
          const linha = document.createElement('div');
          linha.className = 'dispositivo';
          const nome = document.createElement('span');
          nome.className = 'dispositivo__nome';
          nome.textContent = codigo;
          const info = document.createElement('span');
          info.className = 'dispositivo__info';
          info.textContent = sistemaDoCodigo(codigo);
          linha.append(nome, info);
          return linha;
        }),
      );
    }
    mostrarMensagem('Leitura dos códigos concluída.');
  } catch (erro) {
    listaCodigos.replaceChildren();
    mostrarMensagem(erro.message);
    registar(`Erro: ${erro.message}`);
  } finally {
    botaoCodigos.disabled = false;
  }
}

// ---------------------------------------------------------------------
// BLOCO 9: Copiar o registo técnico
// Permite colar o registo numa mensagem depois do teste no carro.
// ---------------------------------------------------------------------
async function copiarRegisto() {
  try {
    await navigator.clipboard.writeText(registoTecnico.textContent);
    mostrarMensagem('Registo copiado.');
  } catch (erro) {
    mostrarMensagem(`Não foi possível copiar: ${erro.message}`);
  }
}

// ---------------------------------------------------------------------
// BLOCO 10: Arranque do ecrã
// Chamada uma vez pelo principal.js. Liga cada botão à sua função.
// ---------------------------------------------------------------------
export function iniciarEcraDiagnostico() {
  // Sem isto, o leitor_obd.js não teria onde escrever o registo.
  definirRegisto(registar);

  botaoProcurar.addEventListener('click', procurar);
  botaoDesligar.addEventListener('click', desligar);
  botaoCodigos.addEventListener('click', lerCodigos);
  botaoCopiar.addEventListener('click', copiarRegisto);

  botaoContinua.addEventListener('click', () => {
    if (leituraContinua) {
      pararLeituraContinua();
    } else {
      iniciarLeituraContinua();
    }
  });
}
