@echo off
setlocal enabledelayedexpansion
title MISSAO TI - Estande

REM ===================================================================
REM  MISSAO TI :: arranque do estande
REM
REM  De um duplo clique neste arquivo no dia da feira. E so isso.
REM
REM  IMPORTANTE, leia antes:
REM   1. Rode "npm install" e "npm run build" DIAS ANTES, com internet.
REM      No dia da feira nao se instala nada.
REM   2. NUNCA abra o jogo em janela anonima. O ranking do dia fica
REM      gravado no navegador e some ao fechar a janela anonima.
REM   3. Para sair do modo quiosque: ALT+F4.
REM   4. O painel do operador abre com CINCO toques rapidos no canto
REM      SUPERIOR ESQUERDO da tela.
REM ===================================================================

cd /d "%~dp0"

echo.
echo   MISSAO TI - preparando o estande...
echo.

REM --- O jogo precisa estar construido -------------------------------
if not exist "dist\index.html" (
  echo   [!] A pasta dist nao existe. Construindo agora...
  echo       Isto precisa de internet e leva alguns minutos.
  echo.
  if not exist "node_modules" call npm install
  call npm run build
  if errorlevel 1 (
    echo.
    echo   [X] A construcao falhou. O estande NAO vai subir assim.
    echo       Resolva isto antes do dia da feira.
    pause
    exit /b 1
  )
)

REM --- Servidor local ------------------------------------------------
REM  Servir por http, e nao abrir o arquivo direto, porque em file:// o
REM  Chrome trata cada pagina como origem isolada e o ranking gravado
REM  fica inacessivel na proxima abertura.
echo   Subindo o servidor local na porta 4173...
start "MISSAO TI - servidor" /min cmd /c "npm run preview"

REM Espera o servidor responder antes de abrir o navegador.
set /a tentativas=0
:aguarda
set /a tentativas+=1
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "try{ (Invoke-WebRequest -Uri http://localhost:4173 -UseBasicParsing -TimeoutSec 2) | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  if !tentativas! lss 30 goto aguarda
  echo   [X] O servidor nao respondeu. Verifique se a porta 4173 esta livre.
  pause
  exit /b 1
)

REM --- Navegador em modo quiosque ------------------------------------
set "CHROME="
for %%P in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do if not defined CHROME if exist %%P set "CHROME=%%~P"

if not defined CHROME (
  echo   [!] Chrome nao encontrado. Abrindo no navegador padrao.
  echo       Coloque a janela em tela cheia com F11.
  start http://localhost:4173
  goto fim
)

echo   Abrindo o jogo em tela cheia...
REM  --kiosk                        tela cheia sem barra nenhuma
REM  --disable-pinch                mata o zoom por dois dedos
REM  --overscroll-history-navigation=0  impede voltar pagina arrastando
REM  --user-data-dir                perfil proprio: o ranking nao se mistura
REM                                 com a navegacao pessoal de ninguem
start "" "%CHROME%" ^
  --kiosk ^
  --disable-pinch ^
  --overscroll-history-navigation=0 ^
  --disable-features=TranslateUI ^
  --no-first-run ^
  --user-data-dir="%~dp0.chrome-estande" ^
  --app=http://localhost:4173

:fim
echo.
echo   Pronto. O estande esta no ar.
echo.
echo   Painel do operador: cinco toques no canto superior esquerdo.
echo   Para encerrar: feche esta janela e de ALT+F4 no jogo.
echo.
timeout /t 8 /nobreak >nul
endlocal
