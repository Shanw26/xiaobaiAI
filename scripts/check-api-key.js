// 测试脚本：检查数据库中的官方API Key
const path = require('path');
const Database = require('better-sqlite3');

// 数据库路径
const dbPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Library', 'Application Support', 'xiaobai-ai', 'xiaobai-ai.db');

console.log('📍 数据库路径:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });

  // 查询官方API Key
  const apiKeyResult = db.prepare('SELECT value FROM system_config WHERE key = ?').get('official_api_key');
  console.log('\n📊 官方API Key:');
  if (apiKeyResult) {
    console.log('  ✅ 存在');
    console.log('  🔑 值:', apiKeyResult.value ? apiKeyResult.value.substring(0, 15) + '...' : 'NULL');
    console.log('  📏 长度:', apiKeyResult.value ? apiKeyResult.value.length : 0);
  } else {
    console.log('  ❌ 不存在');
  }

  // 查询其他配置
  const providerResult = db.prepare('SELECT value FROM system_config WHERE key = ?').get('official_provider');
  const modelResult = db.prepare('SELECT value FROM system_config WHERE key = ?').get('official_model');
  const limitResult = db.prepare('SELECT value FROM system_config WHERE key = ?').get('free_usage_limit');
  const initResult = db.prepare('SELECT value FROM system_config WHERE key = ?').get('official_config_initialized');

  console.log('\n📋 其他配置:');
  console.log('  🏢 提供商:', providerResult?.value || '未设置');
  console.log('  🤖 模型:', modelResult?.value || '未设置');
  console.log('  🔢 免费限制:', limitResult?.value || '未设置', '次');
  console.log('  ✅ 已初始化:', initResult?.value === 'true' ? '是' : '否');

  // 查询所有system_config
  console.log('\n📦 所有系统配置:');
  const allConfigs = db.prepare('SELECT key, value, description FROM system_config').all();
  allConfigs.forEach(config => {
    const value = config.key.includes('api_key') && config.value
      ? config.value.substring(0, 10) + '...'
      : config.value;
    console.log(`  ${config.key}: ${value}`);
  });

  db.close();
  console.log('\n✅ 检查完成');
} catch (error) {
  console.error('❌ 错误:', error.message);
}
