import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import InputArea from './components/InputArea';
import Header from './components/Header';
import Welcome from './components/Welcome';
import SettingsModal from './components/SettingsModal';
import StartupScreen from './components/StartupScreen';
import LoginModal from './components/LoginModal';
import GuestLimitModal from './components/GuestLimitModal';
import UpdateAvailableModal from './components/UpdateAvailableModal';
import UpdateDownloadedModal from './components/UpdateDownloadedModal';
import ForceUpdateModal from './components/ForceUpdateModal';
import ToastModal from './components/ToastModal';
import PlatformStyles from './components/PlatformStyles';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { showAlert } from './lib/alertService';
import { getPlatformClassNames } from './lib/platformUtil';
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
  const [showStartup, setShowStartup] = useState(true);
  const [isAgentReady, setIsAgentReady] = useState(false);
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [memoryContent, setMemoryContent] = useState('');
  const streamingMessageRef = useRef(null);
  const isForceUpdateRef = useRef(false); // 🔥 追踪是否为强制更新

  // 使用 AuthContext 的用户状态
  const currentUser = auth.currentUser;
  const [guestStatus, setGuestStatus] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showForceUpdate, setShowForceUpdate] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(null); // { version }
  const [toast, setToast] = useState(null);

  // ✨ v2.10.1 新增：小红点状态（记录哪些会话在后台完成回复）
  const [unreadConversations, setUnreadConversations] = useState(new Set());
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
  // 登录用户的每日使用次数状态
  const [dailyUsageStatus, setDailyUsageStatus] = useState(null);

  // 当用户登录时，从云端加载使用次数和每日使用状态
  useEffect(() => {
    if (currentUser) {
      loadUserUsageCount();
      loadDailyUsageStatus();
    } else {
      setUserUsageCount(0);
      setDailyUsageStatus(null);
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

  // 从云端加载每日使用状态
  const loadDailyUsageStatus = async () => {
    try {
      const { getDailyUsage } = await import('./lib/cloudService');
      const result = await getDailyUsage();
      if (result.success) {
        setDailyUsageStatus({
          dailyLimit: result.data.dailyLimit,
          dailyUsed: result.data.dailyUsed,
          remaining: result.data.remaining,
          lastResetDate: result.data.lastResetDate,
          hasApiKey: result.data.has_api_key || false  // 🔥 v2.11.5 新增：记录是否有 API Key
        });
        console.log(`✅ [App] 每日使用状态: ${result.data.dailyUsed}/${result.data.dailyLimit}，剩余 ${result.data.remaining} 次`);
      } else {
        console.error('❌ [App] 获取每日使用状态失败:', result.error);
      }
    } catch (error) {
      console.error('❌ [App] 加载每日使用状态异常:', error);
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

    // ✨ v2.10.1 修改：支持并行任务，添加 conversationId
    window.electronAPI.onMessageDelta(({ conversationId, text, fullText }) => {
      if (streamingMessageRef.current) {
        // 提取思考过程和回答内容
        const { thinking, content } = extractThinkingAndContent(fullText);

        // 更新回答内容（过滤掉思考过程）
        streamingMessageRef.current(content);

        // v2.8.8 - 实时更新思考过程到当前消息
        if (thinking) {
          setConversations((prev) => {
            const newConversations = [...prev];
            // ✨ 使用 conversationId 找到对应的会话（支持并行任务）
            const targetChat = newConversations.find((c) => c.id === conversationId);
            if (targetChat) {
              const lastMessage = targetChat.messages[targetChat.messages.length - 1];
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
      console.log('📡 [App] 收到游客使用次数更新事件:', data);
      setGuestStatus((prev) => {
        console.log('📊 [App] 更新前 guestStatus:', prev);
        const newStatus = {
          ...prev,
          usedCount: data.usedCount,
          remaining: data.remaining,
          limit: data.limit || prev?.limit || 10
        };
        console.log('📊 [App] 更新后 guestStatus:', newStatus);
        return newStatus;
      });
    });
  }, [currentChatId]); // v2.8.8 - 添加 currentChatId 依赖

  // 监听自动更新事件
  useEffect(() => {
    window.electronAPI.onUpdateAvailable((data) => {
      if (data.forceUpdate) {
        // 强制更新
        isForceUpdateRef.current = true;
        setUpdateInfo(data);
        setShowForceUpdate(true);
      } else {
        // 普通更新，显示弹窗
        isForceUpdateRef.current = false;
        setUpdateInfo(data);
      }
    });

    // 监听下载完成事件
    window.electronAPI.onUpdateDownloaded((data) => {
      console.log('[更新] 下载完成:', data);
      setUpdateDownloaded(data);
      // 🔥 修复：只有非强制更新才清除 updateInfo
      // 强制更新需要保持弹窗显示，让用户点击"立即重启并安装"
      if (!isForceUpdateRef.current) {
        setUpdateInfo(null);
      }
    });

    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, []);

  // ✨ v2.10.1 新增：监听消息完成事件（小红点提示）
  useEffect(() => {
    const handleMessageCompleted = (data) => {
      const { conversationId, timestamp } = data;
      console.log('📬 [App] 消息完成:', conversationId);

      // 如果不是当前活跃的会话，添加到未读列表
      if (conversationId !== currentChatId) {
        setUnreadConversations(prev => new Set([...prev, conversationId]));
        console.log('🔴 [App] 添加小红点:', conversationId);
      }
    };

    // 监听消息完成事件
    window.electronAPI.onMessageCompleted(handleMessageCompleted);

    return () => {
      // 清理监听器
      if (window.electronAPI.removeMessageCompletedListener) {
        window.electronAPI.removeMessageCompletedListener();
      }
    };
  }, [currentChatId]);

  const loadConfig = async () => {
    try {
      const savedConfig = await window.electronAPI.readConfig();
      setConfig(savedConfig);

      // 加载全局提示和记忆文件
      await loadGlobalPromptAndMemory(savedConfig);

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
            usedCount: userStatus.usedCount,
            limit: userStatus.limit
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
          auth.login(userStatus.user);

          // 🔥 v2.11.4 修复：先同步登录状态到后端，确保 isGuestMode = false
          await window.electronAPI.syncLoginStatus(userStatus.user);
          console.log('✅ [App] 登录状态已同步到后端');

          // 🔥 v2.11.5 修复：先清空本地 API Key，防止其他用户的 Key 泄露
          savedConfig.apiKey = '';
          await window.electronAPI.saveConfig(savedConfig);
          console.log('🔒 [App] 已清空本地 API Key（安全措施）');

          // 🔥 v2.11.5 新增：从云端加载 API Key
          try {
            const { loadApiKey } = await import('./lib/cloudService');
            const apiKeyResult = await loadApiKey();
            if (apiKeyResult.success && apiKeyResult.apiKey) {
              // 云端有 API Key，使用云端的
              savedConfig.apiKey = apiKeyResult.apiKey;
              await window.electronAPI.saveConfig(savedConfig);
              setConfig(savedConfig);
              console.log('✅ [App] 从云端加载 API Key 成功');
            } else {
              // 云端没有 API Key，保持空值
              console.log('ℹ️  [App] 云端未保存 API Key');
            }
          } catch (error) {
            console.error('⚠️  [App] 加载云端 API Key 失败（非致命）:', error);
          }

          // 如果用户有API Key（云端或本地），使用用户配置初始化Agent
          if (userStatus.user.hasApiKey || savedConfig.apiKey) {
            console.log('🔑 [App] 使用用户配置初始化Agent');
            const result = await window.electronAPI.initAgent(savedConfig);
            console.log('   Agent 初始化结果:', result);
            if (result.success) {
              setIsAgentReady(true);
              console.log('✅ [App] Agent 初始化成功（用户Key）');
            }
          } else {
            // 用户没有API Key，使用官方Key初始化Agent
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
      // 🔥 v2.20.3 优化：立即显示主界面，Supabase 配置在后台异步加载
      // 取消固定延迟，提升启动速度
      setShowStartup(false);

      // 🔥 关键：通知 Electron 窗口可以显示了
      if (window.electronAPI && window.electronAPI.readyToShow) {
        window.electronAPI.readyToShow();
      }
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
          usedCount: guestStatusResult.usedCount,
          limit: guestStatusResult.limit
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

    // 🔥 v2.11.3 修复：同步登录状态到后端（重要！）
    await window.electronAPI.syncLoginStatus(user);
    console.log('✅ [App] 登录状态已同步到后端');

    // 🔥 关键修复：清空游客状态
    setGuestStatus(null);
    console.log('✅ [App] 已清空游客状态');

    // 🔥 关键修复：清空本地对话列表，避免与云端数据重复
    setConversations([]);
    setCurrentChatId(null);
    console.log('✅ [App] 已清空本地对话列表');

    // 🔥 关键修复：从云端加载用户使用次数，而不是 localStorage
    try {
      const usageResult = await getUserUsageCount();
      if (usageResult.success) {
        setUserUsageCount(usageResult.usedCount);
        console.log(`✅ [App] 云端使用次数: ${usageResult.usedCount}`);
      }
    } catch (error) {
      console.error('⚠️  [App] 获取云端使用次数失败（非致命）:', error);
    }

    // 🔥 v2.11.5 修复：从云端加载 API Key
    // 先清空本地 API Key，防止其他用户的 Key 泄露
    const savedConfig = await window.electronAPI.readConfig();
    savedConfig.apiKey = '';
    await window.electronAPI.saveConfig(savedConfig);
    console.log('🔒 [App] 已清空本地 API Key（安全措施）');

    let cloudApiKey = null;
    try {
      const { loadApiKey } = await import('./lib/cloudService');
      const apiKeyResult = await loadApiKey();
      if (apiKeyResult.success && apiKeyResult.apiKey) {
        cloudApiKey = apiKeyResult.apiKey;
        console.log('✅ [App] 从云端加载 API Key 成功');

        // 保存到本地配置
        savedConfig.apiKey = cloudApiKey;
        await window.electronAPI.saveConfig(savedConfig);
        setConfig(savedConfig);
        console.log('✅ [App] 云端 API Key 已保存到本地配置');
      } else {
        console.log('ℹ️  [App] 云端未保存 API Key');
      }
    } catch (error) {
      console.error('⚠️  [App] 加载云端 API Key 失败（非致命）:', error);
    }

    // 重新初始化Agent（savedConfig 已经在上面声明过了）
    // 优先级：云端的 API Key > 本地配置的 API Key > 官方 API Key
    if (cloudApiKey || savedConfig.apiKey) {
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

    // 🔥 关键修复：合并完成后再加载云端对话，确保数据一致性
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
    await loadUserStatus();  // 重新加载游客状态（无返回值）

    // 重新初始化Agent（游客模式）
    const result = await window.electronAPI.initAgent({
      modelProvider: 'zhipu',
      apiKey: '',
      model: 'glm-4.7'
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

  const handleNewChat = async () => {
    // ✨ v2.10.1 优化：立即创建空白会话，提升用户体验
    const newChat = {
      id: Date.now().toString(),
      title: '新对话',  // 临时标题，发送消息后会更新
      createdAt: new Date().toISOString(),
      model: config?.model || 'claude-3-5-sonnet-20241022',
      messages: [],
      isNew: true,  // 标记为新对话，用于后续处理
    };

    // 添加到会话列表顶部
    setConversations(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);

    // 同步到云端（游客和登录用户都保存）
    console.log('📝 [App] 创建新对话到云端:', newChat.title);
    await createConversation(newChat);
  };

  const handleSaveConfig = async (newConfig) => {
    try {
      await window.electronAPI.saveConfig(newConfig);
      setConfig(newConfig);

      // 加载全局提示和记忆文件
      await loadGlobalPromptAndMemory(newConfig);

      // 🔥 v2.11.5 修复：在初始化 Agent 前，先同步用户状态到后端
      // 避免后端误判为游客模式
      if (currentUser) {
        await window.electronAPI.syncLoginStatus(currentUser);
        console.log('✅ [handleSaveConfig] 已同步用户状态到后端');
      }

      // 重新初始化 Agent
      if (newConfig.apiKey && newConfig.apiKey.trim() !== '') {
        // 用户有 API Key，使用用户配置初始化 Agent
        const result = await window.electronAPI.initAgent(newConfig);
        console.log('Agent 初始化结果', result);
        if (result.success) {
          setIsAgentReady(true);
          setShowSettings(false);
        } else {
          showAlert('AI 初始化失败: ' + result.error, 'error');
        }
      } else {
        // 用户没有 API Key，使用官方 Key 初始化 Agent（游客模式）
        const result = await window.electronAPI.initAgent({
          modelProvider: 'zhipu',
          apiKey: '',
          model: 'glm-4.7'
        });
        console.log('Agent 初始化结果（游客模式）', result);
        if (result.success) {
          setIsAgentReady(true);
          setShowSettings(false);
        } else {
          showAlert('AI 初始化失败: ' + result.error, 'error');
        }
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      showAlert('保存配置失败: ' + error.message, 'error');
    }
  };

  const handleUserUpdate = (updatedUser) => {
    // 🔥 v2.11.5 新增：更新 currentUser 对象
    setCurrentUser(updatedUser);
    console.log('✅ [App] currentUser 已更新:', updatedUser);
  };

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);

    // ✨ v2.10.1 新增：切换会话时清除该会话的小红点
    setUnreadConversations(prev => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
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

      // 🔥 性能优化：限制对话记录数量，只保留最近 3 条
      const lines = currentMemory.split('\n');
      const recordHeaders = lines.filter(line => line.startsWith('## 对话记录'));

      // 如果已有 3 条记录，删除最旧的一条
      if (recordHeaders.length >= 3) {
        const firstRecordIndex = lines.findIndex(line => line.startsWith('## 对话记录'));
        const secondRecordIndex = lines.findIndex((line, i) => i > firstRecordIndex && line.startsWith('## 对话记录'));

        // 删除第一条记录
        currentMemory = lines.slice(secondRecordIndex).join('\n');
      }

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
        return { success: false }; // 🔥 修复：明确返回失败状态，避免清空输入框
      }
    }

    // 🔥 v2.11.5 修复：只有使用官方 API Key 时才检查每日限制
    // 如果用户输入了自己的 API Key（云端或本地），使用自己的配额，不检查每日限制
    const userHasApiKey = config?.apiKey || dailyUsageStatus?.hasApiKey;
    if (currentUser && dailyUsageStatus && !userHasApiKey) {
      if (dailyUsageStatus.remaining <= 0) {
        showAlert('今日使用已达上限，请使用自己的key，或联系晓力', 'warning');
        return { success: false };
      }
    }

    if (!isAgentReady) {
      console.log('⚠️ [App] Agent 未就绪，isAgentReady =', isAgentReady);
      console.log('   currentUser:', currentUser);
      console.log('   config:', config);
      showAlert('AI 正在初始化中，请稍候...', 'info');
      return { success: false }; // 🔥 修复：明确返回失败状态，避免清空输入框
    }

    // 创建新对话或追加到现有对话
    let chat;
    let updated = [...conversations];
    let isNewConversation = false;

    if (!currentChatId) {
      // 兜底：如果没有当前会话，创建新对话（通常不会走到这里，因为handleNewChat已经创建了）
      isNewConversation = true;
      chat = {
        id: Date.now().toString(),
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        createdAt: new Date().toISOString(),
        model: config?.model || 'claude-3-5-sonnet-20241022',
        messages: [],
        isNew: true,
      };
      updated.unshift(chat);
      setCurrentChatId(chat.id);

      // 同步到云端（游客和登录用户都保存）
      console.log('📝 [App] 创建新对话到云端:', chat.title);
      await createConversation(chat);
    } else {
      // 找到当前会话
      chat = updated.find((c) => c.id === currentChatId);

      // ✨ v2.10.1 优化：如果是空白新会话，更新标题
      if (chat.isNew && chat.messages.length === 0) {
        chat.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
        chat.isNew = false;  // 移除新标记

        // 更新云端会话标题
        console.log('📝 [App] 更新新对话标题:', chat.title);
        // 这里可以调用更新云端的API（如果需要）
      }
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

    // 🔥 v2.11.3 优化：立即返回成功，让输入框立即清空
    // 后续的 AI 调用、云端更新等操作在后台异步执行
    const chatClone = chat; // 保存 chat 引用用于后续异步操作

    // 🚀 立即返回，让输入框马上清空
    // 后续所有 AI 处理在后台异步执行
    processAIMessageInBackground({
      chat: chatClone,
      content,
      globalPrompt,
      files,
      aiMessageId,
      currentUser
    }).catch(error => {
      console.error('❌ [App] 后台 AI 处理失败:', error);
    });

    return { success: true };
  };

  // 🔥 v2.11.3 新增：后台异步处理 AI 消息
  // 这样可以让输入框立即清空，不需要等待 AI 响应
  const processAIMessageInBackground = async ({
    chat, content, globalPrompt, files, aiMessageId, currentUser
  }) => {
    // 构建完整的消息内容（只包含全局提示，记忆由AI通过工具调用获取）
    let fullContent = content;
    if (globalPrompt) {
      fullContent = `【全局设置】\n${globalPrompt}\n\n【用户消息】\n${content}`;
    }

    // 设置流式响应回调
    let lastUpdateTime = Date.now();
    streamingMessageRef.current = (fullText) => {
      // 🔥 关键修复：始终隐藏等待指示器（v2.10.1）
      // 移除 if 检查以避免闭包导致的过时状态
      hideWaitingIndicator();
      cancelWaitingTimer();

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
      // ✨ v2.10.1 新增：传递 conversationId，支持并行任务
      const result = await window.electronAPI.sendMessage(chat.id, fullContent, files);

      // 🔥 关键修复：检查是否需要登录（游客限制）
      if (result.needLogin) {
        setShowGuestLimitModal(true);
        // 移除 AI 消息占位符
        chat.messages.pop();
        setConversations((prev) => {
          const newConversations = [...prev];
          const targetChat = newConversations.find((c) => c.id === chat.id);
          if (targetChat) {
            targetChat.messages = [...chat.messages];
          }
          return newConversations;
        });
        return;
      }

      if (!result.success) {
        throw new Error(result.error || '发送消息失败');
      }

      // result.success === true，继续处理成功响应
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

      // 🔥 v2.11.5 修复：只有使用官方 API Key 时才增加每日使用次数
      // 如果用户输入了自己的 API Key（云端或本地），使用自己的配额，不统计每日使用次数
      const userHasApiKey = config?.apiKey || dailyUsageStatus?.hasApiKey;
      if (currentUser && !userHasApiKey) {
        try {
          const { incrementDailyUsage } = await import('./lib/cloudService');
          const incrementResult = await incrementDailyUsage();
          if (incrementResult.success) {
            // 更新每日使用状态
            setDailyUsageStatus({
              dailyLimit: incrementResult.data.dailyLimit,
              dailyUsed: incrementResult.data.dailyUsed,
              remaining: incrementResult.data.remaining,
              lastResetDate: incrementResult.data.lastResetDate,
              hasApiKey: incrementResult.data.has_api_key || false  // 🔥 v2.11.5 新增
            });
            console.log('✅ [App] 每日使用次数已更新');
          } else if (incrementResult.error !== 'DAILY_LIMIT_REACHED') {
            // 如果不是达到限制的错误，记录日志
            console.error('❌ [App] 增加每日使用次数失败:', incrementResult.error);
          }
        } catch (error) {
          console.error('❌ [App] 增加每日使用次数异常:', error);
        }
      }

      // 🔥 v2.11.3 修复：游客使用次数由后端在 send-message 时增加
      // 后端会通过 IPC 事件 'guest-usage-updated' 通知前端
      // 前端监听器会自动更新 guestStatus，无需在此处手动调用 incrementUserUsage
      // 避免双重计数（后端本地数据库 + 前端云端数据库）

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
    } catch (error) {
      console.error('❌ [App] 后台处理 AI 消息失败:', error);

      // 检查是否是频率限制错误
      const errorMessage = error.message || '';
      if (errorMessage.includes('1305') || errorMessage.includes('当前API请求过多') || errorMessage.includes('频率限制')) {
        setToast({
          message: '当前使用人数较多，请稍后尝试',
          type: 'error'
        });
      } else if (errorMessage.includes('401') || errorMessage.includes('令牌已过期') || errorMessage.includes('身份验证失败') || errorMessage.includes('验证不正确')) {
        // 🔥 v2.11.7 优化：API Key 错误提示
        showAlert(
          '❌ API Key 无效或已过期，请在设置中重新配置',
          'error'
        );
      } else {
        // 其他错误显示alert
        showAlert('发送消息失败: ' + error.message, 'error');
      }

      // 移除 AI 消息占位符
      chat.messages.pop();
      setConversations((prev) => {
        const newConversations = [...prev];
        const targetChat = newConversations.find((c) => c.id === chat.id);
        if (targetChat) {
          targetChat.messages = [...chat.messages];
        }
        return newConversations;
      });
    } finally {
      streamingMessageRef.current = null;
    }
  };

  // 显示启动动画
  if (showStartup) {
    return <StartupScreen />;
  }

  const currentChat = currentChatId
    ? conversations.find((c) => c.id === currentChatId)
    : null;

  console.log('App 渲染', { config, hasApiKey: !!config?.apiKey });

  // ✨ v2.10.1 新增：根据平台添加样式类名
  const platformClassNames = getPlatformClassNames().join(' ');

  return (
    <div className={`app ${platformClassNames}`}>
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
        unreadConversations={unreadConversations}  // ✨ v2.10.1 新增：小红点状态
      />

      <div className="main">
        <Header
          title={currentChat?.title || '新对话'}
          messages={currentChat?.messages || []}
        />

        <div className="content">
          {currentChat && currentChat.messages.length > 0 ? (
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
          dailyUsageStatus={dailyUsageStatus}
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
          onUserUpdate={handleUserUpdate}
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
          limit={guestStatus?.limit || 10}
        />
      )}

      {toast && (
        <ToastModal
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
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
            // 不等待，立即调用安装重启
            window.electronAPI.installUpdate();
            // 不需要关闭弹窗，应用即将退出
          }}
          onClose={() => setUpdateDownloaded(null)}
        />
      )}
    </div>
  );
}

// 用 AuthProvider 包裹整个应用
function App() {
  return (
    <AuthProvider>
      <PlatformStyles>
        <AppContent />
      </PlatformStyles>
    </AuthProvider>
  );
}

export default App;
