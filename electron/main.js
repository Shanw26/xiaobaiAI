// 加载环境变量（必须在最前面）
require('dotenv').config();

const { app, BrowserWindow, ipcMain, dialog, shell, screen, powerSaveBlocker, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const agent = require('./agent');
const db = require('./database');
const officialConfig = require('./official-config');

// ==================== 安全的日志输出 ====================
// 检查流可写性，避免 EPIPE 错误
function safeLog(...args) {
  if (process.stdout.writable) {
    console.log(...args);
  }
}

function safeError(...args) {
  if (process.stderr.writable) {
    console.error(...args);
  }
}

// ✨ v2.10.7 修复：全局错误处理（延迟初始化，避免 app 未就绪时崩溃）
function setupGlobalErrorHandlers() {
  try {
    const userDataPath = app.getPath('userData');
    const errorLogPath = path.join(userDataPath, 'error.log');

    process.on('uncaughtException', (error) => {
      safeError('[致命错误] 未捕获的异常:', error);
      const errorMessage = `${new Date().toISOString()} - Uncaught Exception: ${error.message}\n${error.stack}\n\n`;
      fs.appendFile(errorLogPath, errorMessage).catch(() => {});
    });

    process.on('unhandledRejection', (reason, promise) => {
      safeError('[致命错误] 未处理的 Promise 拒绝:', reason);
      const errorMessage = `${new Date().toISOString()} - Unhandled Rejection: ${reason}\n\n`;
      fs.appendFile(errorLogPath, errorMessage).catch(() => {});
    });

    safeLog('[启动] 全局错误处理器已安装');
  } catch (error) {
    safeError('[启动] 安装错误处理器失败:', error.message);
  }
}

// 当前应用版本
const APP_VERSION = '2.10.15';
const VERSION_FILE = '.version';

let mainWindow = null;
let agentInstance = null; // 全局默认Agent（向后兼容）
const conversationAgents = new Map(); // 会话ID -> Agent实例（v2.10.1新增：支持并行任务）
let currentUser = null; // 当前登录用户
let isGuestMode = false; // 是否为游客模式

// 自动更新状态
let updateStatus = {
  available: false,
  forceUpdate: false,
  downloaded: false,
  downloading: false,
  error: null,
  version: null,
  releaseNotes: null
};
let powerSaveBlockId = null;

// 检查版本并清理旧数据
async function checkAndCleanOldData() {
  const userDataPath = app.getPath('userData');
  const versionFilePath = path.join(userDataPath, VERSION_FILE);

  try {
    // 读取保存的版本号
    const savedVersion = await fs.readFile(versionFilePath, 'utf-8');

    // 如果版本不匹配，清空所有数据
    if (savedVersion.trim() !== APP_VERSION) {
      safeLog(`版本升级：${savedVersion} -> ${APP_VERSION}，清空旧数据...`);

      // 删除所有文件和文件夹（除了版本文件会稍后重新创建）
      const files = await fs.readdir(userDataPath);

      for (const file of files) {
        const filePath = path.join(userDataPath, file);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isDirectory()) {
            await fs.rm(filePath, { recursive: true, force: true });
          } else {
            await fs.unlink(filePath);
          }
          safeLog(`已删除：${file}`);
        } catch (error) {
          safeError(`删除失败 ${file}:`, error.message);
        }
      }

      safeLog('旧数据清空完成');
    }
  } catch (error) {
    // 版本文件不存在，说明是首次安装
    safeLog('首次安装，无需清理旧数据');
  }

  // 写入当前版本号
  await fs.writeFile(versionFilePath, APP_VERSION, 'utf-8');
  safeLog(`当前版本：${APP_VERSION}`);
}

// ========== 自动更新功能 ==========

// 检查是否强制更新
function isForceUpdate(version, releaseNotes) {
  const forceKeywords = ['[强制]', '[force]', '[强制更新]'];
  const text = (releaseNotes || '') + ' ' + version;
  return forceKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
}

// 检查更新
async function checkForUpdates(isManual = false) {
  try {
    safeLog('[更新] 开始检查更新...');
    autoUpdater.autoDownload = false; // 手动控制下载

    const updateResult = await autoUpdater.checkForUpdates();

    if (!updateResult || updateResult.updateInfo.version === APP_VERSION) {
      safeLog('[更新] 当前已是最新版本');
      if (isManual) {
        mainWindow?.webContents.send('update-not-available', {
          version: APP_VERSION
        });
      }
      return null;
    }

    // 发现新版本
    const newVersion = updateResult.updateInfo.version;
    const releaseNotes = updateResult.updateInfo.releaseNotes;
    const forceUpdate = isForceUpdate(newVersion, releaseNotes);

    updateStatus = {
      available: true,
      forceUpdate,
      downloaded: false,
      downloading: false,
      error: null,
      version: newVersion,
      releaseNotes
    };

    safeLog(`[更新] 发现新版本: ${newVersion}, 强制更新: ${forceUpdate}`);

    // 通知前端
    mainWindow?.webContents.send('update-available', {
      version: newVersion,
      releaseNotes,
      forceUpdate
    });

    // 如果是强制更新，自动开始下载
    if (forceUpdate) {
      safeLog('[更新] 强制更新，开始自动下载...');
      await downloadUpdate();
    }

    return updateResult;
  } catch (error) {
    safeError('[更新] 检查更新失败:', error);
    updateStatus.error = error.message;
    mainWindow?.webContents.send('update-error', {
      error: error.message
    });
    return null;
  }
}

// 下载更新
async function downloadUpdate() {
  try {
    safeLog('[更新] 开始下载更新...');
    updateStatus.downloading = true;

    // 防止系统休眠
    if (powerSaveBlockId === null) {
      powerSaveBlockId = powerSaveBlocker.start('prevent-app-suspension');
      safeLog('[更新] 已阻止系统休眠');
    }

    await autoUpdater.downloadUpdate();

    updateStatus.downloading = false;
    updateStatus.downloaded = true;

    safeLog('[更新] 下载完成');

    // 释放电源阻止
    if (powerSaveBlockId !== null) {
      powerSaveBlocker.stop(powerSaveBlockId);
      powerSaveBlockId = null;
    }

    // 通知前端下载完成
    mainWindow?.webContents.send('update-downloaded', {
      version: updateStatus.version
    });

    return true;
  } catch (error) {
    safeError('[更新] 下载失败:', error);
    updateStatus.downloading = false;
    updateStatus.error = error.message;

    // 释放电源阻止
    if (powerSaveBlockId !== null) {
      powerSaveBlocker.stop(powerSaveBlockId);
      powerSaveBlockId = null;
    }

    mainWindow?.webContents.send('update-error', {
      error: error.message
    });

    return false;
  }
}

// 安装并重启
function installUpdate() {
  safeLog('[更新] 安装更新并重启...');

  // 确保所有窗口都关闭
  if (mainWindow) {
    mainWindow.removeAllListeners();
    // 不销毁窗口，让 electron-updater 处理
  }

  // 调用 quitAndInstall，应用会自动退出并安装更新
  // isSilent=false: 显示安装界面
  // isForceRunAfter=true: 安装完成后自动启动应用
  autoUpdater.quitAndInstall(false, true);
}

// 监听下载进度
autoUpdater.on('download-progress', (progress) => {
  const percent = Math.floor(progress.percent);
  const speed = Math.floor(progress.bytesPerSecond / 1024);
  const transferred = Math.floor(progress.transferred / 1024 / 1024);
  const total = Math.floor(progress.total / 1024 / 1024);

  safeLog(`[更新] 下载进度: ${percent}%, ${speed}KB/s, ${transferred}MB/${total}MB`);

  mainWindow?.webContents.send('update-progress', {
    percent,
    speed,
    transferred,
    total
  });
});

// ========== 自动更新功能结束 ==========

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 900,
    minHeight: 500,
    show: false, // 🔥 关键：先隐藏窗口，等待页面加载完成
    autoHideMenuBar: true, // ✨ v2.10.1 新增：Windows 上默认隐藏菜单栏，按 Alt 可显示
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
  });

  // 开发环境加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 🔥 Windows 修复：使用 loadURL + file:// 协议
    // loadFile 在 Windows 上可能有问题，使用 loadURL 更可靠
    const distPath = path.join(__dirname, '../dist/index.html');
    const absolutePath = path.resolve(distPath);

    safeLog('加载页面路径:', distPath);
    safeLog('绝对路径:', absolutePath);

    // Windows 路径需要特殊处理：C:\path\to\file.html -> file:///C:/path/to/file.html
    // Unix 路径：/path/to/file.html -> file:///path/to/file.html
    let fileUrl;
    if (process.platform === 'win32') {
      // Windows: 需要三个斜杠 + 盘符 + 路径（反斜杠转正斜杠）
      fileUrl = `file:///${absolutePath.replace(/\\/g, '/')}`;
    } else {
      // Unix/macOS: 需要三个斜杠 + 路径
      fileUrl = `file://${absolutePath}`;
    }

    safeLog('File URL:', fileUrl);

    // 使用 loadURL 而不是 loadFile（Windows 兼容性更好）
    mainWindow.loadURL(fileUrl).catch(err => {
      safeError('❌ 加载页面失败:', err);
      // 降级：尝试 loadFile
      safeLog('尝试降级方案：loadFile');
      mainWindow.loadFile(distPath);
    });
  }

  // 🔥 关键：页面加载完成后显示窗口，避免白屏
  mainWindow.once('ready-to-show', () => {
    safeLog('✅ 窗口准备完成，显示窗口');
    mainWindow.show();
    mainWindow.focus();
  });

  // 🔥 新增：监听页面加载失败，帮助诊断 Windows 白屏问题
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    safeError('❌ 页面加载失败:');
    safeError('  错误码:', errorCode);
    safeError('  错误描述:', errorDescription);
    safeError('  URL:', validatedURL);

    // 显示错误对话框
    dialog.showErrorBox(
      '页面加载失败',
      `无法加载页面\n\n错误: ${errorDescription}\nURL: ${validatedURL}\n\n请查看控制台了解详情`
    );
  });

  // 🔥 新增：监听渲染进程崩溃
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    safeError('❌ 渲染进程崩溃:');
    safeError('  原因:', details.reason);
    safeError('  退出码:', details.exitCode);

    // 显示错误对话框
    dialog.showErrorBox(
      '渲染进程崩溃',
      `应用渲染进程已崩溃\n\n原因: ${details.reason}\n退出码: ${details.exitCode}`
    );
  });

  // 🔥 新增：监听控制台消息（帮助调试）
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const logLevel = level === 0 ? 'ERROR' : level === 1 ? 'WARN' : 'INFO';
    safeLog(`[渲染进程 ${logLevel}] ${message}`);
    if (sourceId) {
      safeLog(`  来源: ${sourceId}:${line}`);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用准备就绪时创建窗口
app.whenReady().then(async () => {
  try {
    safeLog('='.repeat(60));
    safeLog(`[启动] 小白AI v${APP_VERSION} 正在启动...`);
    safeLog(`[启动] 平台: ${process.platform}`);
    safeLog(`[启动] 架构: ${process.arch}`);
    safeLog(`[启动] Electron: ${process.versions.electron}`);
    safeLog('='.repeat(60));

    // ✨ v2.10.7 修复：首先安装全局错误处理器
    setupGlobalErrorHandlers();

    // 检查版本并清理旧数据
    safeLog('[启动] 检查版本...');
    await checkAndCleanOldData();

    // 初始化数据库
    safeLog('[启动] 初始化数据库...');
    try {
      db.initDatabase();
      safeLog('[启动] ✓ 数据库初始化完成');
    } catch (error) {
      safeError('[启动] ✗ 数据库初始化失败:', error);
      throw new Error(`数据库初始化失败: ${error.message}`);
    }

    // 初始化官方配置到数据库（首次启动时）
    safeLog('[启动] 初始化官方配置...');
    try {
      await db.initOfficialConfig();
      safeLog('[启动] ✓ 官方配置初始化完成');
    } catch (error) {
      safeError('[启动] ✗ 官方配置初始化失败:', error);
      // 不抛出异常，允许应用继续启动（游客模式不可用）
    }

  // 定时清理过期验证码（每5分钟）
  setInterval(() => {
    db.cleanExpiredCodes();
  }, 5 * 60 * 1000);

  // ✨ v2.10.1 修复：隐藏 Windows 系统默认菜单栏（英文菜单）
  // Windows/Linux 上隐藏默认的 File、Edit、View 等英文菜单
  if (process.platform !== 'darwin') {
    try {
      Menu.setApplicationMenu(null);
      safeLog('[菜单] 已隐藏系统默认菜单栏（Windows/Linux）');
    } catch (error) {
      safeError('[菜单] 隐藏菜单栏失败:', error.message);
      // 不影响应用启动，继续执行
    }
  }

  createWindow();

  // 配置自动更新
  // 生产环境：使用阿里云 OSS（国内速度快）
  // 开发环境：使用 GitHub（方便测试）
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'Shanw26',
      repo: 'xiaobaiAI'
    });
    safeLog('[更新] 使用 GitHub 更新源（开发模式）');
  } else {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'https://xiaobai-ai-releases.oss-cn-hangzhou.aliyuncs.com/mac/'
    });
    safeLog('[更新] 使用阿里云 OSS 更新源（生产模式）');
  }

  // 启动时检查更新
  await checkForUpdates();

  // 定期检查更新（每24小时）
  setInterval(async () => {
    await checkForUpdates();
  }, 24 * 60 * 60 * 1000);

  // macOS 特性：点击 Dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  safeLog('='.repeat(60));
  safeLog('[启动] ✅ 启动流程完成');
  safeLog('='.repeat(60));
} catch (error) {
  safeError('[启动] ❌ 启动失败:', error);
  safeError('[启动] 错误堆栈:', error.stack);

  // 尝试写入错误到文件
  try {
    const userDataPath = app.getPath('userData');
    const errorLogPath = path.join(userDataPath, 'startup-error.log');
    const errorMessage = `${new Date().toISOString()} - Startup Failed: ${error.message}\n${error.stack}\n\n`;
    fs.appendFile(errorLogPath, errorMessage).catch(() => {});

    // 显示错误对话框
    dialog.showErrorBox(
      '小白AI 启动失败',
      `应用启动时发生错误：\n\n${error.message}\n\n错误信息已保存到：\n${errorLogPath}`
    );
  } catch (e) {
    // 如果连错误日志都写不了，就没办法了
  }

  // 退出应用
  app.quit();
}
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==================== IPC 通信处理 ====================

// 🔥 优化启动体验：前端通知窗口可以显示了
ipcMain.on('ready-to-show', () => {
  if (mainWindow && !mainWindow.isVisible()) {
    safeLog('✅ 收到前端就绪通知，显示窗口');
    mainWindow.show();
    mainWindow.focus();
  }
});

// 选择目录
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 选择文件
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
  });

  if (!result.canceled) {
    return result.filePaths;
  }
  return [];
});

// 读取文件内容
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 写入文件
ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 删除文件
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    // 检查文件/文件夹是否存在
    const stats = await fs.stat(filePath);

    // 删除文件或文件夹
    if (stats.isDirectory()) {
      await fs.rm(filePath, { recursive: true, force: true });
      safeLog('文件夹已删除:', filePath);
    } else {
      await fs.unlink(filePath);
      safeLog('文件已删除:', filePath);
    }

    return { success: true, filePath };
  } catch (error) {
    safeError('删除失败:', error);
    return { success: false, error: error.message };
  }
});

// 执行终端命令
ipcMain.handle('execute-command', async (event, command, options = {}) => {
  try {
    const { timeout = 30000, cwd = null } = options;

    safeLog('执行命令:', command);

    const execOptions = {
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    };

    if (cwd) {
      execOptions.cwd = cwd;
    }

    const { stdout, stderr } = await execPromise(command, execOptions);

    safeLog('命令执行成功');

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  } catch (error) {
    safeError('命令执行失败:', error);

    return {
      success: false,
      error: error.message,
      stdout: error.stdout ? error.stdout.trim() : '',
      stderr: error.stderr ? error.stderr.trim() : '',
    };
  }
});

// 获取配置文件路径
ipcMain.handle('get-config-path', () => {
  return path.join(app.getPath('userData'), 'config.json');
});

// 获取应用数据目录路径
ipcMain.handle('get-user-data-path', async () => {
  return app.getPath('userData');
});

// 获取用户信息内容（从数据库）
ipcMain.handle('get-user-info', async () => {
  try {
    const content = db.getUserInfo();
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 保存用户信息内容（到数据库）
ipcMain.handle('save-user-info-content', async (event, content) => {
  try {
    db.saveUserInfo(content);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取AI记忆内容（从数据库）
ipcMain.handle('get-ai-memory', async () => {
  try {
    const content = db.getAiMemory();
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 保存AI记忆内容（到数据库 + 本地文件）
ipcMain.handle('save-ai-memory-content', async (event, content) => {
  try {
    // v2.9.8 - 同时保存到数据库和本地文件

    // 1. 保存到本地数据库（用于备份）
    db.saveAiMemory(content);

    // 2. 保存到本地文件（用于 AI Agent 读取）
    const os = require('os');
    const path = require('path');
    const fs = require('fs').promises;
    const aiMemoryPath = path.join(os.homedir(), 'xiaobai-ai-memory.md');
    await fs.writeFile(aiMemoryPath, content, 'utf-8');
    safeLog('✓ AI记忆已保存到本地文件:', aiMemoryPath);

    return { success: true };
  } catch (error) {
    safeError('保存AI记忆失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取记忆文件路径
ipcMain.handle('get-memory-file-path', async () => {
  const os = require('os');
  const path = require('path');
  const memoryPath = path.join(os.homedir(), 'xiaobai-ai-memory.md');
  return memoryPath;
});

// 打开文件或目录
ipcMain.handle('open-path', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 验证路径是否存在（用于判断是否应该添加下划线）
ipcMain.handle('validate-path', async (event, filePath) => {
  try {
    // 展开用户目录 (~)
    let expandedPath = filePath;
    if (filePath.startsWith('~')) {
      expandedPath = filePath.replace('~', os.homedir());
    }

    // 检查路径是否存在
    await fs.access(expandedPath);
    return { exists: true, path: expandedPath };
  } catch (error) {
    // 路径不存在或无法访问
    return { exists: false, path: filePath };
  }
});

// 检查是否首次使用
ipcMain.handle('is-first-time-user', async () => {
  const userInfoPath = path.join(app.getPath('userData'), 'user-info.md');
  try {
    await fs.access(userInfoPath);
    return { isFirstTime: false };
  } catch {
    return { isFirstTime: true };
  }
});

// 保存用户信息
ipcMain.handle('save-user-info', async (event, userInfo) => {
  const userInfoPath = path.join(app.getPath('userData'), 'user-info.md');
  try {
    const now = new Date().toLocaleString('zh-CN');
    const content = `# User Information

> Last Updated: ${now}

## Basic Info
- Name: ${userInfo.name || ''}
- Occupation: ${userInfo.occupation || ''}
- Location: ${userInfo.location || ''}
- Bio: ${userInfo.bio || ''}

## Preferences
${userInfo.preferences ? `- ${userInfo.preferences}` : ''}
`;

    await fs.writeFile(userInfoPath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 读取配置
ipcMain.handle('read-config', async () => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // 返回默认配置（移除 workDirectory）
    return {
      modelProvider: 'anthropic',
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
    };
  }
});

// 保存配置
ipcMain.handle('save-config', async (event, config) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 保存对话历史
ipcMain.handle('save-conversations', async (event, conversations) => {
  const conversationsPath = path.join(app.getPath('userData'), 'conversations.json');
  try {
    await fs.writeFile(conversationsPath, JSON.stringify(conversations, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 读取对话历史
ipcMain.handle('load-conversations', async () => {
  const conversationsPath = path.join(app.getPath('userData'), 'conversations.json');
  try {
    const content = await fs.readFile(conversationsPath, 'utf-8');
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 导出对话为 Markdown
ipcMain.handle('export-markdown', async (event, messages, title) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${title || '对话记录'}.md`,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    let markdown = `# ${title || '对话记录'}\n\n`;
    markdown += `导出时间：${new Date().toLocaleString()}\n\n---\n\n`;

    for (const msg of messages) {
      const role = msg.role === 'user' ? '用户' : 'AI';
      markdown += `## ${role}\n\n${msg.content}\n\n`;
      if (msg.files && msg.files.length > 0) {
        markdown += `**附件**：\n`;
        msg.files.forEach(f => {
          markdown += `- ${f.name}\n`;
        });
        markdown += '\n';
      }
    }

    await fs.writeFile(result.filePath, markdown, 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== 用户系统 API ====================

// 获取设备ID
ipcMain.handle('get-device-id', async () => {
  try {
    const deviceId = db.getDeviceId();
    safeLog('设备ID:', deviceId);
    return { success: true, deviceId };
  } catch (error) {
    safeError('获取设备ID失败:', error);
    return { success: false, error: error.message };
  }
});

// 获取游客使用状态
ipcMain.handle('get-guest-status', async () => {
  try {
    const deviceId = db.getDeviceId();
    const status = db.canGuestUse(deviceId);

    safeLog('游客状态:', status);

    return {
      success: true,
      deviceId,
      canUse: status.canUse,
      remaining: status.remaining,
      usedCount: status.usedCount || 0,
      limit: officialConfig.freeUsageLimit
    };
  } catch (error) {
    safeError('获取游客状态失败:', error);
    return { success: false, error: error.message };
  }
});

// 发送验证码
ipcMain.handle('send-verification-code', async (event, phone) => {
  try {
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { success: false, error: '请输入正确的手机号' };
    }

    // 验证码由前端通过 Supabase Edge Function 发送
    // 这里只验证手机号格式
    safeLog('✅ 手机号格式验证通过:', phone);
    return { success: true, message: '验证码已发送' };
  } catch (error) {
    safeError('发送验证码失败:', error);
    return { success: false, error: error.message };
  }
});

// 登录/注册
ipcMain.handle('login-with-code', async (event, phone, code) => {
  try {
    // 验证验证码
    const verifyResult = db.verifyCode(phone, code);
    if (!verifyResult.valid) {
      return { success: false, error: verifyResult.error };
    }

    // 检查用户是否存在
    let user = db.getUserByPhone(phone);

    if (!user) {
      // 新用户，创建账号
      const createResult = db.createUser(phone);
      if (!createResult.success) {
        return createResult;
      }
      user = db.getUserByPhone(phone);
    }

    // 更新最后登录时间
    db.updateLastLogin(user.id);

    // 设置当前用户
    currentUser = user;
    isGuestMode = false;

    safeLog('用户登录成功:', user);

    return {
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        hasApiKey: !!user.api_key,
        totalRequests: user.total_requests
      }
    };
  } catch (error) {
    safeError('登录失败:', error);
    return { success: false, error: error.message };
  }
});

// 退出登录
ipcMain.handle('logout', async () => {
  currentUser = null;
  isGuestMode = false;

  // 重新初始化Agent
  agentInstance = null;

  safeLog('用户已退出登录');
  return { success: true };
});

// 获取当前用户信息
ipcMain.handle('get-current-user', async () => {
  if (isGuestMode) {
    const deviceId = db.getDeviceId();
    const status = db.canGuestUse(deviceId);

    return {
      isGuest: true,
      canUse: status.canUse,
      remaining: status.remaining,
      usedCount: status.usedCount || 0
    };
  }

  if (currentUser) {
    return {
      isGuest: false,
      user: {
        id: currentUser.id,
        phone: currentUser.phone,
        hasApiKey: !!currentUser.api_key,
        totalRequests: currentUser.total_requests
      }
    };
  }

  return null;
});

// 更新用户API Key
ipcMain.handle('update-user-api-key', async (event, apiKey) => {
  if (!currentUser) {
    return { success: false, error: '用户未登录' };
  }

  const result = db.updateUserApiKey(currentUser.id, apiKey);
  if (result.success) {
    // 更新当前用户信息
    currentUser = db.getUserById(currentUser.id);
  }

  return result;
});

// 使用游客模式
ipcMain.handle('use-guest-mode', async () => {
  const deviceId = db.getDeviceId();
  db.initGuestUsage(deviceId);

  isGuestMode = true;
  currentUser = null;

  safeLog('切换到游客模式');
  return { success: true };
});

safeLog('小白AI 后端启动成功！');

// ==================== AI Agent 功能 ====================

// 初始化 Agent
ipcMain.handle('init-agent', async (event, config) => {
  try {
    let apiKey = config.apiKey;
    let provider = config.modelProvider || 'anthropic';
    let model = config.model || officialConfig.defaultModel;

    // 游客模式：使用官方API Key
    if (isGuestMode) {
      const deviceId = db.getDeviceId();
      const guestStatus = db.canGuestUse(deviceId);

      if (!guestStatus.canUse) {
        return {
          success: false,
          error: '游客免费次数已用完，请登录后继续使用',
          needLogin: true
        };
      }

      apiKey = officialConfig.apiKey;
      safeLog('[游客模式] 使用官方API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NULL');

      // 双重检查：确保 API Key 存在
      if (!apiKey) {
        safeError('[游客模式] ❌ 官方API Key为空！');
        return {
          success: false,
          error: '系统配置错误：官方API Key未设置，请联系管理员',
          needLogin: false
        };
      }
      provider = officialConfig.provider; // 使用官方配置的provider
      model = officialConfig.defaultModel;
      safeLog('游客模式：使用官方API Key', { provider, model });
    }
    // 登录用户：使用用户自己的API Key（如果有）
    else if (currentUser && currentUser.api_key) {
      apiKey = currentUser.api_key;
      safeLog('登录用户：使用用户API Key');
    }

    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API Key 为空');
    }

    safeLog('开始初始化 Agent，配置:', {
      provider,
      hasApiKey: !!apiKey,
      isGuestMode,
      model,
    });

    // v2.9.1 - 已取消工作目录设置

    agentInstance = await agent.createAgent(
      provider,
      apiKey,
      model
    );

    safeLog('Agent 初始化成功');
    return { success: true };
  } catch (error) {
    safeError('初始化 Agent 失败:', error);
    return { success: false, error: error.message };
  }
});

// 发送消息（流式响应）
ipcMain.handle('send-message', async (event, conversationId, message, files) => {
  safeLog('收到发送消息请求:', { conversationId, message, hasFiles: files?.length > 0 });

  // ✨ v2.10.1 新增：为每个会话创建独立的Agent实例，支持并行任务
  let targetAgent = conversationAgents.get(conversationId);

  if (!targetAgent) {
    // 如果会话没有独立的Agent，使用全局Agent作为模板创建新的
    if (!agentInstance) {
      safeError('Agent 未初始化');
      throw new Error('Agent 未初始化，请先配置 API Key');
    }

    safeLog('为会话', conversationId, '创建独立的Agent实例');

    // 复制全局Agent的配置创建新实例
    targetAgent = await agent.createAgent(
      agentInstance.provider,
      agentInstance.apiKey,
      agentInstance.model
    );

    // 保存到Map中
    conversationAgents.set(conversationId, targetAgent);
    safeLog('✅ 会话Agent已创建，当前活跃会话数:', conversationAgents.size);
  }

  // 记录当前会话ID，用于后续通知
  const activeConversationId = conversationId;

  // 游客模式：先检查限制，再增加使用次数
  if (isGuestMode) {
    const deviceId = db.getDeviceId();

    // 🔥 关键修复：先检查是否超过限制
    const status = db.canGuestUse(deviceId);
    if (!status.canUse) {
      safeLog('❌ 游客免费次数已用完，拒绝发送消息');
      return {
        success: false,
        error: '游客免费次数已用完（10次），请登录后继续使用',
        needLogin: true,
        usedCount: status.usedCount,
        remaining: 0
      };
    }

    // 检查通过，增加使用次数
    db.incrementGuestUsage(deviceId);
    safeLog(`✅ 游客使用次数增加: ${status.usedCount + 1}/10`);

    // 通知前端更新剩余次数
    const newStatus = db.canGuestUse(deviceId);
    mainWindow.webContents.send('guest-usage-updated', {
      usedCount: newStatus.usedCount,
      remaining: newStatus.remaining
    });
  }
  // 登录用户：增加请求次数
  else if (currentUser) {
    db.incrementUserRequests(currentUser.id);
    safeLog('用户请求次数已更新');
  }

  // 准备文件信息（如果有的话）
  const fileInfos = [];
  if (files && files.length > 0) {
    for (const file of files) {
      try {
        const stats = await fs.stat(file.path);
        fileInfos.push({
          ...file,
          size: stats.size,
          type: getFileType(file.name),
        });
      } catch (error) {
        safeError('读取文件信息失败:', error);
      }
    }
  }

  let fullResponse = '';

  try {
    safeLog('开始发送消息到 Agent...');
    // 发送消息并获取流式响应
    const result = await agent.sendMessage(
      targetAgent,  // ✨ 使用会话独立的Agent
      message,
      fileInfos,
      ({ text, fullText }) => {
        // 流式回调：发送增量更新到渲染进程
        fullResponse = fullText;
        mainWindow.webContents.send('message-delta', {
          conversationId: activeConversationId,  // ✨ 添加会话ID
          text,
          fullText
        });
      }
    );

    safeLog('消息发送成功，响应长度:', fullResponse.length);

    // ✨ v2.10.1 新增：消息完成后通知前端（用于小红点提示）
    mainWindow.webContents.send('message-completed', {
      conversationId: activeConversationId,
      timestamp: Date.now()
    });
    safeLog('✅ 消息完成通知已发送:', activeConversationId);

    // 提取思考过程（v2.8.5 - 解析 ```thinking 代码块）
    let thinkingContent = null;
    let finalContent = result.text || fullResponse;

    // 检查是否包含思考代码块
    const thinkingRegex = /```思考\n([\s\S]*?)\n```/;
    const thinkingMatch = finalContent.match(thinkingRegex);

    if (thinkingMatch) {
      // 提取思考内容
      thinkingContent = thinkingMatch[1].trim();

      // 从最终内容中移除思考代码块
      finalContent = finalContent.replace(thinkingRegex, '').trim();

      safeLog('✅ 检测到思考过程，长度:', thinkingContent.length);
    }

    // 保存 token 使用记录
    if (result.inputTokens !== undefined && result.outputTokens !== undefined) {
      await saveTokenUsage(result.inputTokens, result.outputTokens);

      // 记录到数据库
      db.logRequest({
        userId: currentUser?.id || null,
        deviceId: isGuestMode ? db.getDeviceId() : null,
        model: targetAgent.model || officialConfig.defaultModel,  // ✨ 使用会话Agent的模型
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens
      });

      safeLog('Token 使用记录已保存:', {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens
      });
    }

    return {
      success: true,
      content: finalContent,
      thinking: thinkingContent  // v2.8.5 - 返回思考过程
    };
  } catch (error) {
    safeError('发送消息失败:', error);
    throw error;
  }
});

// 获取文件类型
function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
  const textExts = ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'py', 'json', 'csv', 'html', 'css'];

  if (imageExts.includes(ext)) return 'image/' + ext;
  if (textExts.includes(ext)) return 'text/plain';
  return 'application/octet-stream';
}

// 获取可用的模型提供商
ipcMain.handle('get-providers', () => {
  return agent.getProviders();
});

// 获取指定提供商的模型列表
ipcMain.handle('get-models', (event, providerId) => {
  return agent.getModels(providerId);
});

// 在系统文件管理器中打开文件
ipcMain.handle('open-in-explorer', async (event, filePath) => {
  try {
    await shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取token使用记录
ipcMain.handle('get-token-usage', async () => {
  const tokenPath = path.join(app.getPath('userData'), 'token-usage.json');
  try {
    const content = await fs.readFile(tokenPath, 'utf-8');
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    // 文件不存在，返回默认数据
    const defaultData = {
      totalTokens: 0,
      totalRequests: 0,
      dailyUsage: [],
    };
    return { success: true, data: defaultData };
  }
});

// 保存token使用记录
async function saveTokenUsage(inputTokens, outputTokens) {
  const tokenPath = path.join(app.getPath('userData'), 'token-usage.json');
  try {
    let data = {
      totalTokens: 0,
      totalRequests: 0,
      dailyUsage: [],
    };

    // 读取现有数据
    try {
      const content = await fs.readFile(tokenPath, 'utf-8');
      data = JSON.parse(content);
    } catch (err) {
      // 文件不存在，使用默认值
    }

    // 更新总计
    const totalTokens = inputTokens + outputTokens;
    data.totalTokens += totalTokens;
    data.totalRequests += 1;

    // 更新每日使用记录
    const today = new Date().toLocaleDateString('zh-CN');
    const todayEntry = data.dailyUsage.find(d => d.date === today);

    if (todayEntry) {
      todayEntry.inputTokens += inputTokens;
      todayEntry.outputTokens += outputTokens;
      todayEntry.totalTokens += totalTokens;
      todayEntry.requests += 1;
    } else {
      data.dailyUsage.push({
        date: today,
        inputTokens,
        outputTokens,
        totalTokens,
        requests: 1,
      });
    }

    // 只保留最近30天的记录
    data.dailyUsage = data.dailyUsage.slice(-30);

    // 保存文件
    await fs.writeFile(tokenPath, JSON.stringify(data, null, 2), 'utf-8');
    safeLog('Token使用记录已保存');
  } catch (error) {
    safeError('保存token使用记录失败:', error);
  }
}

// 截图功能
ipcMain.handle('capture-screen', async () => {
  try {
    // 隐藏主窗口，避免截到小白AI自己
    if (mainWindow) {
      mainWindow.minimize();
    }

    // 等待窗口最小化完成
    await new Promise(resolve => setTimeout(resolve, 300));

    // 生成临时文件路径
    const tmpDir = app.getPath('temp');
    const timestamp = Date.now();
    const filePath = path.join(tmpDir, `screenshot-${timestamp}.png`);

    // 使用系统截图命令（交互式）
    if (process.platform === 'darwin') {
      // macOS: 使用 -i 参数让用户选择区域
      // -i: 交互式模式（用户选择截图区域）
      // -r: 不显示声音
      await execPromise(`screencapture -i -r "${filePath}"`);
    } else if (process.platform === 'win32') {
      // Windows: 使用 Snipping Tool（截图工具）
      // 🔥 关键修复：Windows 10/11 自带截图工具
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing

        # 全屏截图
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bmp = New-Object System.Drawing.Bitmap $bounds.width, $bounds.height
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.size)

        # 保存到文件
        $bmp.Save('${filePath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
        $graphics.Dispose()
        $bmp.Dispose()
      `;
      await execPromise(`powershell -NoProfile -Command "${psScript.replace(/\n/g, '').replace(/\s+/g, ' ')}"`, {
        shell: 'powershell.exe',
        windowsHide: true
      });
    } else {
      // Linux: 需要安装 ImageMagick 或其他工具
      throw new Error('Linux 暂不支持截图功能，建议使用 macOS 或 Windows');
    }

    // 恢复窗口
    if (mainWindow) {
      mainWindow.restore();
      mainWindow.focus();
    }

    // 读取截图文件并转换为 base64
    const screenshotData = await fs.readFile(filePath);
    const base64 = `data:image/png;base64,${screenshotData.toString('base64')}`;

    safeLog('截图成功:', filePath);
    return { success: true, filePath, preview: base64 };
  } catch (error) {
    safeError('截图失败:', error);
    // 确保窗口恢复
    if (mainWindow) {
      mainWindow.restore();
      mainWindow.focus();
    }
    return { success: false, error: error.message, canceled: error.message.includes('cancelled') };
  }
});

// 保存截图到临时文件
ipcMain.handle('save-screenshot', async (event, imageDataUrl) => {
  try {
    const Buffer = require('buffer').Buffer;
    // 移除 data:image/png;base64, 前缀
    const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 保存到临时目录
    const tmpDir = app.getPath('temp');
    const timestamp = Date.now();
    const filePath = path.join(tmpDir, `screenshot-${timestamp}.png`);

    await fs.writeFile(filePath, buffer);
    safeLog('截图已保存:', filePath);
    return { success: true, filePath };
  } catch (error) {
    safeError('保存截图失败:', error);
    return { success: false, error: error.message };
  }
});

// ========== 自动更新 IPC 处理器 ==========

// 手动检查更新
ipcMain.handle('check-for-updates', async () => {
  return await checkForUpdates(true);
});

// 下载更新
ipcMain.handle('download-update', async () => {
  return await downloadUpdate();
});

// 安装更新
ipcMain.handle('install-update', () => {
  installUpdate();
});

// 获取更新状态
ipcMain.handle('get-update-status', () => {
  return updateStatus;
});

// ========== 自动更新 IPC 处理器结束 ==========
