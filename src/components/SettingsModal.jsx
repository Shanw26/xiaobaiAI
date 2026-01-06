import { useState, useEffect } from 'react';
import './SettingsModal.css';

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

// 设置分类
const SETTINGS_CATEGORIES = [
  { id: 'basic', name: '基础配置', icon: '⚙️' },
  { id: 'advanced', name: '高级功能', icon: '🔧' },
  { id: 'about', name: '关于', icon: 'ℹ️' },
];

function SettingsModal({ config, onSave, onClose }) {
  const [localConfig, setLocalConfig] = useState({ ...config });
  const [workDirDisplay, setWorkDirDisplay] = useState(config.workDirectory || '');
  const [memoryPathDisplay, setMemoryPathDisplay] = useState('');
  const [tokenUsage, setTokenUsage] = useState(null);
  const [activeCategory, setActiveCategory] = useState('basic');

  useEffect(() => {
    setLocalConfig({ ...config });
    setWorkDirDisplay(config.workDirectory || '');
    // 获取记忆文件路径
    window.electronAPI.getMemoryFilePath().then(path => {
      setMemoryPathDisplay(path);
    });
    // 获取token使用记录
    window.electronAPI.getTokenUsage().then(result => {
      if (result.success) {
        setTokenUsage(result.data);
      }
    });
  }, [config]);

  const handleSelectDirectory = async () => {
    const selected = await window.electronAPI.selectDirectory();
    if (selected) {
      setWorkDirDisplay(selected);
      setLocalConfig({ ...localConfig, workDirectory: selected });
    }
  };

  const handleSave = async () => {
    if (!localConfig.apiKey) {
      alert('请输入 API Key');
      return;
    }

    // 检查工作目录是否改变
    const newWorkDir = localConfig.workDirectory;
    const oldWorkDir = config.workDirectory;

    // 如果工作目录有变化，进行迁移
    if (newWorkDir && newWorkDir !== oldWorkDir) {
      try {
        const result = await window.electronAPI.migrateWorkDirectory(newWorkDir);

        if (result.success && result.migrated) {
          // 迁移成功，显示提示信息
          const message = result.message || '工作目录已更新';
          const details = result.errors
            ? `\n\n跳过的项目：\n${result.errors.join('\n')}`
            : '';

          alert(`✅ ${message}${details}\n\n旧目录：${result.oldWorkDir}\n新目录：${result.newWorkDir}`);
        } else if (result.success && !result.migrated) {
          // 不需要迁移
          console.log(result.message);
        }
      } catch (error) {
        alert('迁移工作目录失败: ' + error.message);
        return;
      }
    }

    onSave(localConfig);
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

      <div className="form-group">
        <label className="form-label">工作目录</label>
        <div className="directory-selector">
          <input
            type="text"
            className="form-input"
            placeholder="选择工作目录"
            value={workDirDisplay}
            readOnly
          />
          <button className="btn-select" onClick={handleSelectDirectory}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 19a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            选择目录
          </button>
        </div>
        <div className="form-help">
          💡 小白AI创建的文件都会保存在这个目录中。默认：~/Downloads/小白AI工作目录
        </div>
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
        <div className="directory-selector">
          <input
            type="text"
            className="form-input"
            value="用户信息.md"
            readOnly
            style={{ background: 'var(--bg-secondary)' }}
          />
          <button
            className="btn-select"
            onClick={async () => {
              const userInfoPath = `${localConfig.workDirectory || '~/Downloads/小白AI工作目录'}/用户信息.md`;
              try {
                const result = await window.electronAPI.openInExplorer(userInfoPath);
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
          💡 当你告诉 AI 你的个人信息时，它会记录在这个文件中，方便更好地了解你
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          记忆文件
          <span className="form-hint">自动记录对话历史</span>
        </label>
        <div className="directory-selector">
          <input
            type="text"
            className="form-input"
            value={memoryPathDisplay || '未创建'}
            readOnly
            style={{ background: 'var(--bg-secondary)' }}
          />
          <button
            className="btn-select"
            onClick={async () => {
              if (!memoryPathDisplay) {
                alert('记忆文件尚未创建');
                return;
              }
              try {
                const result = await window.electronAPI.openInExplorer(memoryPathDisplay);
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
          💡 记忆文件保存在工作目录中（小白AI记忆.md），AI 可以根据历史信息提供更个性化的回复
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h2 className="about-title">小白AI</h2>
        <div className="about-version">v1.8.2</div>
        <p className="about-description">
          基于 Claude Agent SDK 的 AI 助手客户端，简单、强大、易用。
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
