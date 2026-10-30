# HelpMyCar: organização e funcionamento

> **Projeto oficial da PAP 2026/2027.**
> Aluna: Danielle Nascimento, 12º GPSI, Escola Secundária de Palmela.

Este documento explica como o projeto está organizado, como a app funciona por
dentro e como se corre. Vai sendo atualizado à medida que o projeto cresce.

---

## 1. O que é a HelpMyCar

Uma app Android que ajuda a compreender, organizar e acompanhar a informação
sobre os veículos. A funcionalidade principal é a ligação a um leitor OBD-II
por Bluetooth, para ler dados e códigos de avaria e explicá-los em linguagem
simples.

Regra do projeto: **nunca se mostram dados inventados como se fossem dados
reais do veículo.** Enquanto uma funcionalidade não existe, o ecrã diz
"Ainda em construção".

---

## 2. Tecnologias e o papel de cada uma

| Tecnologia | Papel |
|---|---|
| **HTML** | Estrutura das páginas: o que existe em cada ecrã (títulos, botões, cartões). |
| **CSS** | Aspeto: cores, espaçamentos, cantos arredondados, animações. |
| **JavaScript** | Comportamento: reagir aos toques, trocar de ecrã, guardar dados, falar com o Bluetooth. |
| **Capacitor** | Pega no HTML, CSS e JavaScript e coloca-os dentro de uma app Android instalável (APK). |
| **Android (pasta `android/`)** | Projeto Android gerado pelo Capacitor. É ele que cria o APK. |
| **PHP + MySQL** | *Fase posterior.* Servidor com contas, login e dados online. |

### Como tudo se liga

```
 Toque do utilizador
        │
        ▼
  Janela da app Android  (WebView, gerida pelo Capacitor)
        │ mostra
        ▼
  www/index.html ──► css/*.css   (aspeto)
        │
        └──────────► js/principal.js ──► js/navegacao.js ...  (comportamento)
```

A app Android é, no fundo, uma janela (WebView) que mostra o `www/index.html`.
O Capacitor trata de a embrulhar numa app e, mais tarde, de dar ao JavaScript
acesso a funções do telemóvel, como o Bluetooth, através de plugins.

---

## 3. Organização das pastas

```
HelpMyCar/
├── www/                      ← A APP: tudo o que escreves está aqui
│   ├── index.html            Estrutura de todos os ecrãs
│   ├── css/
│   │   ├── tema.css          Cores, tamanhos e fonte (variáveis)
│   │   ├── base.css          Regras gerais e cabeçalho
│   │   ├── componentes.css   Peças reutilizáveis (cartões, estado vazio)
│   │   └── ecras.css         Regras de cada ecrã e grelha
│   ├── js/
│   │   ├── principal.js      Ponto de entrada: arranca a app
│   │   ├── configuracao.js   Valores fixos (nome da app, ecrã inicial)
│   │   ├── navegacao.js      Troca de ecrã e botão de voltar
│   │   ├── ecras/
│   │   │   └── diagnostico.js    Ecrã Diagnóstico (botões, listas, valores)
│   │   ├── servicos/
│   │   │   ├── bluetooth.js      Ponte para o plugin de Bluetooth
│   │   │   └── leitor_obd.js     Comandos enviados ao leitor (só leitura)
│   │   └── utilitarios/
│   │       └── interpretar_obd.js  Transforma respostas em RPM, °C e códigos
│   └── imagens/              (para o futuro)
├── android/                  Projeto Android gerado pelo Capacitor
├── base_dados/
│   └── criar_base_dados.sql  Script MySQL (usado na fase do servidor)
├── capacitor.config.json     Configuração do Capacitor (id e nome da app)
├── package.json              Dependências e atalhos de comandos
├── node_modules/             Pacotes instalados (gerada automaticamente)
└── DOCUMENTACAO.md           Este documento
```

**Regra de ouro:** só escreves código dentro de `www/`. As pastas `android/` e
`node_modules/` são geradas por ferramentas e não se editam à mão.

---

## 4. Como cada ficheiro funciona

### 4.1 `index.html`: a estrutura
Contém, numa só página, o **cabeçalho** (botão de voltar e título), todos os
**ecrãs** e a **barra de navegação** de baixo. Cada ecrã é uma
`<section class="ecra" id="ecra-<nome>">`. Só uma tem a classe `ecra--ativo`
e fica visível.

Ecrãs existentes: `inicio`, `veiculos`, `diagnostico`, `manutencao`, `mais`,
`despesas`, `duvidas` e `definicoes`. Só o `inicio` e o `mais` têm conteúdo;
os outros dizem "Ainda em construção".

O **ecrã inicial** tem: a marca grande (hero), o cartão "O teu veículo"
(mostra "Ainda não adicionaste um veículo" até haver veículos reais), quatro
atalhos, a faixa "Dúvidas e vídeos" e a etiqueta "Não ligado" do OBD-II
(cinzenta enquanto não houver ligação real).

A **barra de baixo** tem 5 botões: Início, Veículos, Diagnóstico, Manutenção e
Mais. O separador "Mais" abre uma lista com Despesas, Dúvidas e vídeos e
Definições.

Dois atributos especiais ligam o HTML ao JavaScript:
- `data-ecra="veiculos"` num cartão ou botão: diz para que ecrã o toque deve levar.
- `data-titulo="Veículos"` numa secção: o título a mostrar no cabeçalho.

No fim carrega `js/principal.js` com `<script type="module">`.

### 4.2 Os CSS
Estão separados por responsabilidade, e a ordem de carregamento importa:

1. `tema.css`: define **variáveis** como `--cor-fundo` e `--raio-cartao`.
   Para mudar a identidade visual da app, mudas só este ficheiro.
2. `base.css`: regras gerais (fonte, fundo, botões) e o cabeçalho.
3. `componentes.css`: peças que se repetem em vários ecrãs, como o `.cartao`.
4. `ecras.css`: o que é específico de cada ecrã e a lógica de mostrar/esconder.

Identidade visual: fundo marfim, cartões brancos com cantos arredondados,
amarelo para os destaques (a palavra "Car", os ícones, o separador ativo),
texto azul-escuro. O desenho de referência é o ecrã inicial que a aluna criou.

**Foto do carro:** está em `www/imagens/carro.png` e aparece no canto superior
direito do ecrã inicial (classe `.hero__carro` em `css/ecras.css`). É um PNG
com fundo transparente, mas é provisório: tem só 191×286 px, o carro está
cortado à direita e não é o Peugeot 208 do desenho. Para a trocar, basta
substituir o ficheiro `carro.png` por um PNG transparente com pelo menos
600 px de largura e voltar a compilar.

**Ícone e ecrã de arranque:** continuam a ser os do Capacitor (por defeito).
Substituem-se mais tarde pelos da HelpMyCar.

### 4.3 `js/principal.js`: o arranque
É o primeiro JavaScript a correr. Fica propositadamente curto: só chama
`iniciarNavegacao()`. Quando houver mais partes (Bluetooth, armazenamento), os
arranques são acrescentados aqui.

### 4.4 `js/configuracao.js`: valores fixos
Guarda o que é fixo e usado em vários sítios: `NOME_APP`, `ECRA_INICIAL` e
`ECRAS_DA_BARRA` (a lista dos ecrãs que têm botão na barra de baixo).
Se um valor mudar, muda-se aqui uma vez.

### 4.5 `js/navegacao.js`: a navegação
- `mostrarEcra(nome)`: tira a classe `ecra--ativo` a todos os ecrãs, dá-a ao
  pedido, atualiza o título, esconde o cabeçalho no ecrã inicial, mostra o
  botão de voltar só nos ecrãs que não estão na barra e chama `atualizarBarra`.
- `atualizarBarra(nome)`: marca o botão do ecrã atual com `aria-current="page"`
  (o CSS pinta-o de amarelo).
- `irParaEcra(nome)`: chama `mostrarEcra` e regista a mudança no **histórico**
  do navegador (`history.pushState`).
- `iniciarNavegacao()`: liga os toques nos cartões (`data-ecra`) ao
  `irParaEcra`, liga o botão de voltar a `history.back()` e escuta o evento
  `popstate`, que dispara quando se volta atrás.

**Porquê usar o histórico?** Porque o botão "Voltar" do Android recua no
histórico da janela. Assim, o botão do telemóvel e o botão do cabeçalho fazem
o mesmo, sem código extra. *(Falta confirmar este comportamento no telemóvel.)*

### 4.6 O diagnóstico OBD-II: como funciona a ligação

O caminho dos dados é: `diagnostico.js` → `leitor_obd.js` → `bluetooth.js` →
plugin → Bluetooth do telemóvel → leitor → carro. A resposta faz o caminho
inverso e passa por `interpretar_obd.js`.

1. **Pesquisa:** pede as permissões e lista os dispositivos BLE durante 15 segundos.
   Lista também os emparelhados no telemóvel, que servem de pista para o tipo de leitor.
2. **Canal:** ao ligar, vê os serviços do dispositivo e experimenta os que têm uma
   característica para escrever e outra para receber, até um responder ao comando `ATZ`.
3. **Configuração:** envia `ATE0`, `ATL0`, `ATS0`, `ATH0` e `ATSP0`.
4. **Leituras:** `010C` (rotação), `0105` (temperatura) e `03` (códigos de avaria).

Regras: os comandos seguem numa fila, um de cada vez, porque o leitor só atende
um. Só há comandos de leitura: o `04`, que apaga códigos, não existe na app. O
**registo técnico** do ecrã mostra tudo o que foi enviado e recebido.

---

## 5. Como se faz uma mudança e se vê o resultado

1. Editar os ficheiros dentro de `www/`.
2. Copiar as alterações para o projeto Android:
   ```
   npm run sincronizar
   ```
3. Abrir o projeto Android no Android Studio e correr no telemóvel:
   ```
   npm run abrir-android
   ```

Para gerar só o ficheiro APK, sem abrir o Android Studio (PowerShell, dentro da pasta do projeto):
```
cd android
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
.\gradlew.bat assembleDebug
```
O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk`.

Para ver rapidamente o aspeto sem Android, podes abrir `www/index.html` num
navegador de computador (ver o ponto 7 sobre limitações).

---

## 6. Convenções do projeto

- Nomes de ficheiros, funções e classes CSS em **português**, sem acentos nos nomes de ficheiros.
- CSS com nomes no estilo `bloco__elemento--variante` (por exemplo `cartao__titulo`, `cartao--largo`).
- Cada ficheiro JavaScript começa com um resumo do que faz e está dividido em **blocos comentados**.
- No HTML e no CSS não se comenta, exceto onde o HTML chama JavaScript externo.
- Um ficheiro, uma responsabilidade.
- Sem bibliotecas extra enquanto não forem mesmo necessárias.

---

## 7. Limitações e pontos por confirmar

- **Compilar o APK** precisa de Java 17 ou 21. O Android Studio instalado traz
  o Java 25, que o Gradle atual ainda não suporta, por isso foi instalado o
  Java 21 (Temurin) em `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot`.
  O Java 8 que já existia no computador não serve.
- **Bluetooth:** implementado para BLE, com o plugin
  `@capacitor-community/bluetooth-le`, mas ainda não testado com o leitor real.
  Falta confirmar se o Norauto 2611975 é BLE. Se for Bluetooth clássico, não vai
  aparecer na pesquisa e será preciso um módulo Android nativo em Kotlin.
- Ao abrir `www/index.html` diretamente no navegador do computador, os módulos
  JavaScript podem ser bloqueados. Usa um servidor local simples ou o telemóvel.

---

## 8. Estado atual

**Feito**
- Projeto criado com Capacitor e projeto Android gerado.
- Primeiro APK de teste compilado (3,9 MB). Ainda não foi instalado nem testado num telemóvel.
- Design do ecrã inicial conforme o desenho da aluna, com barra de navegação de baixo.
  Instalado e visto num Samsung Galaxy A13 (o ecrã inicial). Os outros ecrãs
  desta versão ainda não foram testados no telemóvel.
- Navegação entre ecrãs com botão de voltar e barra de baixo.
- Versão anterior (cartões simples): testada no telemóvel, navegação e botão de voltar funcionaram.
- Script da base de dados escrito (ainda não executado no MySQL).

**Por fazer, por ordem**
1. Instalar o APK no telemóvel e confirmar o aspeto e o botão de voltar.
2. Testar o ecrã Diagnóstico no carro: pesquisa, ligação, leituras e códigos.
4. Guardar veículos, manutenções e despesas no telemóvel.
5. PHP + MySQL: contas, login e sincronização.
