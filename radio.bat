@echo off
chcp 65001 >nul
title 云听电台播放器
setlocal enabledelayedexpansion

REM ============================================
REM  radio.bat - 云听(radio.cn)电台选台播放引导
REM  依赖: 本机安装 Python (同目录 radio_stream.py)
REM  用法: 双击运行, 输入 1 或 2 选台
REM  v1.1.0 2026-08-30
REM ============================================

set "PY=%~dp0radio_stream.py"

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

if "%CHOICE%"=="1" set SN=1& goto PLAY
if "%CHOICE%"=="2" set SN=2& goto PLAY
if "%CHOICE%"=="0" exit /b
goto MENU

:PLAY
echo.
echo 正在获取最新播放地址...
for /f "usebackq delims=" %%i in (`python "%PY%" --station %SN% --url-only`) do set URL=%%i

if not defined URL (
    echo [错误] 未获取到地址。
    echo 请确认已安装 Python 且 radio_stream.py 与 radio.bat 在同一目录。
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