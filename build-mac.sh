#!/bin/bash

# 小白AI macOS 打包脚本

set -e

echo "================================"
echo "  小白AI - macOS 打包工具"
echo "================================"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
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

echo "📦 步骤 3: 打包 macOS 应用..."
npm run dist:mac
if [ $? -ne 0 ]; then
    echo "❌ macOS 打包失败"
    exit 1
fi
echo "✓ macOS 打包完成"
echo ""

echo "================================"
echo "✅ 打包成功！"
echo "================================"
echo ""
echo "📁 安装包位置："
ls -lh release/*.dmg release/*.zip 2>/dev/null || echo "  未找到安装包"
echo ""
echo "📤 下一步："
echo "  1. 测试安装包是否可以正常安装"
echo "  2. 在干净的虚拟机上测试"
echo "  3. 上传到分发平台"
echo ""
