const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateWindowsIcon() {
  const inputPath = path.join(__dirname, '../build/icon.svg');
  const outputPath = path.join(__dirname, '../build/icon.ico');

  console.log('📝 正在生成 Windows 图标...');

  try {
    // 从 SVG 生成不同尺寸的 PNG
    const sizes = [256, 128, 64, 48, 32, 16];
    const pngBuffers = await Promise.all(
      sizes.map(size =>
        sharp(inputPath)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );

    // 简单的 ICO 文件生成（只包含一个 256x256 的 PNG）
    const png = pngBuffers[0];

    // ICO 文件头 (6 bytes)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type: 1 = ICO
    header.writeUInt16LE(1, 4); // Number of images

    // ICO 目录条目 (16 bytes)
    const entry = Buffer.alloc(16);
    entry.writeUInt8(0, 0); // Width (0 = 256)
    entry.writeUInt8(0, 1); // Height (0 = 256)
    entry.writeUInt8(0, 2); // Color count (0 = >256 colors)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(png.length, 8); // Size of image data
    entry.writeUInt32LE(22, 12); // Offset (6 + 16)

    // 组合 ICO 文件
    const icoBuffer = Buffer.concat([header, entry, png]);

    // 写入文件
    fs.writeFileSync(outputPath, icoBuffer);

    console.log('✅ Windows 图标生成成功:', outputPath);

    // 同时复制到 icons 目录
    const iconsDir = path.join(__dirname, '../build/icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);
    console.log('✅ 图标已复制到:', path.join(iconsDir, 'icon.ico'));

  } catch (error) {
    console.error('❌ 生成图标失败:', error.message);
    process.exit(1);
  }
}

generateWindowsIcon();
