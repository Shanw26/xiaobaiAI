#!/bin/bash

echo "正在推送到 GitHub..."
echo ""
echo "首次推送需要认证："
echo "1. 用户名：Shanw26"
echo "2. 密码：输入 Personal Access Token（不是 GitHub 密码）"
echo ""
echo "获取 Token 步骤："
echo "1. 访问 https://github.com/settings/tokens"
echo "2. 点击 'Generate new token (classic)'"
echo "3. 勾选 'repo' 权限"
echo "4. 生成并复制 Token"
echo ""
echo "提示：配置了凭证助手后，Token 会被保存，后续推送无需再次输入"
echo ""

cd "$(dirname "$0")"
git push -u origin main

echo ""
echo "推送完成！"
echo "项目地址：https://github.com/Shanw26/xiaobaiAI"
