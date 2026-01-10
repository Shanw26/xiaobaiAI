#!/usr/bin/env node

/**
 * 从 key.md 读取密钥并生成 .env 文件
 *
 * 使用方法：
 * node scripts/setup-env-from-key.js
 *
 * 注意：需要先确保 key.md 文件存在
 */

const fs = require('fs');
const path = require('path');

// 读取 key.md 文件
const keyMdPath = path.resolve(__dirname, '../../同步空间/Claude code/key.md');
const envPath = path.resolve(__dirname, '../.env');

console.log('🔑 正在从 key.md 读取密钥...\n');

try {
  if (!fs.existsSync(keyMdPath)) {
    console.error('❌ 错误：找不到 key.md 文件');
    console.log(`📍 期望位置：${keyMdPath}`);
    console.log('\n请确保：');
    console.log('1. 同步空间已同步');
    console.log('2. key.md 文件存在');
    process.exit(1);
  }

  const keyMdContent = fs.readFileSync(keyMdPath, 'utf-8');

  // 提取密钥（使用正则表达式）
  const extractKey = (pattern) => {
    const match = keyMdContent.match(pattern);
    return match ? match[1].trim() : '';
  };

  // 提取 Supabase 配置
  const supabaseUrl = extractKey(/Project URL: (https:\/\/[a-z0-9\-]+\.supabase\.co)/);
  const supabaseAnonKey = extractKey(/Publishable Key: (sb_publishable_[a-zA-Z0-9_-]+)/);
  const supabaseSecretKey = extractKey(/Secret Key: (sb_secret_[a-zA-Z0-9_-]+)/);

  // 提取阿里云 OSS 配置
  const ossKeyId = extractKey(/AccessKey ID: (LTAI[a-zA-Z0-9]+)/);
  const ossSecret = extractKey(/AccessKey Secret: ([a-zA-Z0-9]+)/);

  // 提取 Apple 配置
  const appleId = extractKey(/Apple ID: ([\w@\.]+)/);
  const applePassword = extractKey(/Apple ID Password: ([a-z0-9\-]+)/);
  const appleTeamId = extractKey(/Team ID: ([A-Z0-9]+)/);

  // 生成 .env 文件内容
  const envContent = `# Supabase 配置
# 从 key.md 自动生成 - ${new Date().toISOString()}

# Supabase 项目 URL
VITE_SUPABASE_URL=${supabaseUrl}

# Supabase Anon Key（客户端使用）
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}

# Supabase Service Role Key（仅服务端使用）
VITE_SUPABASE_SERVICE_ROLE_KEY=${supabaseSecretKey}

# 阿里云 OSS 配置（从 key.md 加载）
ALI_OSS_ACCESS_KEY_ID=${ossKeyId}
ALI_OSS_ACCESS_KEY_SECRET=${ossSecret}

# Apple 公证配置（macOS 打包签名）
APPLE_ID=${appleId}
APPLE_ID_PASSWORD=${applePassword}
APPLE_TEAM_ID=${appleTeamId}
`;

  // 写入 .env 文件
  fs.writeFileSync(envPath, envContent, 'utf-8');

  console.log('✅ .env 文件生成成功！\n');
  console.log('📍 位置：' + envPath);
  console.log('\n⚠️ 重要提醒：');
  console.log('1. .env 文件已在 .gitignore 中，不会被提交到 Git');
  console.log('2. 请勿将 .env 文件分享给他人');
  console.log('3. 运行 npm install && npm run dev 即可启动开发环境\n');

} catch (error) {
  console.error('❌ 错误：', error.message);
  process.exit(1);
}
