#!/bin/bash

# 验证 macOS 应用签名和公证配置

set -e

echo "================================"
echo "  小白AI - 签名验证工具"
echo "================================"
echo ""

# 加载 .env 文件
if [ -f ".env" ]; then
    echo "📝 加载环境变量..."
    export $(grep -v '^#' .env | xargs)
    echo "✓ 环境变量已加载"
else
    echo "❌ 未找到 .env 文件"
    exit 1
fi
echo ""

echo "🔍 步骤 1: 检查环境变量..."
if [ -z "$APPLE_ID" ]; then
    echo "❌ APPLE_ID 未设置"
    exit 1
fi
if [ -z "$APPLE_ID_PASSWORD" ]; then
    echo "❌ APPLE_ID_PASSWORD 未设置"
    exit 1
fi
if [ -z "$APPLE_TEAM_ID" ]; then
    echo "❌ APPLE_TEAM_ID 未设置"
    exit 1
fi
echo "✅ APPLE_ID: $APPLE_ID"
echo "✅ APPLE_TEAM_ID: $APPLE_TEAM_ID"
echo "✅ APPLE_ID_PASSWORD: 已设置（隐藏）"
echo ""

echo "🔍 步骤 2: 检查代码签名证书..."
bash scripts/check-certs.sh
echo ""

echo "🔍 步骤 3: 检查现有应用签名..."
APP_PATH=$(find release -name "*.app" -type d 2>/dev/null | head -1)
if [ -n "$APP_PATH" ]; then
    echo "应用路径: $APP_PATH"
    echo ""

    echo "检查代码签名..."
    codesign -dv "$APP_PATH" 2>&1 | head -10
    echo ""

    echo "检查 Gatekeeper..."
    spctl -a -vv "$APP_PATH" 2>&1 | head -10
    echo ""

    echo "检查公证状态..."
    codesign -d "$APP_PATH" 2>&1 | grep -i "authority" || echo "未找到公证信息"
else
    echo "⚠️  未找到 .app 文件，请先运行打包脚本"
fi
echo ""

echo "================================"
echo "✅ 验证完成"
echo "================================"
echo ""
echo "📝 下一步："
echo "  1. 如果所有检查都通过，运行打包脚本："
echo "     ./build-mac-signed.sh"
echo ""
echo "  2. 打包完成后，测试安装包："
echo "     - 双击 .dmg 文件安装"
echo "     - 检查应用是否能正常打开"
echo "     - 检查是否需要右键打开"
echo ""
