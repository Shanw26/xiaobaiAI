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
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  validatePath: (filePath) => ipcRenderer.invoke('validate-path', filePath),
  isFirstTimeUser: () => ipcRenderer.invoke('is-first-time-user'),

  // 用户信息和记忆（从数据库）
  getUserInfo: () => ipcRenderer.invoke('get-user-info'),
  saveUserInfo: (content) => ipcRenderer.invoke('save-user-info-content', content),
  getAiMemory: () => ipcRenderer.invoke('get-ai-memory'),
  saveAiMemory: (content) => ipcRenderer.invoke('save-ai-memory-content', content),
  getMemoryFilePath: () => ipcRenderer.invoke('get-memory-file-path'),

  // 对话历史管理
  saveConversations: (conversations) => ipcRenderer.invoke('save-conversations', conversations),
  loadConversations: () => ipcRenderer.invoke('load-conversations'),

  // 导出功能
  exportMarkdown: (messages, title) => ipcRenderer.invoke('export-markdown', messages, title),

  // AI Agent 功能
  initAgent: (config) => ipcRenderer.invoke('init-agent', config),
  reloadAgent: () => ipcRenderer.invoke('reload-agent'),  // 🔥 v2.11.7 新增：重新加载 Agent
  sendMessage: (conversationId, message, files) => ipcRenderer.invoke('send-message', conversationId, message, files),  // ✨ v2.10.1 修改：添加 conversationId
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
  syncLoginStatus: (user) => ipcRenderer.invoke('sync-login-status', user),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  updateUserApiKey: (apiKey) => ipcRenderer.invoke('update-user-api-key', apiKey),
  useGuestMode: () => ipcRenderer.invoke('use-guest-mode'),

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

  // ✨ v2.10.1 新增：监听消息完成事件（小红点提示）
  onMessageCompleted: (callback) => ipcRenderer.on('message-completed', (event, data) => callback(data)),
  removeMessageCompletedListener: () => ipcRenderer.removeAllListeners('message-completed'),

  // 监听游客使用次数更新
  onGuestUsageUpdated: (callback) => ipcRenderer.on('guest-usage-updated', (event, data) => callback(data)),
  removeGuestUsageUpdatedListener: () => ipcRenderer.removeAllListeners('guest-usage-updated'),

  // 🔥 新增：通知主进程窗口可以显示了（优化启动体验）
  readyToShow: () => ipcRenderer.send('ready-to-show'),

  // 平台信息
  platform: process.platform,
});
