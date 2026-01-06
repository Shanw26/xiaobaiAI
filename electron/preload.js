const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件选择
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFiles: () => ipcRenderer.invoke('select-files'),

  // 文件操作
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

  // 终端命令
  executeCommand: (command, options) => ipcRenderer.invoke('execute-command', command, options),

  // 配置管理
  readConfig: () => ipcRenderer.invoke('read-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),
  getUserInfoFilePath: () => ipcRenderer.invoke('get-user-info-file-path'),
  getMemoryFilePath: () => ipcRenderer.invoke('get-memory-file-path'),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  isFirstTimeUser: () => ipcRenderer.invoke('is-first-time-user'),
  saveUserInfo: (userInfo) => ipcRenderer.invoke('save-user-info', userInfo),

  // 对话历史管理
  saveConversations: (conversations) => ipcRenderer.invoke('save-conversations', conversations),
  loadConversations: () => ipcRenderer.invoke('load-conversations'),

  // 导出功能
  exportMarkdown: (messages, title) => ipcRenderer.invoke('export-markdown', messages, title),

  // AI Agent 功能
  initAgent: (config) => ipcRenderer.invoke('init-agent', config),
  sendMessage: (message, files) => ipcRenderer.invoke('send-message', message, files),
  getProviders: () => ipcRenderer.invoke('get-providers'),
  getModels: (providerId) => ipcRenderer.invoke('get-models', providerId),

  // 系统操作
  openInExplorer: (filePath) => ipcRenderer.invoke('open-in-explorer', filePath),

  // Token 使用统计
  getTokenUsage: () => ipcRenderer.invoke('get-token-usage'),

  // 截图功能
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  saveScreenshot: (imageDataUrl) => ipcRenderer.invoke('save-screenshot', imageDataUrl),

  // 监听流式响应
  onMessageDelta: (callback) => ipcRenderer.on('message-delta', (event, data) => callback(data)),
  removeMessageDeltaListener: () => ipcRenderer.removeAllListeners('message-delta'),

  // 平台信息
  platform: process.platform,
});
