const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const agent = require('./agent');

// 当前应用版本
const APP_VERSION = '2.0.0';
const VERSION_FILE = '.version';

let mainWindow = null;
let agentInstance = null;

// 检查版本并清理旧数据
async function checkAndCleanOldData() {
  const userDataPath = app.getPath('userData');
  const versionFilePath = path.join(userDataPath, VERSION_FILE);

  try {
    // 读取保存的版本号
    const savedVersion = await fs.readFile(versionFilePath, 'utf-8');

    // 如果版本不匹配，清空所有数据
    if (savedVersion.trim() !== APP_VERSION) {
      console.log(`版本升级：${savedVersion} -> ${APP_VERSION}，清空旧数据...`);

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
          console.log(`已删除：${file}`);
        } catch (error) {
          console.error(`删除失败 ${file}:`, error.message);
        }
      }

      console.log('旧数据清空完成');
    }
  } catch (error) {
    // 版本文件不存在，说明是首次安装
    console.log('首次安装，无需清理旧数据');
  }

  // 写入当前版本号
  await fs.writeFile(versionFilePath, APP_VERSION, 'utf-8');
  console.log(`当前版本：${APP_VERSION}`);
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 900,
    minHeight: 500,
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用准备就绪时创建窗口
app.whenReady().then(async () => {
  // 检查版本并清理旧数据
  await checkAndCleanOldData();

  createWindow();

  // macOS 特性：点击 Dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==================== IPC 通信处理 ====================

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
      console.log('文件夹已删除:', filePath);
    } else {
      await fs.unlink(filePath);
      console.log('文件已删除:', filePath);
    }

    return { success: true, filePath };
  } catch (error) {
    console.error('删除失败:', error);
    return { success: false, error: error.message };
  }
});

// 执行终端命令
ipcMain.handle('execute-command', async (event, command, options = {}) => {
  try {
    const { timeout = 30000, cwd = null } = options;

    console.log('执行命令:', command);

    const execOptions = {
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    };

    if (cwd) {
      execOptions.cwd = cwd;
    }

    const { stdout, stderr } = await execPromise(command, execOptions);

    console.log('命令执行成功');

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  } catch (error) {
    console.error('命令执行失败:', error);

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

// 获取用户信息文件路径（固定在 userData 目录）
ipcMain.handle('get-user-info-file-path', async () => {
  return path.join(app.getPath('userData'), 'user-info.md');
});

// 获取记忆文件路径（固定在 userData 目录）
ipcMain.handle('get-memory-file-path', async () => {
  return path.join(app.getPath('userData'), 'memory.md');
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

console.log('小白AI 后端启动成功！');

// ==================== AI Agent 功能 ====================

// 初始化 Agent
ipcMain.handle('init-agent', async (event, config) => {
  try {
    console.log('开始初始化 Agent，配置:', {
      provider: config.modelProvider,
      hasApiKey: !!config.apiKey,
      apiKeyLength: config.apiKey?.length,
      model: config.model,
    });

    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('API Key 为空');
    }

    // 设置工作目录为固定的 userData 目录
    agent.setWorkDirectory(app.getPath('userData'));

    agentInstance = await agent.createAgent(
      config.modelProvider,
      config.apiKey,
      config.model
    );

    console.log('Agent 初始化成功');
    return { success: true };
  } catch (error) {
    console.error('初始化 Agent 失败:', error);
    return { success: false, error: error.message };
  }
});

// 发送消息（流式响应）
ipcMain.handle('send-message', async (event, message, files) => {
  console.log('收到发送消息请求:', { message, hasFiles: files?.length > 0 });

  if (!agentInstance) {
    console.error('Agent 未初始化');
    throw new Error('Agent 未初始化，请先配置 API Key');
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
        console.error('读取文件信息失败:', error);
      }
    }
  }

  let fullResponse = '';

  try {
    console.log('开始发送消息到 Agent...');
    // 发送消息并获取流式响应
    const result = await agent.sendMessage(
      agentInstance,
      message,
      fileInfos,
      ({ text, fullText }) => {
        // 流式回调：发送增量更新到渲染进程
        fullResponse = fullText;
        mainWindow.webContents.send('message-delta', { text, fullText });
      }
    );

    console.log('消息发送成功，响应长度:', fullResponse.length);

    // 保存 token 使用记录
    if (result.inputTokens !== undefined && result.outputTokens !== undefined) {
      await saveTokenUsage(result.inputTokens, result.outputTokens);
      console.log('Token 使用记录已保存:', {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens
      });
    }

    return { success: true, content: result.text || fullResponse };
  } catch (error) {
    console.error('发送消息失败:', error);
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
    console.log('Token使用记录已保存');
  } catch (error) {
    console.error('保存token使用记录失败:', error);
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
      // Windows: 使用 PowerShell 截图工具
      throw new Error('Windows 暂不支持截图功能，建议使用 macOS');
    } else {
      // Linux: 需要安装 ImageMagick 或其他工具
      throw new Error('Linux 暂不支持截图功能，建议使用 macOS');
    }

    // 恢复窗口
    if (mainWindow) {
      mainWindow.restore();
      mainWindow.focus();
    }

    // 读取截图文件并转换为 base64
    const screenshotData = await fs.readFile(filePath);
    const base64 = `data:image/png;base64,${screenshotData.toString('base64')}`;

    console.log('截图成功:', filePath);
    return { success: true, filePath, preview: base64 };
  } catch (error) {
    console.error('截图失败:', error);
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
    console.log('截图已保存:', filePath);
    return { success: true, filePath };
  } catch (error) {
    console.error('保存截图失败:', error);
    return { success: false, error: error.message };
  }
});
