#!/bin/bash

echo "正在使用 SSH 推送到 GitHub..."
echo ""
echo "如果推送失败，请确保："
echo "1. 已将 SSH 公钥添加到 GitHub：https://github.com/settings/keys"
echo "2. SSH 公钥内容："
echo "   $(cat ~/.ssh/id_rsa.pub)"
echo ""

cd "$(dirname "$0")"
git push -u origin main

echo ""
echo "推送完成！"
echo "项目地址：https://github.com/Shanw26/xiaobaiAI"
