# HelpMyCar

> **Projeto oficial da Prova de Aptidão Profissional (PAP) 2026/2027.**
> Aluna: Danielle Nascimento, 12.º GPSI, Escola Secundária de Palmela.

Aplicação **Android** que ajuda a compreender, organizar e acompanhar a informação sobre veículos. A funcionalidade principal é a ligação a um leitor **OBD-II por Bluetooth**, para ler dados do carro (rotação, temperatura) e códigos de avaria, e explicá-los em linguagem simples.

## Tecnologias
HTML, CSS e JavaScript, empacotados com o **Capacitor** numa app Android instalável. Mais tarde: PHP e MySQL para contas e dados online.

## Estado
| Parte | Estado |
|---|---|
| Estrutura, navegação e ecrã inicial | Feito e visto no telemóvel |
| Ecrã Diagnóstico (Bluetooth BLE, leitura de RPM, temperatura e códigos) | Testado no carro: ligação, rotação e temperatura funcionam; códigos de avaria por ver com uma avaria real |
| Veículos, manutenção, despesas, dúvidas e vídeos | Em construção |
| Base de dados MySQL (`base_dados/criar_base_dados.sql`, 15 tabelas) | Escrita, ainda não executada |
| API PHP, contas e login | Por fazer |

A app nunca mostra dados fictícios como se fossem do veículo.

## Como compilar e instalar
Requisitos: Node, Android Studio (SDK) e **Java 21**.

```powershell
npm install
npx cap sync android
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat assembleDebug
```
O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk`. Para instalar com o telemóvel ligado por USB (depuração USB ativa): `adb install -r app-debug.apk`.

## Estrutura
```
www/        A aplicação (HTML, CSS e JavaScript)
android/    Projeto Android gerado pelo Capacitor
base_dados/ Script SQL da base de dados
```

## Documentação
- `DOCUMENTACAO.md`: organização do código e como tudo funciona.
- `CLAUDE.md`: contexto, regras de trabalho e estado do projeto para o assistente Claude Code.

## Convenções
- Nomes de ficheiros, funções, classes e tabelas em português.
- Ficheiros pequenos, cada um com uma única responsabilidade.
- JavaScript comentado em blocos, a explicar o que cada parte faz.
- Chaves da base de dados com o nome `cod` em vez de `id`.
