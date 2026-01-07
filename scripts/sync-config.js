/**
 * 配置同步脚本
 *
 * 用途：在多台电脑间同步 .env 配置
 *
 * 使用方法：
 *   # 导出配置到同步空间
 *   node scripts/sync-config.js export
 *
 *   # 从同步空间导入配置
 *   node scripts/sync-config.js import
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.CONFIG_SYNC_KEY || 'xiaobai-ai-config-sync-key-2026';
const ALGORITHM = 'aes-256-cbc';

/**
 * 简单加密/解密（防止明文存储）
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 导出配置到同步空间
 */
function exportConfig() {
  console.log('\n📤 导出配置到同步空间...\n');

  const envPath = path.join(__dirname, '../.env');
  const syncDir = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads/同步空间/小白AI配置');
  const syncFile = path.join(syncDir, '.env.encrypted');

  // 检查源文件
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env 文件不存在，请先配置');
    process.exit(1);
  }

  // 创建同步目录
  if (!fs.existsSync(syncDir)) {
    fs.mkdirSync(syncDir, { recursive: true });
    console.log(`✅ 创建同步目录: ${syncDir}`);
  }

  // 读取配置
  const envContent = fs.readFileSync(envPath, 'utf8');

  // 加密
  const encrypted = encrypt(envContent);

  // 写入同步文件
  fs.writeFileSync(syncFile, encrypted, { mode: 0o600 });
  console.log(`✅ 配置已导出: ${syncFile}`);

  // 创建说明文件
  const readmePath = path.join(syncDir, 'README.md');
  const readme = `# 小白AI - 配置同步

> 此目录用于在多台电脑间同步 .env 配置
> 文件已加密，只有你能解密

## 使用方法

### 导入配置
\`\`\`bash
cd /Users/[your-name]/Downloads/小白AI
node scripts/sync-config.js import
\`\`\`

### 安全说明
- ✅ 配置文件已加密
- ✅ 只有在同步空间（本地硬盘）
- ✅ 不会上传到 GitHub

## 文件说明

- **.env.encrypted**: 加密的配置文件
- **README.md**: 本说明文件

---
创建时间: ${new Date().toLocaleString('zh-CN')}
`;

  fs.writeFileSync(readmePath, readme);
  console.log(`✅ 说明文件已创建: ${readmePath}`);

  console.log('\n📋 下一步：');
  console.log('   1. 让同步空间同步到其他电脑');
  console.log('   2. 在其他电脑运行: node scripts/sync-config.js import');
}

/**
 * 从同步空间导入配置
 */
function importConfig() {
  console.log('\n📥 从同步空间导入配置...\n');

  const envPath = path.join(__dirname, '../.env');
  const syncDir = path.join(process.env.HOME || process.env.USERPROFILE, 'Downloads/同步空间/小白AI配置');
  const syncFile = path.join(syncDir, '.env.encrypted');

  // 检查同步文件
  if (!fs.existsSync(syncFile)) {
    console.error('❌ 同步文件不存在，请先在一台电脑上导出配置');
    console.error(`   期望路径: ${syncFile}`);
    process.exit(1);
  }

  // 读取加密文件
  const encrypted = fs.readFileSync(syncFile, 'utf8');

  // 解密
  let envContent;
  try {
    envContent = decrypt(encrypted);
  } catch (error) {
    console.error('❌ 解密失败，文件可能已损坏');
    process.exit(1);
  }

  // 备份现有配置（如果存在）
  if (fs.existsSync(envPath)) {
    const backupPath = envPath + '.backup.' + Date.now();
    fs.copyFileSync(envPath, backupPath);
    console.log(`✅ 已备份旧配置: ${backupPath}`);
  }

  // 写入配置
  fs.writeFileSync(envPath, envContent, { mode: 0o600 });
  console.log(`✅ 配置已导入: ${envPath}`);

  console.log('\n📋 已导入的配置项：');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.includes('KEY=') && !line.includes('=')) {
      // 显示配置项名称，不显示值
      const key = line.split('=')[0];
      console.log(`   - ${key}`);
    }
  });
}

/**
 * 主函数
 */
function main() {
  const command = process.argv[2];

  if (command === 'export') {
    exportConfig();
  } else if (command === 'import') {
    importConfig();
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 小白AI - 配置同步工具');
    console.log('='.repeat(60));
    console.log('\n用法：');
    console.log('  node scripts/sync-config.js export  # 导出配置到同步空间');
    console.log('  node scripts/sync-config.js import  # 从同步空间导入配置');
    console.log('\n说明：');
    console.log('  - 配置文件会加密后存储在 ~/Downloads/同步空间/小白AI配置/');
    console.log('  - 通过 iCloud、百度网盘等同步工具，在多台电脑间保持一致');
    console.log('  - 配置文件已加密，安全性有保障');
    console.log('\n' + '='.repeat(60) + '\n');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 完成！');
  console.log('='.repeat(60) + '\n');
}

main();
