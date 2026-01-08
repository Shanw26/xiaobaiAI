#!/usr/bin/env node

/**
 * 🔒 安全检查脚本
 * 检查是否有文件违规导入了 supabaseAdmin
 */

const fs = require('fs');
const path = require('path');

// 允许的文件列表（可以使用 supabaseAdmin）
const ALLOWED_FILES = [
  'src/lib/cloudService.js',
  'src/lib/supabaseClient.js'
];

// 需要检查的目录
const CHECK_DIRS = [
  'src/components',
  'src/pages',
  'src/hooks',
  'src/utils'
];

let hasViolations = false;

/**
 * 检查文件是否导入了 supabaseAdmin
 */
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 检查是否导入了 supabaseAdmin 或 supabaseServiceKey
    const violations = [];

    // 检查 import 语句
    const importPatterns = [
      /import\s*{[^}]*supabaseAdmin[^}]*}\s*from\s*['"`].*supabaseClient['"`]/,
      /import\s*{[^}]*supabaseServiceKey[^}]*}\s*from\s*['"`].*supabaseClient['"`]/,
      /import\s*\*\s*as\s+\w+\s+from\s*['"`].*supabaseClient['"`]/,  // import * as ns from
    ];

    for (const pattern of importPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        violations.push(matches[0]);
      }
    }

    // 检查 require 语句（如果有）
    const requirePatterns = [
      /require\(['"`].*supabaseClient['"`]\)\.supabaseAdmin/,
      /require\(['"`].*supabaseClient['"`]\)\.supabaseServiceKey/,
    ];

    for (const pattern of requirePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        violations.push(matches[0]);
      }
    }

    if (violations.length > 0) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.error(`\n🔴 发现安全违规：${relativePath}`);
      console.error('   违规代码：');
      violations.forEach(v => {
        console.error(`   - ${v}`);
      });
      hasViolations = true;
    }
  } catch (error) {
    // 忽略读取错误（可能是目录、二进制文件等）
  }
}

/**
 * 递归检查目录
 */
function checkDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // 递归检查子目录
      checkDirectory(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      // 检查文件
      const relativePath = path.relative(process.cwd(), fullPath);

      // 跳过允许的文件
      if (!ALLOWED_FILES.includes(relativePath)) {
        checkFile(fullPath);
      }
    }
  }
}

// 主函数
function main() {
  console.log('🔒 安全检查：检查 supabaseAdmin 违规导入');
  console.log('═'.repeat(60));

  CHECK_DIRS.forEach(dir => {
    const fullPath = path.resolve(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      console.log(`\n📂 检查目录：${dir}`);
      checkDirectory(fullPath);
    } else {
      console.log(`\n⚠️  目录不存在：${dir}`);
    }
  });

  console.log('\n' + '═'.repeat(60));

  if (hasViolations) {
    console.error('\n❌ 安全检查失败！发现违规导入 supabaseAdmin 的文件。');
    console.error('\n修复建议：');
    console.error('  1. 删除违规的导入语句');
    console.error('  2. 使用 supabase（Anon Key）代替');
    console.error('  3. 或者通过 Electron IPC 调用');
    console.error('\n📖 文档：docs/02-login-system.md');
    process.exit(1);
  } else {
    console.log('\n✅ 安全检查通过！未发现违规导入。');
    process.exit(0);
  }
}

main();
