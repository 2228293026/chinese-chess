@echo off
chcp 65001 >nul
echo ================================
echo 中国象棋 - GitHub 部署脚本
echo ================================
echo.

cd /d "%~dp0"

REM 检查远程仓库
git remote | findstr origin >nul
if errorlevel 1 (
    echo 添加远程仓库...
    git remote add origin https://github.com/2228293026/chinese-chess.git
)

REM 切换到 main 分支
git branch -M main

REM 显示状态
echo 待推送的文件:
git status --short
echo.

set /p confirm=确认推送到 GitHub? (y/n):
if /i not "%confirm%"=="y" (
    echo 取消推送
    pause
    exit /b 1
)

echo.
echo 正在推送到 GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ✅ 推送成功！
    echo 访问: https://github.com/2228293026/chinese-chess
) else (
    echo.
    echo ❌ 推送失败
    echo 请确保:
    echo 1. 已创建 GitHub 仓库: https://github.com/2228293026/chinese-chess
    echo 2. 已配置 GitHub 认证 ^(Personal Access Token 或 SSH^)
    echo.
    echo 配置 Personal Access Token:
    echo   - 访问 https://github.com/settings/tokens
    echo   - 生成新 token（权限：repo）
    echo   - 使用 token 作为密码
)

pause
