// =====================================================================
// principal.js
// Ponto de entrada do JavaScript: é o primeiro ficheiro a correr quando
// a app abre (o index.html carrega-o com <script type="module">).
//
// A regra deste ficheiro é ser curto. Não tem lógica própria: só chama
// os outros ficheiros pela ordem certa. À medida que a app crescer,
// é aqui que se vão acrescentando os arranques de cada parte.
// =====================================================================

// ---------------------------------------------------------------------
// BLOCO 1: Importações
// Vamos buscar a função que arranca a navegação entre ecrãs.
// ---------------------------------------------------------------------
import { iniciarNavegacao } from './navegacao.js';
import { iniciarEcraDiagnostico } from './ecras/diagnostico.js';

// ---------------------------------------------------------------------
// BLOCO 2: Arranque
// Scripts com type="module" só correm depois de o HTML estar todo
// carregado, por isso já podemos procurar elementos da página sem
// esperar por nenhum evento.
// ---------------------------------------------------------------------
iniciarNavegacao();
iniciarEcraDiagnostico();
