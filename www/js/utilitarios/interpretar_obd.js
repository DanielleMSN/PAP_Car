// =====================================================================
// interpretar_obd.js
// Transforma as respostas de texto do leitor OBD-II em valores úteis.
//
// O leitor responde com texto em hexadecimal. Por exemplo, ao pedido de
// rotação (010C) pode responder "410C1AF8". Este ficheiro sabe ler isso.
// Aqui não há Bluetooth nem ecrãs: só funções que recebem texto e devolvem
// resultados. Por isso podem ser testadas no computador, sem carro.
//
// NOTA SOBRE HEXADECIMAL: é uma forma de escrever números com 16 símbolos
// (0-9 e A-F). Dois símbolos formam um byte. "1A" vale 26 e "F8" vale 248.
// =====================================================================

// ---------------------------------------------------------------------
// BLOCO 1: Mensagens de erro do leitor
// Quando algo corre mal, o leitor responde com uma frase em vez de dados.
// Esta lista traduz cada frase para uma explicação em português.
// As frases estão sem espaços porque limpamos os espaços antes de comparar
// (ver BLOCO 2). Cada elemento é um par: [frase do leitor, explicação].
// ---------------------------------------------------------------------
const ERROS_DO_LEITOR = [
  ['NODATA', 'O carro não respondeu a este pedido. Com o motor desligado, alguns dados não estão disponíveis.'],
  ['UNABLETOCONNECT', 'O leitor não conseguiu falar com o carro. Confirma que a ignição está ligada.'],
  ['CANERROR', 'Erro na comunicação com o carro. Confirma que o leitor está bem encaixado.'],
  ['BUSINIT', 'Não foi possível iniciar a comunicação com o carro. Confirma que a ignição está ligada.'],
  ['BUSERROR', 'Erro na comunicação com o carro.'],
  ['BUFFERFULL', 'O leitor recebeu demasiados dados de uma vez. Tenta outra vez.'],
  ['STOPPED', 'O pedido foi interrompido. Tenta outra vez.'],
  ['LVRESET', 'O leitor reiniciou por falta de tensão. Confirma a ligação à porta do carro.'],
  ['ACTALERT', 'O leitor entrou em espera. Desliga e volta a ligar.'],
];

// ---------------------------------------------------------------------
// BLOCO 2: Limpar a resposta
// A resposta chega partida em linhas e com "lixo": o símbolo ">" que o
// leitor usa para dizer "acabei", espaços e a palavra "SEARCHING...".
// Esta função devolve um array só com as linhas úteis, em maiúsculas.
// ---------------------------------------------------------------------
export function linhasDaResposta(resposta) {
  return resposta
    // split parte o texto sempre que encontra \r, \n ou >. O texto entre
    // as barras é uma "expressão regular", uma forma de descrever padrões.
    .split(/[\r\n>]+/)
    // map transforma cada linha: tira os espaços e passa a maiúsculas.
    .map((linha) => linha.replace(/\s+/g, '').toUpperCase())
    // Tira a palavra SEARCHING e os pontos que a seguem.
    .map((linha) => linha.replace(/SEARCHING\.*/, ''))
    // filter fica só com as linhas que não ficaram vazias.
    .filter((linha) => linha.length > 0);
}

// ---------------------------------------------------------------------
// BLOCO 3: Procurar erros na resposta
// Devolve a explicação do erro, ou null se a resposta parecer boa.
// ---------------------------------------------------------------------
export function erroDaResposta(resposta) {
  const linhas = linhasDaResposta(resposta);

  // O "?" sozinho significa que o leitor não percebeu o comando.
  if (linhas.includes('?')) {
    return 'O leitor não reconheceu este comando.';
  }

  // Percorre a lista de erros e vê se alguma linha contém aquela frase.
  for (const [frase, explicacao] of ERROS_DO_LEITOR) {
    if (linhas.some((linha) => linha.includes(frase))) {
      return explicacao;
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// BLOCO 4: Ler a rotação do motor (pedido 010C)
// Uma resposta boa começa por 41 (resposta ao modo 01) e 0C (a rotação),
// seguidos de dois bytes, A e B. A norma diz: RPM = (A x 256 + B) / 4.
// Exemplo: 410C1AF8 -> A=26, B=248 -> (26 x 256 + 248) / 4 = 1726 rpm.
// ---------------------------------------------------------------------
export function interpretarRpm(resposta) {
  const [a, b] = bytesDoPedido(resposta, '410C', 2);
  return (a * 256 + b) / 4;
}

// ---------------------------------------------------------------------
// BLOCO 5: Ler a temperatura do líquido de refrigeração (pedido 0105)
// Resposta: 41 05 e um byte A. A norma diz: temperatura = A - 40 (em °C).
// Exemplo: 41057B -> A=123 -> 83 °C.
// ---------------------------------------------------------------------
export function interpretarTemperatura(resposta) {
  const [a] = bytesDoPedido(resposta, '4105', 1);
  return a - 40;
}

// ---------------------------------------------------------------------
// BLOCO 6: Função auxiliar dos blocos 4 e 5
// Procura a linha que começa pelo prefixo pedido e devolve os bytes que
// vêm a seguir, já como números. Se não der, lança um erro ("throw"), que
// quem chamou esta função apanha e mostra no ecrã.
// Não tem "export" porque só é usada dentro deste ficheiro.
// ---------------------------------------------------------------------
function bytesDoPedido(resposta, prefixo, quantidade) {
  const erro = erroDaResposta(resposta);
  if (erro) {
    throw new Error(erro);
  }

  const linha = linhasDaResposta(resposta).find((l) => l.startsWith(prefixo));
  const dados = linha ? linha.slice(prefixo.length) : '';

  // Cada byte são 2 símbolos, por isso precisamos de quantidade x 2.
  if (dados.length < quantidade * 2) {
    throw new Error(`Resposta inesperada do leitor: ${resposta.trim()}`);
  }

  const bytes = [];
  for (let i = 0; i < quantidade; i++) {
    // parseInt(texto, 16) converte um texto em hexadecimal para número.
    bytes.push(parseInt(dados.slice(i * 2, i * 2 + 2), 16));
  }
  return bytes;
}

// ---------------------------------------------------------------------
// BLOCO 7: Transformar dois bytes num código de avaria
// Um código como P0420 viaja como "0420". O primeiro símbolo guarda duas
// informações em bits: a letra (2 bits) e o primeiro algarismo (2 bits).
//   ">> 2" fica com os 2 bits da esquerda (a letra).
//   "& 3"  fica com os 2 bits da direita (o algarismo).
// ---------------------------------------------------------------------
export function descodificarCodigo(quatroSimbolos) {
  const primeiro = parseInt(quatroSimbolos[0], 16);
  const letra = ['P', 'C', 'B', 'U'][primeiro >> 2];
  const algarismo = primeiro & 3;
  return `${letra}${algarismo}${quatroSimbolos.slice(1)}`;
}

// ---------------------------------------------------------------------
// BLOCO 8: Ler os códigos de avaria (pedido 03)
// É a resposta mais difícil, porque tem vários formatos:
//   Sem códigos:        "4300"
//   Um código:          "43010420"          43, quantidade, código
//   Carros mais antigos:"430420000000"      43, códigos, sem quantidade
//   Muitos códigos:     "00A" / "0:43..." / "1:..."  mensagem em partes
// Devolve um array de códigos, por exemplo ['P0420'], ou [] se não houver.
// ---------------------------------------------------------------------
export function interpretarCodigos(resposta) {
  const erro = erroDaResposta(resposta);
  if (erro) {
    // Em alguns carros, "sem dados" é a resposta quando não há avarias.
    if (linhasDaResposta(resposta).some((l) => l.includes('NODATA'))) {
      return [];
    }
    throw new Error(erro);
  }

  // Passo 1: juntar as partes de cada mensagem.
  const mensagens = [];
  for (const linha of linhasDaResposta(resposta)) {
    // Uma linha com 3 símbolos (como "00A") só indica o tamanho: ignora-se.
    if (/^[0-9A-F]{3}$/.test(linha)) {
      continue;
    }
    // Uma linha como "1:0135" é a parte 1 de uma mensagem em partes.
    const parte = linha.match(/^([0-9A-F]):(.*)$/);
    if (parte) {
      if (parte[1] === '0') {
        mensagens.push(parte[2]);
      } else if (mensagens.length > 0) {
        mensagens[mensagens.length - 1] += parte[2];
      }
    } else {
      mensagens.push(linha);
    }
  }

  // Passo 2: tirar os códigos de cada mensagem. Um Set é uma coleção que
  // não aceita repetidos, útil se duas unidades do carro derem o mesmo código.
  const codigos = new Set();
  for (const mensagem of mensagens) {
    if (!mensagem.startsWith('43') || /[^0-9A-F]/.test(mensagem)) {
      continue;
    }
    let dados = mensagem.slice(2);
    let limite = Infinity;

    // Os códigos ocupam 2 bytes cada, logo um número par de bytes. Se o
    // número for ímpar, o primeiro byte é a quantidade de códigos.
    if (Math.floor(dados.length / 2) % 2 === 1) {
      limite = parseInt(dados.slice(0, 2), 16);
      dados = dados.slice(2);
    }

    // Lê de 4 em 4 símbolos. "0000" é enchimento e não é um código.
    let lidos = 0;
    for (let i = 0; i + 4 <= dados.length && lidos < limite; i += 4) {
      const grupo = dados.slice(i, i + 4);
      if (grupo !== '0000') {
        codigos.add(descodificarCodigo(grupo));
        lidos++;
      }
    }
  }

  // Array.from transforma o Set num array normal.
  return Array.from(codigos);
}

// ---------------------------------------------------------------------
// BLOCO 9: Dizer a que sistema pertence um código
// A primeira letra é definida pela norma. A explicação de cada código
// virá mais tarde de uma tabela própria: aqui não se inventa nenhuma.
// ---------------------------------------------------------------------
export function sistemaDoCodigo(codigo) {
  const sistemas = {
    P: 'Motor e transmissão',
    C: 'Chassi',
    B: 'Carroçaria',
    U: 'Comunicação entre unidades',
  };
  return sistemas[codigo[0]] ?? 'Sistema desconhecido';
}
