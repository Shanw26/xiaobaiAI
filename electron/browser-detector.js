/**
 * 浏览器检测模块 - 智能检测系统默认浏览器
 *
 * 功能：
 * - 自动检测系统默认浏览器
 * - 跨平台支持（macOS/Windows/Linux）
 * - 智能降级策略
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * 安全的日志记录
 */
function safeLog(...args) {
  try {
    if (process.stdout && process.stdout.writable) {
      console.log(...args);
    }
  } catch (error) {
    // 忽略
  }
}

function safeError(...args) {
  try {
    if (process.stderr && process.stderr.writable) {
      console.error(...args);
    }
  } catch (error) {
    // 忽略
  }
}

/**
 * 智能检测系统默认浏览器
 * @returns {Promise<string|null>} 浏览器 channel (chrome/msedge/webkit/firefox) 或 null
 */
async function detectDefaultBrowser() {
  const platform = process.platform;

  safeLog(`[浏览器检测] 当前平台: ${platform}`);

  let channel = null;

  if (platform === 'darwin') {
    channel = await detectMacOSBrowser();
  } else if (platform === 'win32') {
    channel = await detectWindowsBrowser();
  } else {
    channel = await detectLinuxBrowser();
  }

  if (channel) {
    safeLog(`[浏览器检测] 检测成功: ${getBrowserName(channel)} (${channel})`);
  } else {
    safeError('[浏览器检测] 未检测到支持的浏览器');
  }

  return channel;
}

/**
 * macOS 浏览器检测
 */
async function detectMacOSBrowser() {
  // 1. 尝试从系统设置读取默认浏览器
  try {
    const { stdout } = await execPromise(
      'defaults read com.apple.LaunchServices/com.apple.launchservices.secure 2>/dev/null'
    );

    // 解析输出查找默认浏览器
    if (stdout.includes('com.apple.Safari')) {
      safeLog('[浏览器检测] 检测到 Safari 为默认浏览器');
      return 'webkit';
    }
    if (stdout.includes('com.google.Chrome')) {
      safeLog('[浏览器检测] 检测到 Chrome 为默认浏览器');
      return 'chrome';
    }
    if (stdout.includes('com.microsoft.edgemac')) {
      safeLog('[浏览器检测] 检测到 Edge 为默认浏览器');
      return 'msedge';
    }
    if (stdout.includes('org.mozilla.firefox')) {
      safeLog('[浏览器检测] 检测到 Firefox 为默认浏览器');
      return 'firefox';
    }
  } catch (error) {
    safeLog('[浏览器检测] 无法从系统设置读取，尝试检测已安装浏览器');
  }

  // 2. 检查已安装的浏览器（按优先级：系统自带 → 常用 → 其他）
  const browsers = [
    // Safari 是 macOS 系统自带，优先使用
    { path: '/Applications/Safari.app', channel: 'webkit', name: 'Safari' },
    // Chrome 最常见
    { path: '/Applications/Google Chrome.app', channel: 'chrome', name: 'Chrome' },
    // Edge 在 Windows 用户中常见
    { path: '/Applications/Microsoft Edge.app', channel: 'msedge', name: 'Edge' },
    // Firefox
    { path: '/Applications/Firefox.app', channel: 'firefox', name: 'Firefox' },
  ];

  for (const browser of browsers) {
    try {
      await fs.access(browser.path);
      safeLog(`[浏览器检测] 找到已安装浏览器: ${browser.name}`);
      return browser.channel;
    } catch (error) {
      // 浏览器不存在，继续下一个
    }
  }

  // 3. 都没有，返回 null
  safeError('[浏览器检测] 未找到支持的浏览器');
  return null;
}

/**
 * Windows 浏览器检测
 */
async function detectWindowsBrowser() {
  // Windows 上常见的浏览器路径
  const browsers = [
    {
      path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      channel: 'chrome',
      name: 'Chrome'
    },
    {
      path: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      channel: 'chrome',
      name: 'Chrome (x86)'
    },
    {
      path: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      channel: 'msedge',
      name: 'Edge'
    },
    {
      path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      channel: 'msedge',
      name: 'Edge (x86)'
    },
    {
      path: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      channel: 'firefox',
      name: 'Firefox'
    },
    {
      path: 'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
      channel: 'firefox',
      name: 'Firefox (x86)'
    },
  ];

  for (const browser of browsers) {
    try {
      await fs.access(browser.path);
      safeLog(`[浏览器检测] 找到已安装浏览器: ${browser.name}`);
      return browser.channel;
    } catch (error) {
      // 继续下一个
    }
  }

  safeError('[浏览器检测] 未找到支持的浏览器');
  return null;
}

/**
 * Linux 浏览器检测
 */
async function detectLinuxBrowser() {
  const browsers = [
    { cmd: 'google-chrome', channel: 'chrome', name: 'Chrome' },
    { cmd: 'google-chrome-stable', channel: 'chrome', name: 'Chrome (Stable)' },
    { cmd: 'microsoft-edge', channel: 'msedge', name: 'Edge' },
    { cmd: 'microsoft-edge-stable', channel: 'msedge', name: 'Edge (Stable)' },
    { cmd: 'firefox', channel: 'firefox', name: 'Firefox' },
  ];

  for (const browser of browsers) {
    try {
      await execPromise(`which ${browser.cmd}`);
      safeLog(`[浏览器检测] 找到已安装浏览器: ${browser.name}`);
      return browser.channel;
    } catch (error) {
      // 继续下一个
    }
  }

  safeError('[浏览器检测] 未找到支持的浏览器');
  return null;
}

/**
 * 获取友好的浏览器名称
 */
function getBrowserName(channel) {
  const names = {
    'chrome': 'Google Chrome',
    'msedge': 'Microsoft Edge',
    'webkit': 'Safari',
    'firefox': 'Mozilla Firefox',
  };
  return names[channel] || channel;
}

/**
 * 获取支持的浏览器列表（用于错误提示）
 */
function getSupportedBrowsers() {
  const platform = process.platform;

  if (platform === 'darwin') {
    return [
      'Safari（系统自带）',
      'Google Chrome',
      'Microsoft Edge',
      'Mozilla Firefox',
    ];
  } else if (platform === 'win32') {
    return [
      'Google Chrome',
      'Microsoft Edge',
      'Mozilla Firefox',
    ];
  } else {
    return [
      'Google Chrome',
      'Microsoft Edge',
      'Mozilla Firefox',
    ];
  }
}

module.exports = {
  detectDefaultBrowser,
  getBrowserName,
  getSupportedBrowsers,
};
