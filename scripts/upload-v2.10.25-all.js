const OSS = require('ali-oss');
const fs = require('fs');

const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
  bucket: 'xiaobai-ai-releases',
  timeout: 600000,
});

async function uploadV2_10_25_All() {
  try {
    // 文件信息
    const files = [
      {
        path: 'release/mac/小白AI-2.10.25-x64.dmg',
        name: '小白AI-2.10.25-x64.dmg',
        hash: '9031372afcada1deaf4375ddd583615a9b5a2867b2ebb8ce7a35c332507d8e093f70d3ffc51921def1fc5c3c1485df43af65cbb29b2f4440dd862c2e5b5ff06b'
      },
      {
        path: 'release/mac-arm64/小白AI-2.10.25-arm64.dmg',
        name: '小白AI-2.10.25-arm64.dmg',
        hash: '442d69d34bc6a7f689d729df2acf5948757d7637735378dfc512110e190e1edd0a36758c453871f82f2c626808d7ea6e3d8848213271fa0a21b90a708363d42b'
      }
    ];

    // 上传两个 DMG 文件
    for (const file of files) {
      console.log(`开始上传 ${file.name}...`);
      const stats = fs.statSync(file.path);
      const size = stats.size;

      const result = await client.put(`releases/${file.name}`, file.path);
      console.log(`✅ ${file.name} 上传成功! (${(size / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`📍 下载地址: ${result.url}`);
      console.log('');
    }

    // 创建更新配置（包含两个架构）
    const updateConfig = `version: 2.10.25
files:
  - url: https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/releases/小白AI-2.10.25-x64.dmg
    sha512: 9031372afcada1deaf4375ddd583615a9b5a2867b2ebb8ce7a35c332507d8e093f70d3ffc51921def1fc5c3c1485df43af65cbb29b2f4440dd862c2e5b5ff06b
    size: 444850176
  - url: https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/releases/小白AI-2.10.25-arm64.dmg
    sha512: 442d69d34bc6a7f689d729df2acf5948757d7637735378dfc512110e190e1edd0a36758c453871f82f2c626808d7ea6e3d8848213271fa0a21b90a708363d42b
    size: 436056084
path: https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/
sha512: 9031372afcada1deaf4375ddd583615a9b5a2867b2ebb8ce7a35c332507d8e093f70d3ffc51921def1fc5c3c1485df43af65cbb29b2f4440dd862c2e5b5ff06b
releaseNotes: |
  ## ✨ v2.10.25 - 双架构版本发布

  ### 🎉 新功能
  - **同时支持 Intel (x64) 和 Apple Silicon (ARM64) Mac**
  - 优化更新流程和弹窗样式
  - 修复强制更新相关问题

  ### 🐛 核心修复
  - 修复下载完成后弹窗自动关闭的问题
  - 下载完成后自动隐藏进度条
  - 弹窗保持显示直到用户点击"立即重启并安装"

  ### 🎨 样式优化
  - 优化弹窗高度和间距，更紧凑美观
  - 调整字体大小，提升阅读体验
  - 下载完成后界面更简洁

  ### 📦 更新说明
  应用会自动识别您的 Mac 架构并下载对应的安装包。
  Intel Mac 下载 x64 版本，Apple Silicon Mac 下载 ARM64 版本。

  更新流程：
  1. 点击"立即更新"开始下载
  2. 显示下载进度
  3. 下载完成后点击"立即重启并安装"
  4. 应用会自动退出并安装新版本
`;

    fs.writeFileSync('release/latest-mac.yml', updateConfig);

    console.log('上传更新配置到根目录...');
    await client.put('latest-mac.yml', 'release/latest-mac.yml');
    console.log('✅ 根目录配置上传成功!');

    console.log('上传更新配置到 /mac/ 目录...');
    await client.put('mac/latest-mac.yml', 'release/latest-mac.yml');
    console.log('✅ /mac/ 目录配置上传成功!');
    console.log('');

    console.log('📱 v2.10.25 已部署！');
    console.log('🔗 更新配置地址:');
    console.log('https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/latest-mac.yml');
    console.log('');
    console.log('📦 包含文件:');
    console.log('  - 小白AI-2.10.25-x64.dmg (Intel Mac)');
    console.log('  - 小白AI-2.10.25-arm64.dmg (Apple Silicon Mac)');
  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    throw error;
  }
}

uploadV2_10_25_All().catch(console.error);
