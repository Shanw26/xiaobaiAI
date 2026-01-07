import { useState, useEffect } from 'react';
import './SettingsModal.css';
import logoSvg from '/logo.svg';

// 格式化数字显示
function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toLocaleString();
}

// 模型提供商配置
const MODEL_PROVIDERS = {
  anthropic: {
    name: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ],
  },
  zhipu: {
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    models: [
      { id: 'glm-4.7', name: 'GLM-4.7 (高智能旗舰)' },
      { id: 'glm-4.5-air', name: 'GLM-4.5 Air (高性价比)' },
      { id: 'glm-4.5-flash', name: 'GLM-4.5 Flash (免费)' },
    ],
  },
};

function SettingsModal({ config, onSave, onClose, currentUser, onLogout }) {
  const [localConfig, setLocalConfig] = useState({ ...config });
  const [userInfo, setUserInfo] = useState('');
  const [aiMemory, setAiMemory] = useState('');
  const [isEditingUserInfo, setIsEditingUserInfo] = useState(false);
  const [isEditingAiMemory, setIsEditingAiMemory] = useState(false);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(false);
  const [isLoadingAiMemory, setIsLoadingAiMemory] = useState(false);
  const [userDataPathDisplay, setUserDataPathDisplay] = useState('');
  const [tokenUsage, setTokenUsage] = useState(null);
  const [activeCategory, setActiveCategory] = useState('basic');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  // 设置分类（动态添加徽章）
  const SETTINGS_CATEGORIES = [
    { id: 'basic', name: '基础配置', icon: '⚙️' },
    { id: 'advanced', name: '高级功能', icon: '🔧' },
    { id: 'about', name: '关于', icon: 'ℹ️', badge: updateAvailable },
  ];

  useEffect(() => {
    setLocalConfig({ ...config });

    // 获取用户数据路径
    window.electronAPI.getUserDataPath().then(userDataPath => {
      setUserDataPathDisplay(userDataPath);
    });

    // 获取token使用记录
    window.electronAPI.getTokenUsage().then(result => {
      if (result.success) {
        setTokenUsage(result.data);
      }
    });

    // 监听更新可用事件
    window.electronAPI.onUpdateAvailable((data) => {
      if (!data.forceUpdate) {
        setUpdateAvailable(true);
        setUpdateStatus(data);
      }
    });

    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, [config]);

  const handleSave = async () => {
    if (!localConfig.apiKey) {
      alert('请输入 API Key');
      return;
    }

    onSave(localConfig);
  };

  const handleEditUserInfo = async () => {
    setIsLoadingUserInfo(true);
    try {
      const { getUserInfo } = await import('../lib/cloudService');
      const result = await getUserInfo();
      if (result.success) {
        setUserInfo(result.content);
        setIsEditingUserInfo(true);
      } else {
        alert('❌ 获取用户信息失败: ' + result.error);
      }
    } catch (error) {
      console.error('获取用户信息异常:', error);
      alert('❌ 获取用户信息失败: ' + error.message);
    } finally {
      setIsLoadingUserInfo(false);
    }
  };

  const handleEditAiMemory = async () => {
    setIsLoadingAiMemory(true);
    try {
      const { getAiMemory } = await import('../lib/cloudService');
      const result = await getAiMemory();
      if (result.success) {
        setAiMemory(result.content);
        setIsEditingAiMemory(true);
      } else {
        alert('❌ 获取AI记忆失败: ' + result.error);
      }
    } catch (error) {
      console.error('获取AI记忆异常:', error);
      alert('❌ 获取AI记忆失败: ' + error.message);
    } finally {
      setIsLoadingAiMemory(false);
    }
  };

  const handleCheckUpdate = async () => {
    const result = await window.electronAPI.checkForUpdates();
    if (!result) {
      alert('当前已是最新版本');
    }
  };

  const handleDownloadUpdate = async () => {
    await window.electronAPI.downloadUpdate();
  };

  const currentProvider = MODEL_PROVIDERS[localConfig.modelProvider];
  const currentModels = currentProvider?.models || [];

  // 渲染基础配置内容
  const renderBasicSettings = () => (
    <div className="settings-content animate-in">
      <div className="form-group">
        <label className="form-label">模型厂商</label>
        <select
          className="form-input"
          value={localConfig.modelProvider}
          onChange={(e) =>
            setLocalConfig({
              ...localConfig,
              modelProvider: e.target.value,
              model: MODEL_PROVIDERS[e.target.value].models[0].id,
            })
          }
        >
          {Object.entries(MODEL_PROVIDERS).map(([key, provider]) => (
            <option key={key} value={key}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">API Key</label>
        <input
          type="password"
          className="form-input"
          placeholder="输入你的 API Key"
          value={localConfig.apiKey}
          onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">模型</label>
        <select
          className="form-input"
          value={localConfig.model}
          onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
        >
          {currentModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // 渲染高级功能内容
  const renderAdvancedSettings = () => (
    <div className="settings-content animate-in">
      <div className="form-group">
        <label className="form-label">
          用户信息
          <span className="form-hint">AI 记住的个人信息</span>
        </label>
        {!isEditingUserInfo ? (
          <>
            <div className="form-actions">
              <button
                className="btn-modal secondary"
                onClick={handleEditUserInfo}
                disabled={isLoadingUserInfo}
              >
                {isLoadingUserInfo ? '加载中...' : '编辑'}
              </button>
            </div>
          </>
        ) : (
          <>
            <textarea
              className="form-textarea"
              value={userInfo}
              onChange={(e) => setUserInfo(e.target.value)}
              rows={12}
              placeholder="在此输入用户信息..."
            />
            <div className="form-actions">
              <button
                className="btn-modal secondary"
                onClick={() => setIsEditingUserInfo(false)}
              >
                取消
              </button>
              <button
                className="btn-modal primary"
                onClick={async () => {
                  try {
                    const { saveUserInfo } = await import('../lib/cloudService');
                    const result = await saveUserInfo(userInfo);
                    if (result.success) {
                      setIsEditingUserInfo(false);
                      alert('✅ 用户信息已保存到云端');
                    } else {
                      alert('❌ 保存失败: ' + result.error);
                    }
                  } catch (error) {
                    console.error('保存用户信息异常:', error);
                    alert('❌ 保存失败: ' + error.message);
                  }
                }}
              >
                保存
              </button>
            </div>
          </>
        )}
        <div className="form-help">
          💡 当你告诉 AI 你的个人信息时，它会记录在这里，方便更好地了解你
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          AI记忆
          <span className="form-hint">自动记录对话历史</span>
        </label>
        {!isEditingAiMemory ? (
          <>
            <div className="form-actions">
              <button
                className="btn-modal secondary"
                onClick={handleEditAiMemory}
                disabled={isLoadingAiMemory}
              >
                {isLoadingAiMemory ? '加载中...' : '编辑'}
              </button>
            </div>
          </>
        ) : (
          <>
            <textarea
              className="form-textarea"
              value={aiMemory}
              onChange={(e) => setAiMemory(e.target.value)}
              rows={12}
              placeholder="在此输入AI记忆..."
            />
            <div className="form-actions">
              <button
                className="btn-modal secondary"
                onClick={() => setIsEditingAiMemory(false)}
              >
                取消
              </button>
              <button
                className="btn-modal primary"
                onClick={async () => {
                  try {
                    const { saveAiMemory } = await import('../lib/cloudService');
                    const result = await saveAiMemory(aiMemory);
                    if (result.success) {
                      setIsEditingAiMemory(false);
                      alert('✅ AI记忆已保存到云端');
                    } else {
                      alert('❌ 保存失败: ' + result.error);
                    }
                  } catch (error) {
                    console.error('保存AI记忆异常:', error);
                    alert('❌ 保存失败: ' + error.message);
                  }
                }}
              >
                保存
              </button>
            </div>
          </>
        )}
        <div className="form-help">
          💡 AI 可以根据历史记忆信息提供更个性化的回复
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          应用数据目录
          <span className="form-hint">所有数据存储位置</span>
        </label>
        <div className="directory-selector">
          <input
            type="text"
            className="form-input"
            value={userDataPathDisplay || ''}
            readOnly
            style={{ background: 'var(--bg-secondary)' }}
          />
          <button
            className="btn-select"
            onClick={async () => {
              if (!userDataPathDisplay) {
                alert('数据目录路径未知');
                return;
              }
              try {
                const result = await window.electronAPI.openPath(userDataPathDisplay);
                if (!result.success) {
                  alert('打开失败: ' + result.error);
                }
              } catch (error) {
                alert('打开失败: ' + error.message);
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            打开
          </button>
        </div>
        <div className="form-help">
          💡 小白AI的所有数据（配置、对话历史、用户信息等）都保存在这个目录中
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Token 消耗统计
          <span className="form-hint">AI 使用量记录</span>
        </label>
        <div className="token-stats">
          {tokenUsage ? (
            <>
              <div className="token-stat-item">
                <div className="token-stat-label">累计使用</div>
                <div className="token-stat-value">{formatNumber(tokenUsage.totalTokens)}</div>
              </div>
              <div className="token-stat-item">
                <div className="token-stat-label">累计请求</div>
                <div className="token-stat-value">{tokenUsage.totalRequests}</div>
              </div>
              {tokenUsage.dailyUsage.length > 0 && (
                <div className="token-stat-item">
                  <div className="token-stat-label">今日使用</div>
                  <div className="token-stat-value">
                    {formatNumber(tokenUsage.dailyUsage[tokenUsage.dailyUsage.length - 1].totalTokens)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="token-stat-loading">加载中...</div>
          )}
        </div>
        <div className="form-help">
          💡 Token 是 AI 处理文本的单位，输入和输出都会消耗 Token
        </div>
      </div>
    </div>
  );

  // 渲染关于内容
  const renderAbout = () => (
    <div className="settings-content animate-in">
      <div className="about-section">
        <div className="about-logo">
          <img src={logoSvg} alt="小白AI Logo" />
        </div>
        <div className="about-title-wrapper">
          <h2 className="about-title">小白AI</h2>
          <span className="about-version">v2.6.9</span>

          {updateAvailable && updateStatus && (
            <button className="update-tag" onClick={handleDownloadUpdate}>
              🔔 v{updateStatus.version}
            </button>
          )}

          {!updateAvailable && (
            <button className="check-update-tag" onClick={handleCheckUpdate}>
              检查更新
            </button>
          )}
        </div>

        {updateAvailable && updateStatus && (
          <div className="update-notice" onClick={handleCheckUpdate} title="点击立即更新">
            <div className="update-notice-text">
              发现新版本，点击版本标签可立即更新
            </div>
          </div>
        )}

        <p className="about-description">
          一款操作系统级AI助手
        </p>

        <div className="about-info">
          <div className="about-info-item">
            <span className="about-info-label">开发者</span>
            <span className="about-info-value">晓力</span>
          </div>
          <div className="about-info-item">
            <span className="about-info-label">技术栈</span>
            <span className="about-info-value">Electron + React + Claude SDK</span>
          </div>
        </div>

        {/* 退出登录按钮 - 仅登录用户显示 */}
        {currentUser && (
          <button className="btn-about-logout" onClick={onLogout}>
            退出登录
          </button>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeCategory) {
      case 'basic':
        return renderBasicSettings();
      case 'advanced':
        return renderAdvancedSettings();
      case 'about':
        return renderAbout();
      default:
        return renderBasicSettings();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">设置</h2>
          <button className="btn-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settings-body">
          {/* 左侧分类菜单 */}
          <div className="settings-sidebar">
            {SETTINGS_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className={`settings-nav-item ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span className="settings-nav-icon">{category.icon}</span>
                <span className="settings-nav-text">{category.name}</span>
                {category.badge && <span className="update-badge">🔔</span>}
              </div>
            ))}
          </div>

          {/* 右侧设置内容 */}
          <div className="settings-main">
            {renderContent()}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-modal secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn-modal primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
