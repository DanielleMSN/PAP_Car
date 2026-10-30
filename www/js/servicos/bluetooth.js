// =====================================================================
// bluetooth.js
// Fala com o Bluetooth do telemóvel, através do plugin BluetoothLe do
// Capacitor. O JavaScript não consegue chegar ao Bluetooth sozinho: o
// plugin é a ponte entre o nosso código e o Android.
//
// Este ficheiro não sabe nada sobre carros. Só sabe procurar dispositivos,
// ligar, escrever e receber. Quem conhece os carros é o leitor_obd.js.
//
// PALAVRAS QUE VAIS VER (Bluetooth de baixo consumo, BLE):
//   Serviço:         um conjunto de funções de um dispositivo.
//   Característica:  um "canal" dentro de um serviço, por onde passam dados.
//   Notificação:     o dispositivo avisa-nos quando tem dados novos.
// =====================================================================

// ---------------------------------------------------------------------
// BLOCO 1: Aceder ao plugin
// O Capacitor coloca os plugins em window.Capacitor.Plugins. No navegador
// do computador isso não existe, por isso o "?." evita um erro e devolve
// undefined, e assim conseguimos avisar em vez de a app rebentar.
// ---------------------------------------------------------------------
function plugin() {
  return window.Capacitor?.Plugins?.BluetoothLe;
}

export function bluetoothDisponivel() {
  return Boolean(plugin());
}

// ---------------------------------------------------------------------
// BLOCO 2: Preparar o Bluetooth
// initialize pede as permissões ao utilizador (aparecem as janelas do
// Android). "async" marca uma função que espera por coisas demoradas, e
// "await" é o ponto onde ela espera. Se o utilizador recusar, é lançado
// um erro, que o ecrã de diagnóstico apanha e mostra.
// Devolve se a Localização está ligada, porque o Android pode não mostrar
// dispositivos com a Localização desligada.
// ---------------------------------------------------------------------
export async function prepararBluetooth() {
  await plugin().initialize();

  const ligado = await plugin().isEnabled();
  if (!ligado.value) {
    await plugin().requestEnable();
  }

  const localizacao = await plugin().isLocationEnabled();
  return { localizacaoLigada: localizacao.value };
}

// ---------------------------------------------------------------------
// BLOCO 3: Procurar dispositivos
// A pesquisa não devolve uma lista de uma vez: cada dispositivo chega
// quando é encontrado. Por isso recebemos uma função (aoEncontrar), que é
// chamada uma vez por dispositivo. Chama-se a isto um "callback".
// ---------------------------------------------------------------------
let ouvintePesquisa = null;

export async function iniciarPesquisa(aoEncontrar) {
  await pararPesquisa();
  ouvintePesquisa = await plugin().addListener('onScanResult', aoEncontrar);
  await plugin().requestLEScan({});
}

export async function pararPesquisa() {
  if (ouvintePesquisa) {
    await ouvintePesquisa.remove();
    ouvintePesquisa = null;
    await plugin().stopLEScan();
  }
}

// ---------------------------------------------------------------------
// BLOCO 4: Dispositivos já emparelhados no telemóvel
// Serve de pista: um leitor de Bluetooth clássico pode aparecer aqui, mesmo
// que nunca apareça na pesquisa de baixo consumo.
// ---------------------------------------------------------------------
export async function dispositivosEmparelhados() {
  const resultado = await plugin().getBondedDevices();
  return resultado.devices;
}

// ---------------------------------------------------------------------
// BLOCO 5: Ligar e desligar
// O id do dispositivo é o seu endereço (por exemplo "AA:BB:CC:DD:EE:FF").
// aoDesligar é chamada se a ligação cair, por exemplo ao tirar o leitor.
// ---------------------------------------------------------------------
let ouvinteDesligar = null;

export async function ligarDispositivo(id, aoDesligar) {
  await removerOuvinteDesligar();
  ouvinteDesligar = await plugin().addListener(`disconnected|${id}`, aoDesligar);
  try {
    await plugin().connect({ deviceId: id, timeout: 15000 });
  } catch (erro) {
    // Se não ligou, o ouvinte já não faz falta. "throw" passa o erro a
    // quem chamou esta função, para ser mostrado no ecrã.
    await removerOuvinteDesligar();
    throw erro;
  }
}

export async function desligarDispositivo(id) {
  await removerOuvinteDesligar();
  await plugin().disconnect({ deviceId: id });
}

async function removerOuvinteDesligar() {
  if (ouvinteDesligar) {
    await ouvinteDesligar.remove();
    ouvinteDesligar = null;
  }
}

export async function obterServicos(id) {
  const resultado = await plugin().getServices({ deviceId: id });
  return resultado.services;
}

// ---------------------------------------------------------------------
// BLOCO 6: Escolher os canais de comunicação
// Para conversar com o leitor precisamos de uma característica para
// escrever e de outra para receber. Cada fabricante usa identificadores
// diferentes, por isso devolvemos uma lista de candidatos, por ordem de
// probabilidade. O leitor_obd.js experimenta um a um.
// ---------------------------------------------------------------------
const SERVICOS_CONHECIDOS = ['fff0', 'ffe0', '18f0', '6e400001'];

// Serviços padrão do Bluetooth (nome, bateria, etc.), que nunca são o canal.
const SERVICOS_A_IGNORAR = ['1800', '1801', '180a', '180f'];

// Os identificadores curtos aparecem assim: 0000fff0-0000-1000-...
function idCurto(uuid) {
  return uuid.startsWith('0000') ? uuid.slice(4, 8) : uuid.slice(0, 8);
}

export function encontrarCanais(servicos) {
  const candidatos = [];

  for (const servico of servicos) {
    const curto = idCurto(servico.uuid);
    if (SERVICOS_A_IGNORAR.includes(curto)) {
      continue;
    }

    // "find" devolve o primeiro elemento que cumpre a condição.
    const paraReceber = servico.characteristics.find(
      (c) => c.properties.notify || c.properties.indicate,
    );
    const paraEscrever = servico.characteristics.find(
      (c) => c.properties.write || c.properties.writeWithoutResponse,
    );

    if (paraReceber && paraEscrever) {
      candidatos.push({
        servico: servico.uuid,
        receber: paraReceber.uuid,
        escrever: paraEscrever.uuid,
        // Se não existir "write", temos de escrever sem confirmação.
        semConfirmacao: !paraEscrever.properties.write,
        // Posição na lista de conhecidos, ou 99 se for desconhecido.
        prioridade: SERVICOS_CONHECIDOS.includes(curto) ? SERVICOS_CONHECIDOS.indexOf(curto) : 99,
      });
    }
  }

  // sort ordena: quanto menor a prioridade, mais à frente fica.
  return candidatos.sort((a, b) => a.prioridade - b.prioridade);
}

// ---------------------------------------------------------------------
// BLOCO 7: Converter entre texto e hexadecimal
// O plugin só aceita e devolve dados em hexadecimal, e o leitor fala em
// texto. charCodeAt dá o número de cada letra ("A" é 65, ou 41 em hexa).
// padStart garante 2 símbolos: 13 em hexa é "d", que tem de ser "0d".
// ---------------------------------------------------------------------
export function textoParaHex(texto) {
  let hex = '';
  for (let i = 0; i < texto.length; i++) {
    hex += texto.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

export function hexParaTexto(hex) {
  let texto = '';
  for (let i = 0; i + 2 <= hex.length; i += 2) {
    texto += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return texto;
}

// ---------------------------------------------------------------------
// BLOCO 8: Receber dados
// Pedimos ao dispositivo que nos notifique. O plugin avisa-nos com um
// evento cujo nome junta o dispositivo, o serviço e a característica.
// ---------------------------------------------------------------------
let ouvinteDados = null;

export async function comecarAReceber(id, canal, aoReceber) {
  await pararDeReceber(id, canal);
  const nomeEvento = `notification|${id}|${canal.servico}|${canal.receber}`;
  ouvinteDados = await plugin().addListener(nomeEvento, (evento) => {
    aoReceber(hexParaTexto(evento.value ?? ''));
  });
  await plugin().startNotifications({
    deviceId: id,
    service: canal.servico,
    characteristic: canal.receber,
  });
}

export async function pararDeReceber(id, canal) {
  if (ouvinteDados) {
    await ouvinteDados.remove();
    ouvinteDados = null;
    await plugin().stopNotifications({
      deviceId: id,
      service: canal.servico,
      characteristic: canal.receber,
    });
  }
}

// ---------------------------------------------------------------------
// BLOCO 9: Escrever dados
// Escolhe o método do plugin conforme o que o canal permite.
// ---------------------------------------------------------------------
export async function escreverTexto(id, canal, texto) {
  const opcoes = {
    deviceId: id,
    service: canal.servico,
    characteristic: canal.escrever,
    value: textoParaHex(texto),
  };
  if (canal.semConfirmacao) {
    await plugin().writeWithoutResponse(opcoes);
  } else {
    await plugin().write(opcoes);
  }
}
