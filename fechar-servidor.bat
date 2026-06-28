@echo off
chcp 65001 >nul
title Diretor - fechando

echo Fechando o servidor do Diretor...

rem 1) Fecha pela janela com o titulo "Diretor Server"
taskkill /fi "WINDOWTITLE eq Diretor Server*" /t /f >nul 2>&1

rem 2) Garantia: encerra qualquer processo escutando na porta 8123
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8123" ^| findstr LISTENING') do (
    taskkill /pid %%a /f >nul 2>&1
)

echo Servidor fechado.
ping -n 3 127.0.0.1 >nul
exit
