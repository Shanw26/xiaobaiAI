/**
 * 安全检查脚本
 * 验证敏感信息是否安全
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n' + '='.repeat(60));
console.log('🔒 小白AI - 安全检查');
console.log('='.repeat(60) + '\n');

let allSafe = true;

// 1. 检查 .gitignore 配置
console.log('📋 检查 1: .gitignore 配置');

const gitignorePath = path.join(__dirname, '../.gitignore');
if (!fs.existsSync(gitignorePath)) {
  console.log('   ❌ .gitignore 文件不存在');
  allSafe = false;
} else {
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  if (gitignore.includes('.env')) {
    console.log('   ✅ .env 已在 .gitignore 中');
  } else {
    console.log('   ⚠️  .env 未在 .gitignore 中');
    allSafe = false;
  }
}

// 2. 检查 .env 是否被 Git 跟踪
console.log('\n📋 检查 2: .env 文件状态');

try {
  const status = execSync('git status --short .env 2>&1', { encoding: 'utf8' });
  if (status.trim()) {
    console.log('   ⚠️  .env 被 Git 跟踪：');
    console.log('   ' + status.trim());
    console.log('   ⚠️  请运行: git rm --cached .env');
    allSafe = false;
  } else {
    console.log('   ✅ .env 未被 Git 跟踪');
  }
} catch (error) {
  console.log('   ✅ .env 未被 Git 跟踪');
}

// 3. 检查 Git 历史中是否有 .env
console.log('\n📋 检查 3: Git 历史记录');

try {
  const history = execSync('git log --all --full-history -- .env 2>&1', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  if (history.trim() && !history.includes('fatal')) {
    console.log('   ⚠️  Git 历史中发现 .env 记录');
    console.log('   ⚠️  请立即删除历史中的敏感信息！');
    console.log('   参考: https://help.github.com/articles/removing-sensitive-data-from-a-repository/');
    allSafe = false;
  } else {
    console.log('   ✅ Git 历史中无 .env 记录');
  }
} catch (error) {
  console.log('   ✅ Git 历史中无 .env 记录');
}

// 4. 检查 .env 文件内容安全
console.log('\n📋 检查 4: .env 文件内容');

const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.log('   ⚠️  .env 文件不存在');
} else {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasAccessKey = envContent.includes('ALI_OSS_ACCESS_KEY_ID=') ||
                       envContent.includes('ALI_OSS_ACCESS_KEY_SECRET');

  if (hasAccessKey) {
    // 检查是否有实际值（不是空的或占位符）
    const hasValue = envContent.match(/ALI_OSS_ACCESS_KEY_ID=(.+)\n/);
    if (hasValue && hasValue[1] && !hasValue[1].includes('your_')) {
      console.log('   ⚠️  .env 包含实际的 AccessKey 值');
      console.log('   ✅ .gitignore 配置正确，文件不会被提交');
    } else {
      console.log('   ✅ .env 只有占位符，安全');
    }
  } else {
    console.log('   ℹ️  .env 中未配置阿里云 OSS');
  }
}

// 5. 检查敏感文件的权限
console.log('\n📋 检查 5: 文件权限');

try {
  const stats = fs.statSync(envPath);
  const mode = stats.mode & parseInt('777', 8);

  if (mode.toString(8) === '600') {
    console.log('   ✅ .env 权限正确 (600 - 仅所有者可读写)');
  } else if (mode.toString(8) === '400') {
    console.log('   ⚠️  .env 权限为 400（仅读），可能无法编辑');
  } else {
    console.log(`   ⚠️  .env 权限为 ${mode.toString(8)}，建议设置为 600`);
    console.log('   运行: chmod 600 .env');
  }
} catch (error) {
  console.log('   ℹ️  无法检查文件权限');
}

// 总结
console.log('\n' + '='.repeat(60));
if (allSafe) {
  console.log('✅ 所有安全检查通过！');
} else {
  console.log('⚠️  发现安全问题，请按上述提示处理');
}
console.log('='.repeat(60));

// 安全建议
console.log('\n📖 安全最佳实践：');
console.log('   1. ✅ 永远不要提交 .env 文件到 Git');
console.log('   2. ✅ 定期轮换 AccessKey（每3-6个月）');
console.log('   3. ✅ 使用 RAM 子账号，不使用主账号');
console.log('   4. ✅ 限制 RAM 用户权限（只给 OSS 权限）');
console.log('   5. ✅ 开启 Bucket 访问日志（监控异常访问）');
console.log('   6. ✅ 不要在客户端代码中使用 AccessKey');
console.log('   7. ✅ 生产环境使用环境变量或密钥管理服务');
console.log('\n' + '='.repeat(60) + '\n');

process.exit(allSafe ? 0 : 1);
