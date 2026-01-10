#!/bin/bash

# macOS 证书导出辅助脚本
# 帮助快速导出并转换为 base64

set -e

echo "🔑 macOS 签名证书导出工具"
echo "=============================="
echo ""

# 检查是否在 macOS 上
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ 此脚本只能在 macOS 上运行"
    exit 1
fi

# 检查是否有开发者证书
echo "📋 检查开发者证书..."
CERTS=$(security find-identity -v -p codesigning | grep "Developer ID Application" || true)

if [ -z "$CERTS" ]; then
    echo "❌ 未找到 'Developer ID Application' 证书"
    echo ""
    echo "请确保："
    echo "1. 已安装 Apple Developer 证书"
    echo "2. 证书类型是 'Developer ID Application'"
    echo "3. 证书在 '钥匙串访问' → '我的证书' 中"
    exit 1
fi

echo "✅ 找到以下证书："
echo "$CERTS"
echo ""

# 询问证书名称
echo "请输入证书名称（从上面复制，例如：'Developer ID Application: Beijing Principle Technology Co., Ltd. (666P8DEX39)'）"
read -p "> " CERT_NAME

if [ -z "$CERT_NAME" ]; then
    echo "❌ 证书名称不能为空"
    exit 1
fi

# 输出文件名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CERT_FILE="certificate_${TIMESTAMP}.p12"
BASE64_FILE="certificate_${TIMESTAMP}.base64.txt"

echo ""
echo "📤 导出证书..."

# 导出证书
security export-certificate -p "$CERT_NAME" -t pkcs12 -o "$CERT_FILE" 2>&1 || {
    echo "❌ 证书导出失败"
    echo "请检查证书名称是否正确"
    exit 1
}

echo "✅ 证书已导出到: $CERT_FILE"
echo ""

# 转换为 base64
echo "🔄 转换为 base64..."
base64 -i "$CERT_FILE" > "$BASE64_FILE"

echo "✅ Base64 已保存到: $BASE64_FILE"
echo ""

# 显示内容
echo "📋 Base64 内容（前 100 字符）："
head -c 100 "$BASE64_FILE"
echo "..."
echo ""

# 复制到剪贴板
cat "$BASE64_FILE" | pbcopy
echo "✅ 已复制到剪贴板！"
echo ""

# 下一步说明
echo "=============================="
echo "📝 下一步操作："
echo ""
echo "1. 访问 GitHub:"
echo "   https://github.com/Shanw26/xiaobaiAI/settings/variables/actions"
echo ""
echo "2. 添加以下 Variables:"
echo ""
echo "   Name: APPLE_CERTIFICATES_P12"
echo "   Value: （已复制到剪贴板，直接粘贴）"
echo ""
echo "   Name: APPLE_CERTIFICATES_PASSWORD"
echo "   Value: （刚才输入的证书密码）"
echo ""
echo "   Name: APPLE_ID"
echo "   Value: （你的 Apple ID）"
echo ""
echo "   Name: APPLE_APP_SPECIFIC_PASSWORD"
echo "   Value: （App-specific 专用密码）"
echo ""
echo "   Name: APPLE_TEAM_ID"
echo "   Value: 666P8DEX39"
echo ""
echo "3. 推送 workflow 更新并触发打包"
echo ""
echo "=============================="
echo ""
echo "✨ 证书文件已保存，可以安全删除原始 .p12 文件"
echo "   base64 文件: $BASE64_FILE"
echo ""

# 清理提示
read -p "是否删除原始 .p12 文件？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm "$CERT_FILE"
    echo "✅ 已删除: $CERT_FILE"
fi

echo ""
echo "🎉 完成！现在可以在 GitHub 添加 Variables 了"
