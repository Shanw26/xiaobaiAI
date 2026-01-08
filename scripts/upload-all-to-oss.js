/**
 * 批量上传安装包到阿里云 OSS
 * 支持上传 GitHub Actions 下载的所有安装包
 */

const fs = require('fs');
const path = require('path');
const OSS = require('ali-oss');

// 从环境变量或本地配置读取
const client = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET || 'xiaobai-ai',
});

/**
 * 上传单个文件到 OSS
 */
async function uploadFile(filePath, subDir = '') {
  const fileName = path.basename(filePath);
  const objectKey = subDir
    ? `releases/${subDir}/${fileName}`
    : `releases/${fileName}`;

  console.log(`\n📤 上传: ${fileName}`);

  try {
    const result = await client.put(objectKey, filePath);

    console.log(`✅ 上传成功!`);
    console.log(`   文件名: ${fileName}`);
    console.log(`   大小: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   下载链接: ${result.url}`);

    return {
      success: true,
      fileName,
      url: result.url,
      size: fs.statSync(filePath).size
    };
  } catch (error) {
    console.error(`❌ 上传失败: ${fileName}`);
    console.error(`   错误: ${error.message}`);
    return {
      success: false,
      fileName,
      error: error.message
    };
  }
}

/**
 * 批量上传目录中的所有安装包
 */
async function uploadDirectory(directory, options = {}) {
  const {
    recursive = false,
    platform = null, // 'windows', 'macos', 'linux', or null for all
    version = null   // version filter (e.g., '2.10.13')
  } = options;

  console.log('='.repeat(60));
  console.log('🚀 开始批量上传安装包到阿里云 OSS');
  console.log('='.repeat(60));

  if (!fs.existsSync(directory)) {
    console.error(`❌ 目录不存在: ${directory}`);
    return [];
  }

  const results = [];
  let totalFiles = 0;
  let successCount = 0;
  let failCount = 0;
  let totalSize = 0;

  // 遍历目录
  function walkDir(dir, subDir = '') {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && recursive) {
        walkDir(fullPath, path.join(subDir, file));
      } else if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        const baseName = path.basename(file, ext);

        // 检查是否是安装包文件
        const isInstaller =
          ext === '.exe' ||
          ext === '.dmg' ||
          ext === '.zip' ||
          ext === '.appimage' ||
          (baseName.endsWith('Setup') && ext === '.exe');

        if (!isInstaller) return;

        // 平台过滤
        if (platform) {
          const isWindows = file.includes('Setup') || ext === '.exe';
          const isMacOS = ext === '.dmg' || (file.includes('.mac') && ext === '.zip');
          const isLinux = ext === '.appimage' || ext === '.deb' || ext === '.rpm';

          if (platform === 'windows' && !isWindows) return;
          if (platform === 'macos' && !isMacOS) return;
          if (platform === 'linux' && !isLinux) return;
        }

        // 版本过滤
        if (version && !file.includes(version)) return;

        totalFiles++;
        const fileSize = stat.size;
        totalSize += fileSize;

        console.log(`\n[${totalFiles}] 发现文件: ${file} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

        // 上传文件
        const result = await uploadFile(fullPath, subDir);
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }
  }

  walkDir(directory);

  // 打印统计
  console.log('\n' + '='.repeat(60));
  console.log('📊 上传统计');
  console.log('='.repeat(60));
  console.log(`总文件数: ${totalFiles}`);
  console.log(`成功: ${successCount}`);
  console.log(`失败: ${failCount}`);
  console.log(`总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log('='.repeat(60));

  // 生成汇总报告
  const reportPath = path.join(directory, 'upload-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalFiles,
    successCount,
    failCount,
    totalSize,
    results: results.map(r => ({
      fileName: r.fileName,
      success: r.success,
      url: r.url,
      size: r.size,
      error: r.error
    }))
  }, null, 2));

  console.log(`\n📄 上传报告已保存: ${reportPath}`);

  return results;
}

/**
 * 从命令行参数运行
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
📦 批量上传安装包到阿里云 OSS

使用方法:
  node scripts/upload-all-to-oss.js <目录> [选项]

参数:
  目录              包含安装包的目录路径

选项:
  --platform        平台过滤 (windows/macos/linux)
  --version         版本过滤 (例如: 2.10.13)
  --recursive       递归遍历子目录
  --help            显示帮助信息

示例:
  # 上传本地 release 目录
  node scripts/upload-all-to-oss.js release

  # 上传 GitHub Actions 下载的所有文件
  node scripts/upload-all-to-oss.js ~/Downloads/artifacts --recursive

  # 只上传 Windows 版本
  node scripts/upload-all-to-oss.js release --platform=windows

  # 上传特定版本
  node scripts/upload-all-to-oss.js release --version=2.10.13

  # 从 GitHub Actions 上传所有平台
  node scripts/upload-all-to-oss.js artifacts --recursive
    `);
    return;
  }

  const directory = args[0];
  const options = {
    recursive: args.includes('--recursive'),
    platform: null,
    version: null
  };

  // 解析选项
  for (const arg of args) {
    if (arg.startsWith('--platform=')) {
      options.platform = arg.split('=')[1];
    } else if (arg.startsWith('--version=')) {
      options.version = arg.split('=')[1];
    }
  }

  await uploadDirectory(directory, options);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 上传失败:', error);
    process.exit(1);
  });
}

module.exports = { uploadFile, uploadDirectory };
