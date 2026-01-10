/**
 * 小白AI文件解析器
 *
 * 支持的文件格式：
 * - 图片: PNG, JPG, JPEG, GIF, BMP, WebP (OCR 文字识别)
 * - 文档: PDF, Word (.docx), Excel (.xlsx, .xls)
 * - 文本: TXT, MD, JSON, CSV
 *
 * 跨平台兼容: Windows, macOS, Linux
 */

const fs = require('fs').promises;
const path = require('path');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

/**
 * 文件类型检测
 * @param {string} filePath - 文件路径
 * @returns {string} 文件类型 (image|pdf|word|excel|text|unknown)
 */
function detectFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const typeMap = {
    // 图片
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.gif': 'image',
    '.bmp': 'image',
    '.webp': 'image',
    // 文档
    '.pdf': 'pdf',
    '.docx': 'word',
    '.xlsx': 'excel',
    '.xls': 'excel',
    // 文本
    '.txt': 'text',
    '.md': 'text',
    '.json': 'text',
    '.csv': 'text',
  };
  return typeMap[ext] || 'unknown';
}

/**
 * OCR 图片文字识别
 * @param {string} filePath - 图片文件路径
 * @returns {Promise<string>} 识别的文字内容
 */
async function parseImage(filePath) {
  try {
    const imageBuffer = await fs.readFile(filePath);

    // 🔥 静默识别：不显示日志，后台处理
    const { data: { text } } = await Tesseract.recognize(
      imageBuffer,
      'chi_sim+eng', // 中英文混合识别
      {
        // 静默模式：不输出进度日志
        logger: () => {} // 空函数，不显示任何日志
      }
    );

    // 清理识别结果：移除多余空行
    const cleanText = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    return `[图片文字识别]\n${cleanText || '(未识别到文字)'}`;
  } catch (error) {
    throw new Error(`OCR 识别失败: ${error.message}`);
  }
}

/**
 * PDF 文档解析
 * @param {string} filePath - PDF 文件路径
 * @returns {Promise<string>} 提取的文本内容
 */
async function parsePDF(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);

    // 清理提取的文本
    const cleanText = data.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    return `[PDF 文档]\n页数: ${data.numpages}\n\n${cleanText}`;
  } catch (error) {
    throw new Error(`PDF 解析失败: ${error.message}`);
  }
}

/**
 * Word 文档解析 (.docx)
 * @param {string} filePath - Word 文件路径
 * @returns {Promise<string>} 提取的文本内容
 */
async function parseWord(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });

    // 清理提取的文本
    const cleanText = result.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    return `[Word 文档]\n\n${cleanText}`;
  } catch (error) {
    throw new Error(`Word 解析失败: ${error.message}`);
  }
}

/**
 * Excel 工作簿解析 (.xlsx, .xls)
 * @param {string} filePath - Excel 文件路径
 * @returns {Promise<string>} 提取的表格内容
 */
async function parseExcel(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const markdown = [];

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      markdown.push(`\n## 工作表: ${sheetName}\n\`\`\`\n${csv}\n\`\`\`\n`);
    });

    return `[Excel 工作簿]\n共 ${workbook.SheetNames.length} 个工作表\n${markdown.join('\n')}`;
  } catch (error) {
    throw new Error(`Excel 解析失败: ${error.message}`);
  }
}

/**
 * 文本文件解析
 * @param {string} filePath - 文本文件路径
 * @returns {Promise<string>} 文件内容
 */
async function parseText(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return `[文本文件]\n\n${content}`;
  } catch (error) {
    throw new Error(`文本文件读取失败: ${error.message}`);
  }
}

/**
 * 文件解析主入口
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 解析后的文本内容
 */
async function parseFile(filePath) {
  // 1. 检查文件是否存在
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new Error('文件不存在，请检查路径');
  }

  // 2. 检测文件类型
  const fileType = detectFileType(filePath);

  if (fileType === 'unknown') {
    const ext = path.extname(filePath);
    throw new Error(`不支持的文件格式: ${ext}`);
  }

  // 3. 根据类型解析
  try {
    switch (fileType) {
      case 'image':
        return await parseImage(filePath);
      case 'pdf':
        return await parsePDF(filePath);
      case 'word':
        return await parseWord(filePath);
      case 'excel':
        return await parseExcel(filePath);
      case 'text':
        return await parseText(filePath);
      default:
        throw new Error(`未实现的文件类型: ${fileType}`);
    }
  } catch (error) {
    // 重新抛出，让调用方处理
    throw error;
  }
}

module.exports = {
  parseFile,
  detectFileType,
  parseImage,
  parsePDF,
  parseWord,
  parseExcel,
  parseText,
};
