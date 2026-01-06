const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const agent = require('./agent');

let mainWindow = null;
let agentInstance = null;

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
app.whenReady().then(() => {
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

// 获取用户数据目录
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

// 获取配置文件路径
ipcMain.handle('get-config-path', () => {
  return path.join(app.getPath('userData'), 'config.json');
});

// 获取记忆文件路径
ipcMain.handle('get-memory-file-path', () => {
  return path.join(app.getPath('userData'), 'lusun-memory.md');
});

// 读取配置
ipcMain.handle('read-config', async () => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // 返回默认配置
    return {
      modelProvider: 'anthropic',
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
      workDirectory: '',
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
    await agent.sendMessage(
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
    return { success: true, content: fullResponse };
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
  const { shell } = require('electron');
  try {
    await shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
