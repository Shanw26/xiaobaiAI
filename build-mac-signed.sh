#!/bin/bash

# 小白AI macOS 打包脚本（带签名和公证）

set -e

echo "================================"
echo "  小白AI - macOS 打包工具"
echo "  包含代码签名和公证"
echo "================================"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 加载 .env 文件
if [ -f ".env" ]; then
    echo "📝 加载环境变量..."
    export $(grep -v '^#' .env | xargs)
    echo "✓ 环境变量已加载"
    echo ""
else
    echo "⚠️  警告：未找到 .env 文件"
    echo ""
fi

echo "📦 步骤 1: 清理旧的构建文件..."
rm -rf dist release
echo "✓ 清理完成"
echo ""

echo "🔨 步骤 2: 构建前端代码..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败"
    exit 1
fi
echo "✓ 前端构建完成"
echo ""

echo "🔐 步骤 3: 检查代码签名证书..."
bash scripts/check-certs.sh
echo ""

echo "📦 步骤 4: 打包 macOS 应用（带签名）..."
if [ -n "$APPLE_ID" ] && [ -n "$APPLE_ID_PASSWORD" ] && [ -n "$APPLE_TEAM_ID" ]; then
    echo "✅ 检测到 Apple 公证配置，将进行完整签名和公证"
    echo "   Apple ID: $APPLE_ID"
    echo "   Team ID: $APPLE_TEAM_ID"
else
    echo "⚠️  未检测到完整的 Apple 公证配置"
    echo "   APPLE_ID: ${APPLE_ID:+已设置}"
    echo "   APPLE_ID_PASSWORD: ${APPLE_ID_PASSWORD:+已设置}"
    echo "   APPLE_TEAM_ID: ${APPLE_TEAM_ID:+已设置}"
    echo ""
    echo "💡 应用将签名但不会公证，用户首次打开需要右键"
fi
echo ""

npm run dist:mac
if [ $? -ne 0 ]; then
    echo "❌ macOS 打包失败"
    exit 1
fi
echo "✓ macOS 打包完成"
echo ""

# 检查签名
echo "🔍 步骤 5: 验证代码签名..."
APP_PATH=$(find release -name "*.app" -type d | head -1)
if [ -n "$APP_PATH" ]; then
    echo "应用路径: $APP_PATH"

    # 检查签名
    codesign -dv "$APP_PATH" 2>&1 | head -5

    # 检查 Gatekeeper
    echo ""
    spctl -a -vv "$APP_PATH" 2>&1 | head -5
else
    echo "⚠️  未找到 .app 文件"
fi
echo ""

echo "================================"
echo "✅ 打包成功！"
echo "================================"
echo ""
echo "📁 安装包位置："
ls -lh release/*.dmg release/*.zip 2>/dev/null || echo "  未找到安装包"
echo ""
echo "📝 下一步："
echo "  1. 测试安装包是否可以正常安装"
echo "  2. 检查签名和公证状态"
echo "  3. 在干净的虚拟机上测试"
echo "  4. 上传到分发平台"
echo ""
