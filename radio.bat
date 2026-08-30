@echo off
chcp 65001 >nul
title 云听电台播放器
setlocal enabledelayedexpansion

REM ============================================
REM  radio.bat - 云听(radio.cn)电台选台播放引导
REM  依赖: WSL + python3 (radio_stream.py)
REM  用法: 双击运行, 输入 1 或 2 选台
REM  v1.0.0 2026-08-30
REM ============================================

set "PY=/home/sunny/.openclaw/workspace/scripts/radio_stream.py"

:MENU
cls
echo ============================================
echo        云听电台 - 选台播放
echo ============================================
echo.
echo    1. 汕头音乐广播
echo    2. 汕头综合广播
echo    0. 退出
echo.
set /p CHOICE=请选择 [1/2/0]: 

if "%CHOICE%"=="1" set KW=汕头音乐& goto PLAY
if "%CHOICE%"=="2" set KW=汕头综合& goto PLAY
if "%CHOICE%"=="0" exit /b
goto MENU

:PLAY
echo.
echo 正在获取 %KW% 最新播放地址...
for /f "usebackq delims=" %%i in (`wsl -e python3 %PY% %KW% --url-only`) do set URL=%%i

if not defined URL (
    echo [错误] 未获取到地址, 请检查 WSL/python 是否可用
    pause
    exit /b
)

echo 地址: %URL%
echo 正在打开默认浏览器播放...
start "" "%URL%"
echo.
echo 若浏览器未自动播放, 可复制上面地址手动打开
pause
exit /b
