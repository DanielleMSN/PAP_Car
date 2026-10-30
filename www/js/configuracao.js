// =====================================================================
// configuracao.js
// Guarda valores fixos da app num único sítio.
//
// Porquê um ficheiro só para isto? Se um valor aparece em vários
// ficheiros e um dia precisares de o mudar, tens de o procurar em todo o
// lado. Aqui mudas uma vez e a app inteira fica atualizada.
// =====================================================================

// ---------------------------------------------------------------------
// BLOCO 1: O que é "export"?
// Por defeito, o que escreves num ficheiro JavaScript só existe nesse
// ficheiro. A palavra "export" põe o valor à disposição de outros
// ficheiros, que o vão buscar com "import" (ver navegacao.js).
// ---------------------------------------------------------------------

// Nome da app, para usar em títulos e mensagens.
export const NOME_APP = 'HelpMyCar';

// ---------------------------------------------------------------------
// BLOCO 2: Ecrã inicial
// É o nome do ecrã que aparece quando a app abre. Tem de ser igual à
// parte final do id da <section> no index.html:
//   id="ecra-inicio"  ->  nome 'inicio'
// "const" significa que o valor não pode ser alterado depois de definido.
// ---------------------------------------------------------------------
export const ECRA_INICIAL = 'inicio';

// ---------------------------------------------------------------------
// BLOCO 3: Ecrãs da barra de baixo
// Uma lista (array) com os nomes dos ecrãs que têm botão na barra de
// navegação. Estes ecrãs são os "principais" da app: neles não faz
// sentido mostrar o botão de voltar. Os restantes (Despesas, Dúvidas,
// Definições) abrem por cima e precisam do botão de voltar.
// A ordem não importa; só interessa saber se um nome está na lista.
// ---------------------------------------------------------------------
export const ECRAS_DA_BARRA = ['inicio', 'veiculos', 'diagnostico', 'manutencao', 'mais'];
