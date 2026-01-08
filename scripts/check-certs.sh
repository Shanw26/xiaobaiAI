#!/bin/bash

echo "🔍 检查代码签名证书..."
echo ""

# 查找所有可用的代码签名证书
echo "📋 系统中可用的代码签名证书："
security find-identity -v -p codesigning

echo ""
echo "🔐 检查特定证书："

# package.json 中配置的证书
CERT_1="4E76C4CD7F4ABFA82DF8EED886AA36F117140EDD"
# afterPack.js 中之前使用的证书
CERT_2_NAME="Developer ID Application: Beijing Principle Technology Co., Ltd."

echo ""
echo "检查证书 1: $CERT_1"
if security find-certificate -c "$CERT_1" 2>/dev/null; then
  echo "✅ 证书 1 已安装"
  security find-certificate -c "$CERT_1" -p | openssl x509 -text -noout | grep -E "(Subject|Issuer|Not After)"
else
  echo "❌ 证书 1 未安装"
fi

echo ""
echo "检查证书 2: $CERT_2_NAME"
if security find-certificate -c "Developer ID Application: Beijing Principle Technology Co., Ltd." 2>/dev/null; then
  echo "✅ 证书 2 已安装"
  security find-certificate -c "Developer ID Application: Beijing Principle Technology Co., Ltd." -p | openssl x509 -text -noout | grep -E "(Subject|Issuer|Not After)"
else
  echo "❌ 证书 2 未安装"
fi

echo ""
echo "💡 建议："
echo "1. 如果证书都未安装，请从钥匙串访问或从其他电脑导出"
echo "2. 如果证书已安装但签名失败，请检查证书权限"
echo "3. 运行 'security unlock-keychain' 解锁钥匙串"
