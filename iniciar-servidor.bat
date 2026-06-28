@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Diretor - iniciando

echo Iniciando o servidor do Diretor...

rem Sobe o servidor numa janela propria e minimizada (titulo usado para fechar depois)
start "Diretor Server" /min cmd /c "node server.js"

rem Espera um instante o servidor subir e abre o app no navegador
ping -n 3 127.0.0.1 >nul
start "" "http://localhost:8123"

exit
