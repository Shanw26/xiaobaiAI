import { useState, useEffect } from 'react';
import './SettingsModal.css';
import logoSvg from '/logo.svg';
import AlertModal from './AlertModal';
import MarkdownRenderer from './MarkdownRenderer';
import ToastModal from './ToastModal';
import { showAlert } from '../lib/alertService';
import { getPlatformClassNames } from '../lib/platformUtil';
import { APP_VERSION, APP_NAME, GITHUB_RELEASES_URL } from '../config';

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

function SettingsModal({ config, onSave, onClose, currentUser, onLogout, onUserUpdate }) {
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
  const [toast, setToast] = useState(null);

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

    // 🔄 自动加载云端用户信息
    const loadCloudData = async () => {
      try {
        const { getUserInfo, getAiMemory } = await import('../lib/cloudService');

        // 加载用户信息
        const userInfoResult = await getUserInfo();
        if (userInfoResult.success && userInfoResult.content) {
          setUserInfo(userInfoResult.content);
        }

        // 加载 AI 记忆
        const aiMemoryResult = await getAiMemory();
        if (aiMemoryResult.success && aiMemoryResult.content) {
          setAiMemory(aiMemoryResult.content);
        }
      } catch (error) {
        console.error('加载云端数据失败:', error);
      }
    };

    loadCloudData();

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
    // 🔥 v2.11.5 新增：同步 API Key 到云端
    // 登录用户：保存到云端（包括清空的情况）
    // 未登录用户：只保存到本地
    if (currentUser) {
      try {
        const { saveApiKey } = await import('../lib/cloudService');
        const apiKeyToSave = localConfig.apiKey || ''; // 空字符串表示清空
        const result = await saveApiKey(apiKeyToSave);
        if (result.success) {
          console.log('✅ [Settings] API Key 已同步到云端');

          // 🔥 v2.11.5 关键修复：更新 currentUser 对象，添加 api_key 字段
          const updatedUser = {
            ...currentUser,
            api_key: apiKeyToSave,
            has_api_key: !!apiKeyToSave && apiKeyToSave.length > 0
          };
          // 更新 localStorage
          localStorage.setItem('xiaobai_user', JSON.stringify(updatedUser));
          // 通知父组件更新 currentUser
          if (onUserUpdate) {
            onUserUpdate(updatedUser);
          }
          console.log('✅ [Settings] currentUser 对象已更新');
        } else {
          console.error('❌ [Settings] API Key 同步到云端失败:', result.error);
          // 不阻塞保存流程，只记录错误
        }
      } catch (error) {
        console.error('❌ [Settings] API Key 同步异常:', error);
        // 不阻塞保存流程，只记录错误
      }
    }

    // 保存本地配置
    onSave(localConfig);

    // 🔥 v2.11.7 修复：重新加载 Agent（使 API Key 修改生效）
    try {
      console.log('🔄 [Settings] API Key 已修改，重新加载 Agent...');
      const reloadResult = await window.electronAPI.reloadAgent();
      if (reloadResult.success) {
        console.log('✅ [Settings] Agent 重新加载成功:', reloadResult.message);
        setToast({
          message: '配置已保存，API Key 已更新',
          type: 'success'
        });
      } else {
        console.error('❌ [Settings] Agent 重新加载失败:', reloadResult.error);
        setToast({
          message: '配置已保存，但 API Key 更新失败，请重启应用',
          type: 'warning'
        });
      }
    } catch (error) {
      console.error('❌ [Settings] 重新加载 Agent 异常:', error);
      setToast({
        message: '配置已保存，但请重启应用以使 API Key 生效',
        type: 'warning'
      });
    }
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
        showAlert('❌ 获取失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('获取异常:', error);
      showAlert('❌ 获取失败: ' + error.message, 'error');
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
        showAlert('❌ 获取失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('获取异常:', error);
      showAlert('❌ 获取失败: ' + error.message, 'error');
    } finally {
      setIsLoadingAiMemory(false);
    }
  };

  const handleCheckUpdate = async () => {
    const result = await window.electronAPI.checkForUpdates();
    if (!result) {
      setToast({
        message: '当前已是最新版本',
        type: 'success'
      });
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
        <label className="form-label">
          模型厂商
        
        </label>
        <select
          className="form-input"
          value={localConfig.modelProvider || 'anthropic'}
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

      {currentUser && (
        <div className="form-group">
          <label className="form-label">
            API Key
            <span className="form-hint" style={{ marginLeft: '8px' }}>✨ 支持多个Key（用逗号分隔），系统会自动轮换</span>
          </label>
          <input
            type="password"
            className="form-input"
            value={localConfig.apiKey || ''}
            onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
            placeholder={localConfig.modelProvider === 'zhipu' ? '输入智谱 API Key（多个Key用逗号分隔）' : 'sk-ant-...（多个Key用逗号分隔）'}
          />
        </div>
      )}

      {!currentUser && (
        <div className="form-group">
          <label className="form-label">
            API Key
          </label>
          <div className="info-box" style={{
            padding: '12px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px dashed var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              🔐 登录后可使用自己的 API Key
            </div>
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">
          应用数据目录
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
                showAlert('数据目录路径未知', 'error');
                return;
              }
              try {
                const result = await window.electronAPI.openPath(userDataPathDisplay);
                if (!result.success) {
                  showAlert('打开失败: ' + result.error, 'error');
                }
              } catch (error) {
                showAlert('打开失败: ' + error.message, 'error');
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            打开
          </button>
        </div>
  
      </div>

      <div className="form-group">
        <label className="form-label">
          Token 消耗统计
  
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

  // 渲染高级功能内容
  const renderAdvancedSettings = () => (
    <div className="settings-content animate-in">
      <div className="form-group">
        <label className="form-label">
          <span className="form-title">用户信息</span>
          <button
            className="btn-edit"
            onClick={isEditingUserInfo ? () => setIsEditingUserInfo(false) : handleEditUserInfo}
            disabled={isLoadingUserInfo}
          >
            {isEditingUserInfo ? '预览' : (isLoadingUserInfo ? '加载中...' : '编辑')}
          </button>
        </label>

        {/* 编辑模式 */}
        {isEditingUserInfo && (
          <>
            <textarea
              className="form-textarea"
              value={userInfo}
              onChange={(e) => setUserInfo(e.target.value)}
              placeholder="在此输入用户信息..."
              style={{ minHeight: '150px' }}
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
                      showAlert('✅ 已保存到云端', 'success');
                    } else {
                      showAlert('❌ 保存失败: ' + result.error, 'error');
                    }
                  } catch (error) {
                    console.error('保存异常:', error);
                    showAlert('❌ 保存失败: ' + error.message, 'error');
                  }
                }}
              >
                保存
              </button>
            </div>
          </>
        )}

        {/* 预览模式 */}
        {!isEditingUserInfo && (
          <div className="markdown-preview">
            {userInfo ? (
              <MarkdownRenderer content={userInfo} />
            ) : (
              <div className="empty-state">暂无用户信息</div>
            )}
          </div>
        )}

    
      </div>

      <div className="form-group">
        <label className="form-label">
          <span className="form-title">AI记忆</span>
    
          <button
            className="btn-edit"
            onClick={isEditingAiMemory ? () => setIsEditingAiMemory(false) : handleEditAiMemory}
            disabled={isLoadingAiMemory}
          >
            {isEditingAiMemory ? '预览' : (isLoadingAiMemory ? '加载中...' : '编辑')}
          </button>
        </label>

        {/* 编辑模式 */}
        {isEditingAiMemory && (
          <>
            <textarea
              className="form-textarea"
              value={aiMemory}
              onChange={(e) => setAiMemory(e.target.value)}
              placeholder="在此输入AI记忆..."
              style={{ minHeight: '150px' }}
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

                    // v2.9.8 - 同时保存到云端和本地文件
                    // 1. 先保存到云端数据库（通过 cloudService）
                    const cloudResult = await saveAiMemory(aiMemory);

                    // 2. 再保存到本地文件（通过 Electron IPC）
                    const localResult = await window.electronAPI.saveAiMemory(aiMemory);

                    if (cloudResult.success && localResult.success) {
                      setIsEditingAiMemory(false);
                      showAlert('✅ 已保存到云端和本地', 'success');
                    } else {
                      const errors = [];
                      if (!cloudResult.success) errors.push('云端: ' + cloudResult.error);
                      if (!localResult.success) errors.push('本地: ' + localResult.error);
                      showAlert('❌ 部分保存失败: ' + errors.join(', '), 'error');
                    }
                  } catch (error) {
                    console.error('保存异常:', error);
                    showAlert('❌ 保存失败: ' + error.message, 'error');
                  }
                }}
              >
                保存
              </button>
            </div>
          </>
        )}

        {/* 预览模式 */}
        {!isEditingAiMemory && (
          <div className="markdown-preview">
            {aiMemory ? (
              <MarkdownRenderer content={aiMemory} />
            ) : (
              <div className="empty-state">暂无 AI 记忆</div>
            )}
          </div>
        )}

     
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
          <span className="about-version">v{APP_VERSION}</span>

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
          <div className="update-notice" onClick={handleDownloadUpdate} title="点击立即更新">
            <div className="update-notice-text">
              发现新版本，点击此处或版本标签立即更新
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
    <div className={`modal-overlay ${getPlatformClassNames().join(' ')}`} onClick={onClose}>
      <div className={`modal settings-modal ${getPlatformClassNames().join(' ')}`} onClick={(e) => e.stopPropagation()}>
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

      {toast && (
        <ToastModal
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default SettingsModal;
