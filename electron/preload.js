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

  // 用户系统
  getGuestStatus: () => ipcRenderer.invoke('get-guest-status'),
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  sendVerificationCode: (phone) => ipcRenderer.invoke('send-verification-code', phone),
  loginWithCode: (phone, code) => ipcRenderer.invoke('login-with-code', phone, code),
  logout: () => ipcRenderer.invoke('logout'),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  updateUserApiKey: (apiKey) => ipcRenderer.invoke('update-user-api-key', apiKey),
  useGuestMode: () => ipcRenderer.invoke('use-guest-mode'),

  // 后台管理
  adminGetUsers: () => ipcRenderer.invoke('admin-get-users'),
  adminGetStats: () => ipcRenderer.invoke('admin-get-stats'),
  adminGetUserDetail: (userId) => ipcRenderer.invoke('admin-get-user-detail', userId),

  // 自动更新
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),

  // 监听更新事件
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, data) => callback(data)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, data) => callback(data)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, data) => callback(data)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (event, data) => callback(data)),
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-progress');
    ipcRenderer.removeAllListeners('update-error');
    ipcRenderer.removeAllListeners('update-not-available');
  },

  // 监听流式响应
  onMessageDelta: (callback) => ipcRenderer.on('message-delta', (event, data) => callback(data)),
  removeMessageDeltaListener: () => ipcRenderer.removeAllListeners('message-delta'),

  // 监听游客使用次数更新
  onGuestUsageUpdated: (callback) => ipcRenderer.on('guest-usage-updated', (event, data) => callback(data)),
  removeGuestUsageUpdatedListener: () => ipcRenderer.removeAllListeners('guest-usage-updated'),

  // 平台信息
  platform: process.platform,
});
