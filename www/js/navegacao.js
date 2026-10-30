// =====================================================================
// navegacao.js
// Trata de mudar de ecrã quando o utilizador toca num cartão ou no
// botão de voltar.
//
// COMO FUNCIONA (a ideia geral)
// A app tem uma única página (index.html). Cada "ecrã" é uma <section>
// dentro dela, e só uma está visível de cada vez. Mudar de ecrã é
// esconder a atual e mostrar outra, sem recarregar a página.
// =====================================================================

// ---------------------------------------------------------------------
// BLOCO 1: Importar o que vem de outros ficheiros
// "import { X } from '...'" vai buscar o valor X que o outro ficheiro
// pôs à disposição com "export". O './' quer dizer "na mesma pasta".
// ---------------------------------------------------------------------
import { ECRA_INICIAL, ECRAS_DA_BARRA } from './configuracao.js';

// ---------------------------------------------------------------------
// BLOCO 2: Guardar referências aos elementos da página
// document.getElementById('x') procura no HTML o elemento com id="x".
// Fazemos isto uma só vez, aqui em cima, e guardamos o resultado em
// variáveis, em vez de procurar de cada vez que mudamos de ecrã.
// ---------------------------------------------------------------------
const cabecalho = document.getElementById('cabecalho');
const botaoVoltar = document.getElementById('botao-voltar');
const tituloEcra = document.getElementById('titulo-ecra');

// ---------------------------------------------------------------------
// BLOCO 2b: Realçar o botão certo da barra de baixo
// A barra tem um botão por ecrã principal. Esta função marca como
// "atual" o botão do ecrã que está a ser mostrado, e desmarca os outros.
// O atributo aria-current="page" é a forma padrão de dizer, também aos
// leitores de ecrã, "este é o item onde estás". O CSS usa-o para pintar
// o botão de amarelo.
// ---------------------------------------------------------------------
function atualizarBarra(nome) {
  document.querySelectorAll('.barra__item').forEach((botao) => {
    if (botao.dataset.ecra === nome) {
      // setAttribute(nome, valor) cria ou muda um atributo do HTML.
      botao.setAttribute('aria-current', 'page');
    } else {
      botao.removeAttribute('aria-current');
    }
  });
}

// ---------------------------------------------------------------------
// BLOCO 3: Mostrar um ecrã
// Recebe o nome do ecrã (por exemplo 'veiculos') e faz a troca visual.
// Devolve true se correu bem e false se o ecrã não existir.
// Esta função só mexe no que se vê; quem trata do histórico é irParaEcra.
// ---------------------------------------------------------------------
function mostrarEcra(nome) {
  // Cada <section> tem um id no formato "ecra-<nome>". Construímos esse
  // id com um "template literal": o texto entre ` ` onde ${...} é
  // substituído pelo valor da variável.
  const ecraNovo = document.getElementById(`ecra-${nome}`);

  // Se o nome estiver errado, getElementById devolve null. Avisamos na
  // consola (visível nas ferramentas de programador) e paramos aqui.
  if (!ecraNovo) {
    console.error(`Ecrã "${nome}" não existe no index.html.`);
    return false;
  }

  // querySelectorAll('.ecra') devolve todos os elementos com a classe
  // "ecra". O forEach percorre-os um a um e tira a classe "ecra--ativo"
  // a todos. No CSS, só quem tem essa classe é que fica visível.
  document.querySelectorAll('.ecra').forEach((ecra) => {
    ecra.classList.remove('ecra--ativo');
  });

  // Agora damos a classe "ecra--ativo" só ao ecrã que queremos mostrar.
  ecraNovo.classList.add('ecra--ativo');

  // O título do cabeçalho vem do atributo data-titulo do HTML.
  // "dataset.titulo" lê o atributo data-titulo="..." do elemento.
  tituloEcra.textContent = ecraNovo.dataset.titulo;

  // O atributo HTML "hidden" esconde o elemento; aqui ligamo-lo ou
  // desligamo-lo com uma condição (=== quer dizer "é exatamente igual a").
  // No ecrã inicial o cabeçalho não aparece, porque lá o topo é a marca
  // grande da HelpMyCar.
  cabecalho.hidden = nome === ECRA_INICIAL;

  // O botão de voltar só aparece nos ecrãs que NÃO estão na barra de
  // baixo. "includes" responde true se o nome estiver na lista, e
  // nesse caso o botão fica escondido (hidden = true).
  botaoVoltar.hidden = ECRAS_DA_BARRA.includes(nome);

  // Realça o botão correspondente na barra de baixo.
  atualizarBarra(nome);

  // Volta ao topo, para o ecrã novo não aparecer a meio da página.
  window.scrollTo(0, 0);

  return true;
}

// ---------------------------------------------------------------------
// BLOCO 4: Ir para um ecrã (e lembrar o caminho)
// Mostra o ecrã e regista a navegação no histórico do navegador.
// É esse histórico que faz o botão "Voltar" do Android funcionar: cada
// ecrã novo é uma "entrada" no histórico, e voltar retira a última.
// "export" torna a função utilizável noutros ficheiros no futuro.
// ---------------------------------------------------------------------
export function irParaEcra(nome) {
  const correu = mostrarEcra(nome);
  if (correu) {
    // pushState(estado, titulo): acrescenta uma entrada ao histórico e
    // guarda lá o nome do ecrã. O segundo valor (título) é ignorado
    // pelos navegadores, por isso passamos uma string vazia.
    history.pushState({ ecra: nome }, '');
  }
}

// ---------------------------------------------------------------------
// BLOCO 5: Arrancar a navegação
// Chamada uma vez quando a app abre (ver principal.js). Liga os toques
// do utilizador às funções acima.
// ---------------------------------------------------------------------
export function iniciarNavegacao() {
  // O ecrã inicial também precisa de uma entrada no histórico, senão o
  // "Voltar" não saberia que ecrã mostrar ao regressar a ele.
  // replaceState substitui a entrada atual em vez de acrescentar outra.
  history.replaceState({ ecra: ECRA_INICIAL }, '');
  mostrarEcra(ECRA_INICIAL);

  // Todos os cartões do HTML têm o atributo data-ecra="<nome>".
  // O seletor [data-ecra] encontra todos os elementos que o tenham.
  document.querySelectorAll('[data-ecra]').forEach((cartao) => {
    // addEventListener('click', função): "quando houver um toque neste
    // elemento, corre esta função". A seta () => {...} é uma função
    // curta, sem nome, escrita no próprio sítio.
    cartao.addEventListener('click', () => {
      irParaEcra(cartao.dataset.ecra);
    });
  });

  // O botão do cabeçalho volta um passo atrás no histórico. Isto é
  // exatamente o mesmo que carregar no botão "Voltar" do telemóvel.
  botaoVoltar.addEventListener('click', () => {
    history.back();
  });

  // O evento "popstate" dispara sempre que o histórico anda para trás
  // ou para a frente (botão do cabeçalho ou botão do Android).
  // "evento.state" é o objeto que guardámos com pushState/replaceState.
  // O "?." devolve undefined em vez de dar erro se "state" não existir,
  // e o "??" escolhe o ecrã inicial nesse caso.
  window.addEventListener('popstate', (evento) => {
    const nome = evento.state?.ecra ?? ECRA_INICIAL;
    mostrarEcra(nome);
  });
}
