// =====================================================================
// leitor_obd.js
// Conversa com o leitor OBD-II. Usa o bluetooth.js para enviar e receber,
// e o interpretar_obd.js para perceber as respostas.
//
// COMO É A CONVERSA
// Estes leitores usam comandos de texto, chamados comandos ELM327.
// Enviamos um comando terminado em "Enter" (\r) e o leitor responde com
// texto, acabando sempre com o símbolo ">", que quer dizer "podes falar".
//   Comandos "AT": configuram o próprio leitor (ATZ reinicia-o).
//   Comandos em hexa: são perguntas ao carro (010C pede a rotação).
//
// SEGURANÇA: este ficheiro só tem comandos de leitura. O comando que apaga
// os códigos de avaria (04) não existe aqui de propósito.
// =====================================================================

import {
  comecarAReceber,
  desligarDispositivo,
  encontrarCanais,
  escreverTexto,
  ligarDispositivo,
  obterServicos,
  pararDeReceber,
} from './bluetooth.js';
import {
  interpretarCodigos,
  interpretarRpm,
  interpretarTemperatura,
} from '../utilitarios/interpretar_obd.js';

// ---------------------------------------------------------------------
// BLOCO 1: Estado da ligação
// Variáveis com "let" podem mudar de valor. Guardam o dispositivo e o
// canal em uso, o texto recebido até agora e o pedido à espera de resposta.
// ---------------------------------------------------------------------
let idLigado = null;
let canalAtivo = null;
let textoRecebido = '';
let pedidoPendente = null;

// Função que escreve no registo técnico do ecrã. Começa sem fazer nada.
let registar = () => {};

// O ecrã de diagnóstico diz-nos aqui como quer receber o registo.
export function definirRegisto(funcao) {
  registar = funcao;
}

// ---------------------------------------------------------------------
// BLOCO 2: Receber pedaços de resposta
// O Bluetooth entrega a resposta aos bocados. Vamos juntando o texto até
// aparecer o ">", e só então damos a resposta por completa.
// ---------------------------------------------------------------------
function aoReceberTexto(texto) {
  textoRecebido += texto;
  if (pedidoPendente && textoRecebido.includes('>')) {
    const pedido = pedidoPendente;
    pedidoPendente = null;
    // clearTimeout cancela o alarme de "sem resposta" (ver BLOCO 3).
    clearTimeout(pedido.alarme);
    pedido.concluir(textoRecebido);
  }
}

// ---------------------------------------------------------------------
// BLOCO 3: Enviar um comando e esperar pela resposta
// Uma Promise é uma "promessa de um resultado futuro". Guardamos a função
// resolve (cumprir) e a reject (falhar) para as chamar mais tarde:
//   a resposta chegou -> aoReceberTexto cumpre a promessa;
//   o tempo acabou    -> o alarme (setTimeout) faz a promessa falhar.
// ---------------------------------------------------------------------
function executarComando(comando, tempoMaximo) {
  return new Promise((resolve, reject) => {
    textoRecebido = '';
    const alarme = setTimeout(() => {
      pedidoPendente = null;
      reject(new Error(`O leitor não respondeu ao comando ${comando}.`));
    }, tempoMaximo);

    pedidoPendente = { concluir: resolve, alarme };

    escreverTexto(idLigado, canalAtivo, `${comando}\r`).catch((erro) => {
      clearTimeout(alarme);
      pedidoPendente = null;
      reject(erro);
    });
  });
}

// ---------------------------------------------------------------------
// BLOCO 4: Fila de comandos
// O leitor só atende um comando de cada vez. Se a leitura contínua e o
// botão dos códigos pedissem ao mesmo tempo, as respostas misturavam-se.
// A fila encadeia as promessas: cada comando espera que o anterior acabe.
// O catch final impede que um comando falhado bloqueie os seguintes.
// ---------------------------------------------------------------------
let fila = Promise.resolve();

function enviarComando(comando, tempoMaximo = 5000) {
  const resultado = fila.then(async () => {
    registar(`-> ${comando}`);
    const resposta = await executarComando(comando, tempoMaximo);
    registar(`<- ${resposta.replace(/[\r\n]+/g, ' ').trim()}`);
    return resposta;
  });
  fila = resultado.catch(() => {});
  return resultado;
}

// ---------------------------------------------------------------------
// BLOCO 5: Encontrar o canal certo
// Experimenta cada candidato: subscreve as notificações e envia ATZ, que
// reinicia o leitor. Se responder, encontrámos o canal. Como o primeiro
// comando às vezes se perde, cada canal tem direito a duas tentativas.
// Devolve a resposta ao ATZ, que costuma incluir a versão do leitor.
// ---------------------------------------------------------------------
async function procurarCanal(id, candidatos) {
  for (const candidato of candidatos) {
    registar(`Experimentar o serviço ${candidato.servico}`);
    canalAtivo = candidato;
    try {
      await comecarAReceber(id, candidato, aoReceberTexto);
    } catch (erro) {
      registar(`Não foi possível subscrever: ${erro.message}`);
      continue;
    }

    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        return await enviarComando('ATZ', 4000);
      } catch (erro) {
        registar(`Tentativa ${tentativa}: ${erro.message}`);
      }
    }
    await pararDeReceber(id, candidato).catch(() => {});
  }
  return null;
}

// ---------------------------------------------------------------------
// BLOCO 6: Ligar ao leitor
// Sequência completa: ligar por Bluetooth, ver os serviços, encontrar o
// canal e configurar o leitor. Se falhar, desliga e lança um erro com
// uma explicação, que aparece no ecrã.
// ---------------------------------------------------------------------
export async function ligarLeitor(id, aoDesligar) {
  registar(`A ligar a ${id}`);
  await ligarDispositivo(id, aoDesligar);
  idLigado = id;

  // A partir daqui já estamos ligados: se algo falhar, o catch desliga,
  // para o dispositivo não ficar preso a esta tentativa.
  try {
    const servicos = await obterServicos(id);
    // Fica no registo a lista de serviços: é uma informação útil para o teste.
    for (const servico of servicos) {
      const caracteristicas = servico.characteristics.map((c) => c.uuid.slice(4, 8)).join(', ');
      registar(`Serviço ${servico.uuid}: ${caracteristicas}`);
    }

    const candidatos = encontrarCanais(servicos);
    if (candidatos.length === 0) {
      throw new Error('Este dispositivo não tem um canal de comunicação compatível.');
    }

    const respostaAtz = await procurarCanal(id, candidatos);
    if (respostaAtz === null) {
      throw new Error('O dispositivo ligou, mas não respondeu como um leitor OBD-II.');
    }

    // Configuração: sem eco (ATE0), sem mudanças de linha extra (ATL0),
    // sem espaços (ATS0), sem cabeçalhos (ATH0) e protocolo automático (ATSP0).
    for (const comando of ['ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATSP0']) {
      await enviarComando(comando, 3000);
    }

    return respostaAtz.replace(/[\r\n>]+/g, ' ').trim();
  } catch (erro) {
    await desligarLeitor();
    throw erro;
  }
}

// ---------------------------------------------------------------------
// BLOCO 7: Desligar
// O "?." e o catch tornam isto seguro mesmo que a ligação já tenha caído.
// ---------------------------------------------------------------------
export async function desligarLeitor() {
  const id = idLigado;
  const canal = canalAtivo;
  esquecerLigacao();
  if (!id) {
    return;
  }
  if (canal) {
    await pararDeReceber(id, canal).catch(() => {});
  }
  await desligarDispositivo(id).catch(() => {});
}

// Limpa o estado, por exemplo quando a ligação cai sozinha.
export function esquecerLigacao() {
  idLigado = null;
  canalAtivo = null;
  textoRecebido = '';
  if (pedidoPendente) {
    clearTimeout(pedidoPendente.alarme);
    pedidoPendente = null;
  }
}

// ---------------------------------------------------------------------
// BLOCO 8: Perguntas ao carro
// A primeira pergunta pode demorar, porque o leitor ainda está a descobrir
// o protocolo do carro (aparece "SEARCHING..."). Por isso, 15 segundos.
// ---------------------------------------------------------------------
export async function lerRpm() {
  return interpretarRpm(await enviarComando('010C', 15000));
}

export async function lerTemperatura() {
  return interpretarTemperatura(await enviarComando('0105', 15000));
}

export async function lerCodigosAvaria() {
  return interpretarCodigos(await enviarComando('03', 15000));
}
