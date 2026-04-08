#!/bin/bash
# 部署到 GitHub 的脚本

echo "=== 中国象棋项目 - GitHub 部署 ==="
echo ""

# 检查是否已经添加了远程仓库
if ! git remote | grep -q origin; then
  echo "添加远程仓库..."
  git remote add origin https://github.com/2228293026/chinese-chess.git
fi

# 确保在 main 分支
git branch -M main

# 显示修改的文件
echo "待推送的文件:"
git status --short

# 确认推送
read -p "确认推送到 GitHub? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "取消推送"
  exit 1
fi

# 推送
echo ""
echo "正在推送到 GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 推送成功！"
  echo "访问: https://github.com/2228293026/chinese-chess"
else
  echo ""
  echo "❌ 推送失败"
  echo "请确保："
  echo "1. 已创建 GitHub 仓库: https://github.com/2228293026/chinese-chess"
  echo "2. 已配置 GitHub 认证（Personal Access Token 或 SSH）"
  echo ""
  echo "配置 Personal Access Token:"
  echo "  - 访问 https://github.com/settings/tokens"
  echo "  - 生成新 token（权限：repo）"
  echo "  - 使用 token 作为密码"
fi
