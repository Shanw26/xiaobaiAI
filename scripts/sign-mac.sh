#!/bin/bash

echo "🔐 开始 ad-hoc 签名..."

# 签名 x64 版本
if [ -d "release/mac/小白AI.app" ]; then
  codesign --force --deep --sign - "release/mac/小白AI.app"
  echo "✅ x64 版本签名完成"
fi

# 签名 ARM64 版本
if [ -d "release/mac-arm64/小白AI.app" ]; then
  codesign --force --deep --sign - "release/mac-arm64/小白AI.app"
  echo "✅ ARM64 版本签名完成"
fi

echo "🎉 签名完成！"
