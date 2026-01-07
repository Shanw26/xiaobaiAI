import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import InputArea from './components/InputArea';
import Header from './components/Header';
import Welcome from './components/Welcome';
import SettingsModal from './components/SettingsModal';
import StartupScreen from './components/StartupScreen';
import FloatingGuide from './components/FloatingGuide';
import LoginModal from './components/LoginModal';
import GuestLimitModal from './components/GuestLimitModal';
import ToastModal from './components/ToastModal';
import UpdateAvailableModal from './components/UpdateAvailableModal';
import UpdateDownloadedModal from './components/UpdateDownloadedModal';
import ForceUpdateModal from './components/ForceUpdateModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { showAlert } from './lib/alertService';
import {
  loadConversations as loadConversationsCloud,
  createConversation,
  createMessage,
  updateMessage as updateMessageCloud,
  deleteConversation as deleteConversationCloud,
  mergeGuestConversations,
  mergeGuestUserInfo,
  mergeGuestAiMemory,
  getUserUsageCount,
  incrementUserUsage,
  saveUserInfo,
  saveAiMemory
} from './lib/cloudService';
import './App.css';

function AppContent() {
  const auth = useAuth();
  const [config, setConfig] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFloatingGuide, setShowFloatingGuide] = useState(false);
  const [showStartup, setShowStartup] = useState(true);
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
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showForceUpdate, setShowForceUpdate] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(null); // { version }

  // 等待指示器状态（v2.8.7 - 添加 duration）
  const [waitingIndicator, setWaitingIndicator] = useState({
    show: false,
    type: 'thinking', // thinking, reading, searching, network
    details: {},
    duration: 0, // 任务执行时长（秒）
  });
  const waitingTimerRef = useRef(null);
  const waitingStartTimeRef = useRef(null);

  // 调试：监听 currentUser 变化
  useEffect(() => {
    console.log('🔍 [App] currentUser 状态变化:', currentUser?.phone || 'null');
  }, [currentUser]);

  // 登录用户的使用次数（从云端读取，10次免费额度）
  const [userUsageCount, setUserUsageCount] = useState(0);

  // 当用户登录时，从云端加载使用次数
  useEffect(() => {
    if (currentUser) {
      loadUserUsageCount();
    } else {
      setUserUsageCount(0);
    }
  }, [currentUser]);

  // 从云端加载用户使用次数
  const loadUserUsageCount = async () => {
    try {
      const result = await getUserUsageCount();
      if (result.success) {
        setUserUsageCount(result.usedCount);
        console.log(`✅ [App] 云端使用次数: ${result.usedCount}`);
      } else {
        console.error('❌ [App] 获取使用次数失败:', result.error);
      }
    } catch (error) {
      console.error('❌ [App] 加载使用次数异常:', error);
    }
  };

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

  // ========== 等待指示器管理（v2.8.7 - 添加 duration 更新）==========

  // v2.8.7 - 定期更新任务时长
  useEffect(() => {
    let durationUpdateTimer;

    if (waitingIndicator.show && waitingStartTimeRef.current) {
      // 每秒更新一次 duration
      durationUpdateTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - waitingStartTimeRef.current) / 1000);
        setWaitingIndicator(prev => ({
          ...prev,
          duration: elapsed
        }));
      }, 1000);
    }

    return () => {
      if (durationUpdateTimer) {
        clearInterval(durationUpdateTimer);
      }
    };
  }, [waitingIndicator.show]);

  // 显示等待指示器
  const showWaitingIndicator = (type = 'thinking', details = {}) => {
    setWaitingIndicator({ show: true, type, details, duration: 0 });
    waitingStartTimeRef.current = Date.now();

    // 如果超过10秒，升级到更详细的提示
    waitingTimerRef.current = setTimeout(() => {
      if (waitingStartTimeRef.current && Date.now() - waitingStartTimeRef.current >= 8000) {
        updateWaitingIndicatorDetails();
      }
    }, 8000);
  };

  // 隐藏等待指示器
  const hideWaitingIndicator = () => {
    setWaitingIndicator({ show: false, type: 'thinking', details: {}, duration: 0 });
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
    waitingStartTimeRef.current = null;
  };

  // 更新等待指示器详情（动态更新策略）
  const updateWaitingIndicatorDetails = () => {
    const elapsed = Date.now() - (waitingStartTimeRef.current || Date.now());

    if (elapsed >= 8000) {
      // 8秒后：显示更详细的信息
      setWaitingIndicator((prev) => ({
        ...prev,
        details: {
          ...prev.details,
          elapsed: Math.floor(elapsed / 1000),
        },
      }));
    }
  };

  // 检测是否需要显示等待指示器
  const startWaitingTimer = (content) => {
    // 根据内容判断操作类型
    let type = 'thinking';
    let details = {};

    if (content.includes('搜索') || content.includes('查找') || content.includes('find')) {
      type = 'searching';
      details = { progress: { scanned: 0, found: 0 } };
    } else if (content.includes('查看') || content.includes('读取') || content.includes('分析文件')) {
      type = 'reading';
      details = { files: [] };
    } else if (content.includes('联网') || content.includes('查询最新') || content.includes('version')) {
      type = 'network';
      details = { info: { content: '最新版本信息', source: '官方文档' } };
    }

    // v2.8.8 - 立即显示等待指示器（0秒，优化响应体验）
    showWaitingIndicator(type, details);
  };

  // 取消等待计时器
  const cancelWaitingTimer = () => {
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
  };

  // ========== 监听流式响应 ==========
  useEffect(() => {
    // v2.8.8 - 实时提取思考过程，同步显示思考过程和回答内容
    const extractThinkingAndContent = (text) => {
      if (!text) return { thinking: null, content: text };

      // 匹配完整的思考代码块 ```思考\n...\n```
      const completeThinkingRegex = /```思考\n([\s\S]*?)\n```/;
      const completeMatch = text.match(completeThinkingRegex);

      if (completeMatch) {
        // 提取完整思考内容，并从文本中移除
        const thinking = completeMatch[1].trim();
        const content = text.replace(completeThinkingRegex, '').trim();
        return { thinking, content };
      }

      // 匹配未完成的思考代码块 ```思考\n...
      const incompleteThinkingRegex = /```思考\n([\s\S]*)$/;
      const incompleteMatch = text.match(incompleteThinkingRegex);

      if (incompleteMatch) {
        // 提取未完成思考内容，并从文本中移除
        const thinking = incompleteMatch[1].trim();
        const content = text.replace(incompleteThinkingRegex, '').trim();
        return { thinking, content };
      }

      // 没有思考过程
      return { thinking: null, content: text };
    };

    window.electronAPI.onMessageDelta(({ text, fullText }) => {
      if (streamingMessageRef.current) {
        // 提取思考过程和回答内容
        const { thinking, content } = extractThinkingAndContent(fullText);

        // 更新回答内容（过滤掉思考过程）
        streamingMessageRef.current(content);

        // v2.8.8 - 实时更新思考过程到当前消息
        if (thinking) {
          setConversations((prev) => {
            const newConversations = [...prev];
            const currentChat = newConversations.find((c) => c.id === currentChatId);
            if (currentChat) {
              const lastMessage = currentChat.messages[currentChat.messages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.thinking = thinking;
                console.log('✅ [App] 实时更新思考过程');
              }
            }
            return newConversations;
          });
        }
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
  }, [currentChatId]); // v2.8.8 - 添加 currentChatId 依赖

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
          console.log('✅ [App] 检测到登录用户:', userStatus.user);
          console.log('   hasApiKey:', userStatus.user.hasApiKey);
          setCurrentUser(userStatus.user);

          // 如果用户有API Key，使用用户配置初始化Agent
          if (userStatus.user.hasApiKey) {
            console.log('🔑 [App] 用户有API Key，使用用户配置初始化Agent');
            const result = await window.electronAPI.initAgent(savedConfig);
            console.log('   Agent 初始化结果:', result);
            if (result.success) {
              setIsAgentReady(true);
              console.log('✅ [App] Agent 初始化成功（用户Key）');
            }
          } else {
            // 用户没有API Key，使用官方Key初始化Agent（游客模式）
            console.log('🆓 [App] 用户无API Key，使用官方Key初始化Agent');
            const result = await window.electronAPI.initAgent({
              modelProvider: 'zhipu',
              apiKey: '',
              model: 'glm-4.7'
            });
            console.log('   Agent 初始化结果:', result);
            if (result.success) {
              setIsAgentReady(true);
              console.log('✅ [App] Agent 初始化成功（官方Key）');
            } else {
              console.error('❌ [App] Agent 初始化失败', result.error);
            }
          }
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      // 延迟关闭启动动画，让用户看到完整动画
      setTimeout(() => {
        setShowStartup(false);
      }, 2000);
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

    // 如果用户有API Key，使用用户配置初始化Agent
    if (user.hasApiKey) {
      const result = await window.electronAPI.initAgent(savedConfig);
      if (result.success) {
        setIsAgentReady(true);
      }
    } else {
      // 用户没有API Key，使用官方Key初始化Agent（游客模式）
      const result = await window.electronAPI.initAgent({
        modelProvider: 'zhipu',
        apiKey: '',
        model: 'glm-4.7'
      });
      if (result.success) {
        setIsAgentReady(true);
      } else {
        console.error('Agent 初始化失败', result.error);
      }
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

    // 🔥 关键：合并游客用户信息到登录用户
    try {
      console.log('🔄 [App] 合并游客用户信息...');
      const mergeResult = await mergeGuestUserInfo(user.id);
      if (mergeResult.success) {
        console.log(`✅ [App] 成功合并游客用户信息`);
      }
    } catch (error) {
      console.error('⚠️  [App] 合并游客用户信息失败（非致命）:', error);
      // 不阻塞登录流程
    }

    // 🔥 关键：合并游客AI记忆到登录用户
    try {
      console.log('🔄 [App] 合并游客AI记忆...');
      const mergeResult = await mergeGuestAiMemory(user.id);
      if (mergeResult.success) {
        console.log(`✅ [App] 成功合并游客AI记忆`);
      }
    } catch (error) {
      console.error('⚠️  [App] 合并游客AI记忆失败（非致命）:', error);
      // 不阻塞登录流程
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
          showAlert('AI 初始化失败: ' + result.error, 'error');
        }
      } else {
        // 如果清空了 API Key，重置状态
        setIsAgentReady(false);
        setShowSettings(false);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      showAlert('保存配置失败: ' + error.message, 'error');
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
          showAlert('删除对话失败: ' + result.error, 'error');
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
      showAlert('删除对话失败: ' + error.message, 'error');
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

  /**
   * 自动提取用户个人信息并保存到云端
   * 检测用户消息中是否包含：姓名、职业、所在地、个人简介、其他偏好等信息
   */
  const extractAndSaveUserInfo = async (userMessage) => {
    // 定义个人信息关键词模式
    const patterns = {
      name: /我叫|名字是|我是|我叫作|姓名是|我的名字|我的姓名/g,
      occupation: /我是|工作|职业|从事|职位|公司/g,
      location: /我在|住在|位于|所在地|城市/g,
      bio: /介绍|简介|关于我|我是/g,
      preferences: /喜欢|爱好|偏好|喜好|擅长/g
    };

    // 检查是否包含个人信息
    const hasPersonalInfo = Object.values(patterns).some(pattern =>
      pattern.test(userMessage)
    );

    if (!hasPersonalInfo) {
      return; // 没有个人信息，直接返回
    }

    console.log('🔍 [App] 检测到用户消息包含个人信息，准备保存...');

    try {
      // 获取当前云端用户信息
      const { getUserInfo } = await import('./lib/cloudService');
      const userInfoResult = await getUserInfo();
      let currentInfo = userInfoResult.success ? userInfoResult.content : '';

      // 构建新的用户信息条目
      const timestamp = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      const newEntry = `\n## 更新时间 - ${timestamp}\n${userMessage}\n`;

      // 检查是否已包含相同内容（避免重复）
      if (currentInfo.includes(userMessage)) {
        console.log('ℹ️ [App] 该信息已存在，跳过保存');
        return;
      }

      // 更新并保存到云端
      const updatedInfo = currentInfo + newEntry;
      const saveResult = await saveUserInfo(updatedInfo);

      if (saveResult.success) {
        console.log('✅ [App] 用户信息已保存到云端');
      } else {
        console.error('❌ [App] 保存用户信息失败:', saveResult.error);
      }
    } catch (error) {
      console.error('❌ [App] 提取用户信息异常:', error);
      throw error;
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

    // ✅ 登录用户无限制使用，不检查使用次数

    if (!isAgentReady) {
      console.log('⚠️ [App] Agent 未就绪，isAgentReady =', isAgentReady);
      console.log('   currentUser:', currentUser);
      console.log('   config:', config);
      showAlert('AI 正在初始化中，请稍候...', 'info');
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

    // 🆕 启动等待计时器（v2.8.0）
    startWaitingTimer(content);

    // 创建 AI 消息占位符（移除假的思考过程 - v2.8.4）
    const aiMessageId = Date.now().toString() + '_ai';
    const aiMessage = { id: aiMessageId, role: 'assistant', content: '' };
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
      // 🆕 隐藏等待指示器（v2.8.0）
      if (waitingIndicator.show) {
        hideWaitingIndicator();
        cancelWaitingTimer();
      }

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
        // v2.8.5 - 如果有思考过程，更新到消息中
        if (result.thinking) {
          setConversations((prev) => {
            const newConversations = [...prev];
            const currentChat = newConversations.find((c) => c.id === chat.id);
            if (currentChat) {
              const lastMessage = currentChat.messages[currentChat.messages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.thinking = result.thinking;
                console.log('✅ [App] 添加思考过程到消息');
              }
            }
            return newConversations;
          });
        }

        // 最终更新本地状态
        streamingMessageRef.current(result.content);

        // 最终更新云端消息（游客和登录用户都更新）
        // v2.9.3 - 同时更新 content 和 thinking
        console.log('💾 [App] 更新 AI 消息到云端（包含思考过程）');
        await updateMessageCloud(chat.id, aiMessageId, {
          content: result.content,
          thinking: result.thinking || null
        });

        // 增加游客使用次数（登录用户无限制，不计数）
        if (!currentUser) {
          const result = await incrementUserUsage();
          if (result.success) {
            console.log(`📊 [App] 游客使用次数更新: ${result.usedCount}/10, 剩余: ${result.remaining}`);
          } else {
            console.error('❌ [App] 更新游客使用次数失败:', result.error);
          }
        }

        // 自动更新记忆文件
        await updateMemoryFile(content, result.content);

        // 🔄 自动同步 AI 记忆到云端（换电脑后可恢复）
        try {
          const timestamp = new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
          const newEntry = `\n## 对话记录 - ${timestamp}\n\n**用户**: ${content}\n\n**AI**: ${result.content.slice(0, 200)}${result.content.length > 200 ? '...' : ''}\n`;

          // 获取当前云端记忆
          const { getAiMemory } = await import('./lib/cloudService');
          const memoryResult = await getAiMemory();
          let currentMemory = memoryResult.success ? memoryResult.content : '';

          // 更新并保存到云端
          const updatedMemory = currentMemory + newEntry;
          await saveAiMemory(updatedMemory);
          console.log('✅ [App] AI 记忆已同步到云端');
        } catch (error) {
          console.error('❌ [App] 同步 AI 记忆到云端失败（非致命）:', error);
          // 不阻塞聊天流程
        }

        // 🔄 自动检测并保存用户个人信息到云端
        try {
          await extractAndSaveUserInfo(content);
        } catch (error) {
          console.error('❌ [App] 保存用户信息失败（非致命）:', error);
          // 不阻塞聊天流程
        }
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
        showAlert('发送消息失败: ' + error.message, 'error');
      }

      // 移除 AI 消息占位符
      chat.messages.pop();
      await saveConversations([...conversations]);
    } finally {
      streamingMessageRef.current = null;
    }

    return chat;
  };

  // 显示启动动画
  if (showStartup) {
    return <StartupScreen />;
  }

  const currentChat = currentChatId
    ? conversations.find((c) => c.id === currentChatId)
    : null;

  console.log('App 渲染', { config, hasApiKey: !!config?.apiKey });

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
        />

        <div className="content">
          {currentChat ? (
            <ChatArea
              messages={currentChat.messages}
              currentUser={currentUser}
              waitingIndicator={waitingIndicator}
            />
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
