import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import InputArea from './components/InputArea';
import Header from './components/Header';
import Welcome from './components/Welcome';
import SettingsModal from './components/SettingsModal';
import FloatingGuide from './components/FloatingGuide';
import './App.css';

function App() {
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

  // 加载配置
  useEffect(() => {
    loadConfig();
    loadConversations();

    // 清理流式响应监听器
    return () => {
      window.electronAPI.removeMessageDeltaListener();
    };
  }, []);

  // 监听流式响应
  useEffect(() => {
    window.electronAPI.onMessageDelta(({ text, fullText }) => {
      if (streamingMessageRef.current) {
        streamingMessageRef.current(fullText);
      }
    });
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

      // 如果有 API Key，初始化 Agent
      if (savedConfig?.apiKey && savedConfig.apiKey.trim() !== '') {
        const result = await window.electronAPI.initAgent(savedConfig);
        console.log('Agent 初始化结果', result);
        if (result.success) {
          setIsAgentReady(true);
        } else {
          console.error('Agent 初始化失败', result.error);
        }
      } else {
        console.log('没有配置 API Key，跳过 Agent 初始化');
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const result = await window.electronAPI.loadConversations();
      if (result.success) {
        setConversations(result.data);
      } else {
        // 文件不存在或读取失败，使用空数组
        setConversations([]);
      }
    } catch (error) {
      console.error('加载对话历史失败:', error);
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
    try {
      const result = await window.electronAPI.saveConversations(updated);
      if (result.success) {
        setConversations(updated);
      } else {
        console.error('保存对话历史失败:', result.error);
      }
    } catch (error) {
      console.error('保存对话历史失败:', error);
    }
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
    const updated = conversations.filter((c) => c.id !== chatId);
    await saveConversations(updated);

    if (currentChatId === chatId) {
      setCurrentChatId(null);
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
    if (!config?.apiKey) {
      alert('请先在设置中配置 API Key');
      setShowSettings(true);
      return;
    }

    if (!isAgentReady) {
      alert('AI 正在初始化中，请稍候...');
      return;
    }

    // 创建新对话或追加到现有对话
    let chat;
    let updated = [...conversations];

    if (!currentChatId) {
      // 创建新对话
      chat = {
        id: Date.now().toString(),
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        createdAt: new Date().toISOString(),
        messages: [],
      };
      updated.unshift(chat);
      setCurrentChatId(chat.id);
    } else {
      chat = updated.find((c) => c.id === currentChatId);
    }

    // 添加用户消息
    const userMessage = { role: 'user', content, files };
    chat.messages.push(userMessage);

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
    const aiMessage = { role: 'assistant', content: '', thinking };
    chat.messages.push(aiMessage);

    await saveConversations(updated);

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
    streamingMessageRef.current = (fullText) => {
      setConversations((prev) => {
        const newConversations = [...prev];
        const currentChat = newConversations.find((c) => c.id === chat.id);
        if (currentChat) {
          const lastMessage = currentChat.messages[currentChat.messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = fullText;
          }
        }
        return newConversations;
      });
    };

    try {
      // 调用 Agent SDK 发送消息（传递完整内容）
      const result = await window.electronAPI.sendMessage(fullContent, files);

      if (result.success) {
        // 最终更新
        streamingMessageRef.current(result.content);

        // 自动更新记忆文件
        await updateMemoryFile(content, result.content);

        // 保存完整的对话（包含AI的最终回复）
        setConversations((prev) => {
          const newConversations = [...prev];
          const currentChat = newConversations.find((c) => c.id === chat.id);
          if (currentChat) {
            // 保存到文件
            saveConversations(newConversations);
          }
          return newConversations;
        });
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      alert('发送消息失败: ' + error.message);

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
      />

      <div className="main">
        <Header
          title={currentChat?.title || '新对话'}
          messages={currentChat?.messages || []}
        />

        <div className="content">
          {currentChat ? (
            <ChatArea messages={currentChat.messages} />
          ) : (
            <Welcome />
          )}
        </div>

        <InputArea
          onSendMessage={handleSendMessage}
          hasApiKey={!!config?.apiKey}
          onOpenSettings={() => {
            console.log('打开设置窗口');
            setShowSettings(true);
          }}
        />
      </div>

      {showSettings && (
        <SettingsModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showFloatingGuide && <FloatingGuide />}
    </div>
  );
}

export default App;
