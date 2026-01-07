import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import InputArea from './components/InputArea';
import Header from './components/Header';
import Welcome from './components/Welcome';
import SettingsModal from './components/SettingsModal';
import FloatingGuide from './components/FloatingGuide';
import LoginModal from './components/LoginModal';
import GuestLimitModal from './components/GuestLimitModal';
import ToastModal from './components/ToastModal';
import AdminPanel from './components/AdminPanel';
import UpdateAvailableModal from './components/UpdateAvailableModal';
import UpdateDownloadedModal from './components/UpdateDownloadedModal';
import ForceUpdateModal from './components/ForceUpdateModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import {
  loadConversations as loadConversationsCloud,
  createConversation,
  createMessage,
  updateMessage as updateMessageCloud,
  deleteConversation as deleteConversationCloud,
  mergeGuestConversations
} from './lib/cloudService';
import './App.css';

function AppContent() {
  const auth = useAuth();
  const [config, setConfig] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFloatingGuide, setShowFloatingGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAgentReady, setIsAgentReady] = useState(false);
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [memoryContent, setMemoryContent] = useState('');
  const streamingMessageRef = useRef(null);

  // 使用 AuthContext 的用户状态
  const currentUser = auth.currentUser;
  const [guestStatus, setGuestStatus] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showForceUpdate, setShowForceUpdate] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(null); // { version }

  // 调试：监听 currentUser 变化
  useEffect(() => {
    console.log('🔍 [App] currentUser 状态变化:', currentUser?.phone || 'null');
  }, [currentUser]);

  // 登录用户的使用次数（本地存储，10次免费额度）
  const [userUsageCount, setUserUsageCount] = useState(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`user_usage_${currentUser.id}`);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  // 加载配置
  useEffect(() => {
    loadConfig();
    loadConversations();
    loadUserStatus();

    // 清理流式响应监听器
    return () => {
      window.electronAPI.removeMessageDeltaListener();
      window.electronAPI.removeGuestUsageUpdatedListener();
    };
  }, []);

  // 监听流式响应
  useEffect(() => {
    window.electronAPI.onMessageDelta(({ text, fullText }) => {
      if (streamingMessageRef.current) {
        streamingMessageRef.current(fullText);
      }
    });

    // 监听游客使用次数更新
    window.electronAPI.onGuestUsageUpdated((data) => {
      setGuestStatus((prev) => ({
        ...prev,
        usedCount: data.usedCount,
        remaining: data.remaining
      }));
    });
  }, []);

  // 监听自动更新事件
  useEffect(() => {
    window.electronAPI.onUpdateAvailable((data) => {
      if (data.forceUpdate) {
        // 强制更新
        setUpdateInfo(data);
        setShowForceUpdate(true);
      } else {
        // 普通更新，显示弹窗
        setUpdateInfo(data);
      }
    });

    // 监听下载完成事件
    window.electronAPI.onUpdateDownloaded((data) => {
      console.log('[更新] 下载完成:', data);
      setUpdateDownloaded(data);
      // 清除更新信息，避免重复显示
      setUpdateInfo(null);
    });

    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await window.electronAPI.readConfig();
      setConfig(savedConfig);

      // 加载全局提示和记忆文件
      await loadGlobalPromptAndMemory(savedConfig);

      // 检查是否是首次使用，显示悬浮球引导
      const firstTimeCheck = await window.electronAPI.isFirstTimeUser();
      if (firstTimeCheck.isFirstTime) {
        setShowFloatingGuide(true);
      }

      // 获取当前用户状态
      let userStatus = await window.electronAPI.getCurrentUser();

      // 如果没有用户状态，自动进入游客模式
      if (!userStatus) {
        await window.electronAPI.useGuestMode();
        userStatus = await window.electronAPI.getCurrentUser();
      }

      if (userStatus) {
        if (userStatus.isGuest) {
          // 游客模式
          setGuestStatus({
            canUse: userStatus.canUse,
            remaining: userStatus.remaining,
            usedCount: userStatus.usedCount
          });

          // 游客模式直接使用官方Key初始化Agent
          const result = await window.electronAPI.initAgent({
            modelProvider: 'zhipu', // 智谱GLM
            apiKey: '', // 游客模式不需要Key
            model: 'glm-4.7' // 使用旗舰模型
          });

          if (result.success) {
            setIsAgentReady(true);
          } else {
            console.error('Agent 初始化失败', result.error);
          }
        } else {
          // 登录用户
          setCurrentUser(userStatus.user);

          // 如果用户有API Key，初始化Agent
          if (userStatus.user.hasApiKey) {
            const result = await window.electronAPI.initAgent(savedConfig);
            if (result.success) {
              setIsAgentReady(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载用户状态
  const loadUserStatus = async () => {
    try {
      const guestStatusResult = await window.electronAPI.getGuestStatus();
      if (guestStatusResult.success) {
        setGuestStatus({
          canUse: guestStatusResult.canUse,
          remaining: guestStatusResult.remaining,
          usedCount: guestStatusResult.usedCount
        });
      }
    } catch (error) {
      console.error('加载用户状态失败:', error);
    }
  };

  // 处理登录成功
  const handleLoginSuccess = async (user) => {
    console.log('🎉 [App] 登录成功，开始初始化...');

    // 先登录，这会触发 currentUser 更新
    auth.login(user);
    setShowLoginModal(false);

    // 加载用户使用次数（从 localStorage）
    const savedUsage = localStorage.getItem(`user_usage_${user.id}`);
    setUserUsageCount(savedUsage ? parseInt(savedUsage, 10) : 0);

    // 重新初始化Agent
    const savedConfig = await window.electronAPI.readConfig();
    const result = await window.electronAPI.initAgent(savedConfig);
    if (result.success) {
      setIsAgentReady(true);
    }

    // 🔥 关键：合并游客对话到登录用户
    try {
      console.log('🔄 [App] 合并游客对话...');
      const mergeResult = await mergeGuestConversations(user.id);
      if (mergeResult.success) {
        console.log(`✅ [App] 成功合并 ${mergeResult.count} 个游客对话`);
      }
    } catch (error) {
      console.error('⚠️  [App] 合并游客对话失败（非致命）:', error);
      // 不阻塞登录流程，继续加载对话历史
    }

    // 直接调用云端加载，传递 user 对象（不依赖 currentUser 状态）
    try {
      console.log('📥 [App] 从云端加载对话历史...');
      const result = await loadConversationsCloud();
      if (result.success) {
        setConversations(result.data);
        console.log(`✅ [App] 成功加载 ${result.data.length} 个对话`);
      } else {
        console.error('❌ [App] 加载云端对话失败:', result.error);
        setConversations([]);
      }
    } catch (error) {
      console.error('❌ [App] 加载对话历史失败:', error);
      setConversations([]);
    }
  };

  // 处理退出登录
  const handleLogout = async () => {
    await auth.logout();
    await window.electronAPI.logout();
    setIsAgentReady(false);

    // 关闭设置弹窗
    setShowSettings(false);

    // 清空对话历史（退出登录后不保留）
    setConversations([]);
    setCurrentChatId(null);

    // 切换到游客模式
    await window.electronAPI.useGuestMode();
    const status = await loadUserStatus();

    // 重新初始化Agent
    const result = await window.electronAPI.initAgent({
      modelProvider: 'anthropic',
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022'
    });

    if (result.success) {
      setIsAgentReady(true);
    }
  };

  const loadConversations = async () => {
    try {
      // 如果用户已登录，从云端加载对话历史
      if (currentUser) {
        console.log('📥 [App] 从云端加载对话历史...');
        const result = await loadConversationsCloud();
        if (result.success) {
          setConversations(result.data);
          console.log(`✅ [App] 成功加载 ${result.data.length} 个对话`);
        } else {
          console.error('❌ [App] 加载云端对话失败:', result.error);
          setConversations([]);
        }
      } else {
        // 游客模式，不加载对话历史（或从本地加载）
        console.log('📥 [App] 游客模式，跳过对话历史加载');
        setConversations([]);
      }
    } catch (error) {
      console.error('❌ [App] 加载对话历史失败:', error);
      setConversations([]);
    }
  };

  const loadGlobalPromptAndMemory = async (config) => {
    // 读取全局提示文件
    if (config.globalPromptPath) {
      try {
        const result = await window.electronAPI.readFile(config.globalPromptPath);
        if (result.success) {
          setGlobalPrompt(result.content);
        }
      } catch (error) {
        console.error('读取全局提示文件失败:', error);
      }
    }

    // 读取记忆文件（自动路径，无需用户设置）
    try {
      const memoryPath = await window.electronAPI.getMemoryFilePath();
      const result = await window.electronAPI.readFile(memoryPath);
      if (result.success) {
        setMemoryContent(result.content);
      }
    } catch (error) {
      // 记忆文件不存在是正常的，不需要报错
      console.log('记忆文件尚未创建');
    }
  };

  const saveConversations = useCallback(async (updated) => {
    // 云端模式下，不再需要保存整个对话列表
    // 每个操作（创建/更新/删除）都会直接同步到云端
    setConversations(updated);
  }, []);

  const handleNewChat = () => {
    setCurrentChatId(null);
  };

  const handleSaveConfig = async (newConfig) => {
    try {
      await window.electronAPI.saveConfig(newConfig);
      setConfig(newConfig);

      // 加载全局提示和记忆文件
      await loadGlobalPromptAndMemory(newConfig);

      // 重新初始化 Agent
      if (newConfig.apiKey && newConfig.apiKey.trim() !== '') {
        const result = await window.electronAPI.initAgent(newConfig);
        console.log('Agent 初始化结果', result);
        if (result.success) {
          setIsAgentReady(true);
          setShowSettings(false);
        } else {
          alert('AI 初始化失败: ' + result.error);
        }
      } else {
        // 如果清空了 API Key，重置状态
        setIsAgentReady(false);
        setShowSettings(false);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败: ' + error.message);
    }
  };

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
  };

  const handleDeleteChat = async (chatId) => {
    try {
      // 从云端删除对话
      if (currentUser) {
        console.log('🗑️  [App] 删除对话:', chatId);
        const result = await deleteConversationCloud(chatId);
        if (!result.success) {
          console.error('❌ [App] 删除对话失败:', result.error);
          alert('删除对话失败: ' + result.error);
          return;
        }
        console.log('✅ [App] 对话删除成功');
      }

      // 更新本地状态
      const updated = conversations.filter((c) => c.id !== chatId);
      setConversations(updated);

      if (currentChatId === chatId) {
        setCurrentChatId(null);
      }
    } catch (error) {
      console.error('❌ [App] 删除对话异常:', error);
      alert('删除对话失败: ' + error.message);
    }
  };

  const updateMemoryFile = async (userMessage, assistantResponse) => {
    try {
      const memoryPath = await window.electronAPI.getMemoryFilePath();
      const timestamp = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      const newEntry = `\n## 对话记录 - ${timestamp}\n\n**用户**: ${userMessage}\n\n**AI**: ${assistantResponse.slice(0, 200)}${assistantResponse.length > 200 ? '...' : ''}\n`;

      // 读取当前记忆文件内容
      let currentMemory = memoryContent || '';

      // 更新记忆内容
      const updatedMemory = currentMemory + newEntry;

      // 保存到文件
      await window.electronAPI.writeFile(memoryPath, updatedMemory);

      // 更新状态
      setMemoryContent(updatedMemory);
    } catch (error) {
      console.error('更新记忆文件失败:', error);
    }
  };

  const handleSendMessage = async (content, files) => {
    // 检查游客使用次数
    if (!currentUser && guestStatus) {
      if (!guestStatus.canUse) {
        setShowGuestLimitModal(true);
        return;
      }
    }

    // 检查登录用户的使用次数（10次免费额度）
    if (currentUser) {
      const FREE_QUOTA = 10;
      const remaining = FREE_QUOTA - userUsageCount;

      if (!config?.apiKey) {
        // 未配置 API Key
        if (remaining <= 0) {
          // 10次免费额度已用完
          alert(`您的10次免费体验已用完。\n\n请配置自己的 API Key 继续使用。`);
          setShowSettings(true);
          return;
        }
        // 还有免费额度，允许使用（隐形规则，不提示）
      }
      // 已配置 API Key，无限制使用
    }

    if (!isAgentReady) {
      alert('AI 正在初始化中，请稍候...');
      return;
    }

    // 创建新对话或追加到现有对话
    let chat;
    let updated = [...conversations];
    let isNewConversation = false;

    if (!currentChatId) {
      // 创建新对话
      isNewConversation = true;
      chat = {
        id: Date.now().toString(),
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        createdAt: new Date().toISOString(),
        model: config?.model || 'claude-3-5-sonnet-20241022',
        messages: [],
      };
      updated.unshift(chat);
      setCurrentChatId(chat.id);

      // 同步到云端（游客和登录用户都保存）
      console.log('📝 [App] 创建新对话到云端:', chat.title);
      await createConversation(chat);
    } else {
      chat = updated.find((c) => c.id === currentChatId);
    }

    // 添加用户消息
    const userMessageId = Date.now().toString();
    const userMessage = { id: userMessageId, role: 'user', content, files };
    chat.messages.push(userMessage);

    // 同步用户消息到云端（游客和登录用户都保存）
    console.log('💬 [App] 保存用户消息到云端');
    await createMessage(chat.id, userMessage);

    // 创建 AI 消息占位符（带思考过程）
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const thinking = `🔍 **正在分析你的需求...**
• 理解问题类型和意图
• 识别关键信息点
• 确定需要的工具和资源

📚 **正在检索相关知识和上下文...**
• 查阅记忆文件中的历史对话
• 检索相关技能和经验
• 准备合适的解决方案

💡 **正在生成回复...**
• 构建清晰的结构化回答
• 添加实用的示例和代码
• 确保回复准确完整

⏰ **完成时间：${timestamp}**`;
    const aiMessageId = Date.now().toString() + '_ai';
    const aiMessage = { id: aiMessageId, role: 'assistant', content: '', thinking };
    chat.messages.push(aiMessage);

    // 先创建空的 AI 消息到云端（游客和登录用户都保存）
    console.log('💬 [App] 创建 AI 消息占位符到云端');
    await createMessage(chat.id, aiMessage);

    setConversations(updated);

    // 构建完整的消息内容（包含全局提示和记忆）
    let fullContent = content;
    if (globalPrompt || memoryContent) {
      fullContent = '';
      if (globalPrompt) {
        fullContent += `【全局设置】\n${globalPrompt}\n\n`;
      }
      if (memoryContent) {
        fullContent += `【记忆】\n${memoryContent}\n\n`;
      }
      fullContent += `【用户消息】\n${content}`;
    }

    // 设置流式响应回调
    let lastUpdateTime = Date.now();
    streamingMessageRef.current = (fullText) => {
      setConversations((prev) => {
        const newConversations = [...prev];
        const currentChat = newConversations.find((c) => c.id === chat.id);
        if (currentChat) {
          const lastMessage = currentChat.messages[currentChat.messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = fullText;

            // 每2秒更新一次云端（避免频繁请求）
            if (currentUser && Date.now() - lastUpdateTime > 2000) {
              lastUpdateTime = Date.now();
              updateMessageCloud(chat.id, aiMessageId, fullText).catch(err => {
                console.error('流式更新云端消息失败:', err);
              });
            }
          }
        }
        return newConversations;
      });
    };

    try {
      // 调用 Agent SDK 发送消息（传递完整内容）
      const result = await window.electronAPI.sendMessage(fullContent, files);

      if (result.success) {
        // 最终更新本地状态
        streamingMessageRef.current(result.content);

        // 最终更新云端消息（游客和登录用户都更新）
        console.log('💾 [App] 更新 AI 消息到云端');
        await updateMessageCloud(chat.id, aiMessageId, result.content);

        // 增加使用次数（仅登录用户且未配置 API Key 时）
        if (currentUser && !config?.apiKey) {
          const newCount = userUsageCount + 1;
          setUserUsageCount(newCount);
          localStorage.setItem(`user_usage_${currentUser.id}`, newCount.toString());
          console.log(`📊 [App] 用户使用次数: ${newCount}/10`);
        }

        // 自动更新记忆文件
        await updateMemoryFile(content, result.content);
      }
    } catch (error) {
      console.error('发送消息失败:', error);

      // 检查是否是频率限制错误
      const errorMessage = error.message || '';
      if (errorMessage.includes('1305') || errorMessage.includes('当前API请求过多') || errorMessage.includes('频率限制')) {
        setToast({
          message: '当前使用人数较多，请稍后尝试',
          type: 'error'
        });
      } else {
        // 其他错误显示alert
        alert('发送消息失败: ' + error.message);
      }

      // 移除 AI 消息占位符
      chat.messages.pop();
      await saveConversations([...conversations]);
    } finally {
      streamingMessageRef.current = null;
    }

    return chat;
  };

  if (isLoading) {
    return <div className="loading">加载中...</div>;
  }

  const currentChat = currentChatId
    ? conversations.find((c) => c.id === currentChatId)
    : null;

  console.log('App 渲染', { config, hasApiKey: !!config?.apiKey, isLoading });

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setShowSettings(true)}
        currentUser={currentUser}
        guestStatus={guestStatus}
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      <div className="main">
        <Header
          title={currentChat?.title || '新对话'}
          messages={currentChat?.messages || []}
          currentUser={currentUser}
          guestStatus={guestStatus}
          onOpenAdmin={() => setShowAdminPanel(true)}
        />

        <div className="content">
          {currentChat ? (
            <ChatArea messages={currentChat.messages} currentUser={currentUser} />
          ) : (
            <Welcome
              currentUser={currentUser}
              guestStatus={guestStatus}
              onLoginClick={() => setShowLoginModal(true)}
            />
          )}
        </div>

        <InputArea
          onSendMessage={handleSendMessage}
          hasApiKey={!!config?.apiKey}
          currentUser={currentUser}
          guestStatus={guestStatus}
          userUsageCount={userUsageCount}
          onLoginClick={() => setShowLoginModal(true)}
          onOpenSettings={() => {
            console.log('打开设置窗口');
            setShowSettings(true);
          }}
        />
      </div>

      {showSettings && (
        <SettingsModal
          config={config}
          currentUser={currentUser}
          onLogout={handleLogout}
          onSave={handleSaveConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {showGuestLimitModal && (
        <GuestLimitModal
          onClose={() => setShowGuestLimitModal(false)}
          onLogin={() => {
            setShowGuestLimitModal(false);
            setShowLoginModal(true);
          }}
        />
      )}

      {toast && (
        <ToastModal
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showFloatingGuide && <FloatingGuide />}

      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}

      {updateInfo && !showForceUpdate && (
        <UpdateAvailableModal
          version={updateInfo.version}
          releaseNotes={updateInfo.releaseNotes}
          onDownload={async () => {
            await window.electronAPI.downloadUpdate();
          }}
          onLater={() => setUpdateInfo(null)}
          onClose={() => setUpdateInfo(null)}
        />
      )}

      {showForceUpdate && updateInfo && (
        <ForceUpdateModal
          version={updateInfo.version}
          releaseNotes={updateInfo.releaseNotes}
        />
      )}

      {updateDownloaded && (
        <UpdateDownloadedModal
          version={updateDownloaded.version}
          onRestart={async () => {
            await window.electronAPI.installUpdate();
            setUpdateDownloaded(null);
          }}
          onLater={() => setUpdateDownloaded(null)}
        />
      )}
    </div>
  );
}

// 用 AuthProvider 包裹整个应用
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
