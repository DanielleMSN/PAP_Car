# CLAUDE.md — HelpMyCar (PAP 2026/2027)

Instruções e contexto para o Claude Code. Lê isto no início de cada sessão.
Detalhes técnicos da app: `DOCUMENTACAO.md`. Resumo do projeto: `README.md`.

## Quem e o quê
- Projeto: **HelpMyCar**, app Android da Prova de Aptidão Profissional (PAP) de **Danielle Nascimento**, 12.º GPSI, Escola Secundária de Palmela. Orientador(a): Ana Cristina Ferreira.
- A app ajuda a compreender, organizar e acompanhar a informação de um veículo. Função principal: ligar a um leitor **OBD-II por Bluetooth**, ler dados e códigos de avaria e explicá-los em linguagem simples.
- A utilizadora fala **português (Portugal)**. Responde sempre em português. Não presumas pronomes: usa a forma neutra se for preciso.
- Hardware de teste: leitor **Norauto ref. 2611975** (BLE, confirmado pelo teste de 2026-11), carro **Peugeot 208 1.6 HDi 2015**, telemóvel **Samsung Galaxy A13** (Android 14).

## Como trabalhar com a utilizadora (regras)
1. **Explica antes de fazer e espera aprovação** para cada passo que altere o projeto, instale coisas, apague ficheiros ou escreva fora desta pasta. Ela prefere consentimento explícito.
2. **Nunca apagues nada sem ela pedir.** Antes de apagar, olha para o alvo.
3. **Tu escreves o código** (decisão de 2026-10-30), mas ela tem de o conseguir explicar na defesa. Por isso:
   - nomes de ficheiros, funções, variáveis, classes CSS e tabelas **em português**, sem acentos nos nomes de ficheiros;
   - ficheiros pequenos, uma responsabilidade cada;
   - **JavaScript comentado em blocos, como se estivesses a ensinar** (o que é cada coisa e porquê); cada ficheiro começa com um resumo do seu papel;
   - **HTML e CSS sem comentários**, exceto onde o HTML chama JavaScript externo;
   - sem frameworks nem dependências desnecessárias; sem funcionalidades que ninguém pediu.
4. **Nunca mostres dados fictícios como se fossem dados reais do veículo.** Sem leitura real, o ecrã mostra "--" ou "Não ligado".
5. **Honestidade:** se algo não foi testado, di-lo. Só dá como feito o que foi verificado (compilado, instalado, visto no telemóvel).
6. Mantém o `DOCUMENTACAO.md` atualizado sempre que a estrutura ou o estado mudarem.

## Stack (decidida em 2026-10-30)
- **HTML + CSS + JavaScript** (módulos ES, sem bundler) em `www/`, empacotados com **Capacitor 8** para **Android apenas** (iOS abandonado: sem meios para testar).
- **Bluetooth:** plugin `@capacitor-community/bluetooth-le` (só BLE). Se o leitor for **Bluetooth clássico**, é preciso um módulo nativo em **Kotlin** na pasta `android/`. A utilizadora nunca usou Kotlin (sabe um pouco de Java): explica tudo.
- **Mais tarde:** PHP + MySQL (API, contas, login). A app nunca fala diretamente com o MySQL.
- O primeiro protótipo em Flutter foi abandonado e apagado.

## Estrutura
```
www/                    A app (só se escreve código aqui)
  index.html            Todos os ecrãs + barra de baixo
  css/                  tema (cores/medidas), base, componentes, ecras
  js/
    principal.js        Arranque
    configuracao.js     Valores fixos (ecrã inicial, ecrãs da barra)
    navegacao.js        Troca de ecrã, botão voltar (usa o history)
    ecras/diagnostico.js        Ecrã Diagnóstico
    servicos/bluetooth.js       Ponte para o plugin BLE
    servicos/leitor_obd.js      Comandos ELM327 (só leitura), fila de comandos
    utilitarios/interpretar_obd.js  Respostas -> RPM, °C, códigos de avaria
  imagens/carro.png     Foto PROVISÓRIA (desportivo, 191 px)
android/                Gerado pelo Capacitor (não editar à mão, salvo Kotlin)
base_dados/criar_base_dados.sql   15 tabelas, chave `cod` em vez de `id`
DOCUMENTACAO.md         Documentação da organização e do funcionamento
```
Identidade visual: fundo marfim `#FDFBF5`, amarelo `#F2C94C` nos destaques, azul-escuro `#12234A`, cartões brancos arredondados. Desenho de referência feito pela utilizadora.

## Comandos (PowerShell)
```powershell
cd C:\Users\a1508\Desktop\HelpMyCar
npx cap sync android                       # copia www/ para o Android
$j="C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:JAVA_HOME=$j; $env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"; $env:Path="$j\bin;$env:Path"
cd android; .\gradlew.bat assembleDebug    # APK em android\app\build\outputs\apk\debug\app-debug.apk
$adb="$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb install -r app\build\outputs\apk\debug\app-debug.apk
& $adb shell monkey -p pt.helpmycar.app -c android.intent.category.LAUNCHER 1
```
- Usa o **Java 21** (Temurin, instalado). O Java 25 do Android Studio **não** funciona com o Gradle 8.14 ("major version 69"); o Java 8 do sistema também não serve.
- Capturas do telemóvel: `adb shell screencap -p /sdcard/x.png` + `adb pull`; depois lê a imagem. Toques de teste: `adb shell input tap x y` (ecrã 1080x2408).
- Pré-visualização rápida do ecrã inicial sem telemóvel: Edge headless (`msedge --headless=new --screenshot`) com uma moldura `<iframe>` de 360 px. Os módulos JS não correm em `file://`.
- Testes das funções puras: copiar `www/js` para uma pasta temporária com `{"type":"module"}` no `package.json` e correr com `node`.

## Estado atual (2026-11-23)
**Feito e verificado:** projeto Capacitor, navegação, ecrã inicial e ecrã Diagnóstico instalados e vistos no Galaxy A13; interpretação das respostas OBD-II testada no computador; relatório formatado.
**Testado no carro (Peugeot 208, relatado pela utilizadora):** a app ligou ao leitor e mostrou rotação e temperatura reais; a leitura de códigos não devolveu nenhum (o carro não tinha avarias). Como a app só usa o plugin BLE, o leitor é BLE (dedução). O registo técnico foi copiado pela utilizadora mas **ainda não o recebi**; a leitura de códigos com uma avaria real continua por ver.
**Por fazer, por ordem:**
1. ~~Teste no carro~~ feito (ver acima). O módulo Kotlin fica dispensado.
2. Receber o registo técnico e uma captura do ecrã Diagnóstico ligado (para o relatório).
3. Explicações dos códigos de avaria (tabela `catalogo_codigos_erro`; não inventar explicações sem fonte).
4. Guardar veículos, manutenções e despesas localmente.
5. Executar o SQL no MySQL e criar a API PHP (contas/login).
6. Ícone e ecrã de arranque próprios (continuam os do Capacitor); foto do Peugeot 208 em PNG transparente com >= 600 px (a utilizadora tem de a fornecer).
7. Atualizar o relatório depois dos testes.

## Base de dados
- `base_dados/criar_base_dados.sql`: **15 tabelas** (utilizadores, sessoes, veiculos, manutencoes, abastecimentos, categorias_despesas, despesas, lembretes, viagens, catalogo_codigos_erro, diagnosticos, codigos_erro, leituras_obd, videos_educativos, favoritos_videos). Em todas: chave primária `cod`; chaves estrangeiras `<tabela>_cod`.
- **Ainda não foi executado.** O script faz `DROP DATABASE IF EXISTS helpmycar`; o modo automático bloqueou essa execução. A utilizadora pode correr o ficheiro no phpMyAdmin (WAMP: MySQL 8.4.7 na porta 3306, `root`, sem palavra-passe; o MariaDB está na 3307).

## Relatório da PAP
- Ficheiro: `C:\Users\a1508\Desktop\PAP\Relatorio\Prova de Aptidão Profissional_Danielle.docx`; regras nos PDFs da mesma pasta. Existe cópia `..._backup_antes_da_formatacao.docx`. O plano de trabalho (`PlanodeTrabalhoPAP_DanielleN.docx`) já foi entregue: **não editar**.
- Formato: Trebuchet MS preta, 11 pt, 1,5 linhas, A4, margens 2/1,5/2/2 cm, texto justificado com avanço de 1,25 cm; capítulos (Título 1) em 16 pt negrito, nova página; cabeçalho e rodapé a 10 pt (anexos sem ambos); capa sem número; Desenvolvimento ≈ 70%; anexos obrigatórios: autoavaliação e avaliações do orientador; palavras estrangeiras em itálico; acordo ortográfico de 1990; escrita impessoal.
- O relatório foi gerado por um script que **já não existe** (estava numa pasta temporária). Para o alterar: usar a skill `docx` e editar o XML, ou pedir à utilizadora que edite no Word.
- A utilizadora disse que ainda vai mudar muita coisa: **não mexer no relatório sem ela pedir.**
- **Prazos:** intermédias no último dia do 1.º período, 26/02/2027 e última semana de abril; 14/05 última revisão; **11/06/2027 23:59** entrega final (PDF por email à secretaria, mais o produto); defesa 6 e 7/07 (30 min + 15 min de perguntas).

## Armadilhas já encontradas
- Automatizar o Word por COM **bloqueia** se abrir PDFs. Com `.docx` funciona. Fecha sempre os processos `WINWORD` que abrires (`/Automation -Embedding`).
- Não há `pdftoppm`, `pandoc` nem LibreOffice. Para ler PDFs: `pdfjs-dist` em Node (extrai texto). Para ver páginas de um PDF como imagem: o renderizador do Windows (`Windows.Data.Pdf`).
- O Edge headless limita a largura mínima da janela (~500 px): usa uma moldura `<iframe>`.
- `Get-Content` com caminhos com `[ ]` precisa de `-LiteralPath`.
- A pasta PAP está em `C:\Users\a1508\Desktop\PAP` (relatório em `Relatorio`, evidências do protótipo antigo em `PAP-HelpMyCar_Figuras`, desenhos e imagens soltos).
- Wi-Fi/Bluetooth/localização do telemóvel têm de estar ligados para o teste; a depuração USB tem de estar autorizada para o `adb` ver o aparelho (`adb devices` deve dizer `device`).

## Memória
Esta sessão passa a abrir-se em `Desktop\HelpMyCar`, por isso a memória automática anterior (`C:\Users\a1508\.claude\projects\C--Users-a1508\memory\`) já não é carregada. Tudo o que importa está neste ficheiro. Mantém-no atualizado.
