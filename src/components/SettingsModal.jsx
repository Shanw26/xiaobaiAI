import { useState, useEffect } from 'react';
import './SettingsModal.css';

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

function SettingsModal({ config, onSave, onClose }) {
  const [localConfig, setLocalConfig] = useState({ ...config });
  const [workDirDisplay, setWorkDirDisplay] = useState(config.workDirectory || '');
  const [globalPromptDisplay, setGlobalPromptDisplay] = useState(config.globalPromptPath || '');
  const [memoryPathDisplay, setMemoryPathDisplay] = useState('');
  const [globalPromptContent, setGlobalPromptContent] = useState('');
  const [showGlobalPromptEditor, setShowGlobalPromptEditor] = useState(false);
  const [expandedSection, setExpandedSection] = useState('basic'); // 'basic' or 'advanced'

  useEffect(() => {
    setLocalConfig({ ...config });
    setWorkDirDisplay(config.workDirectory || '');
    setGlobalPromptDisplay(config.globalPromptPath || '');
    // 获取记忆文件路径
    window.electronAPI.getMemoryFilePath().then(path => {
      setMemoryPathDisplay(path);
    });
    // 如果设置了全局设置文件，读取内容
    if (config.globalPromptPath) {
      window.electronAPI.readFile(config.globalPromptPath).then(result => {
        if (result.success) {
          setGlobalPromptContent(result.content);
        }
      });
    }
  }, [config]);

  const handleSelectDirectory = async () => {
    const selected = await window.electronAPI.selectDirectory();
    if (selected) {
      setWorkDirDisplay(selected);
      setLocalConfig({ ...localConfig, workDirectory: selected });
    }
  };

  const handleSelectGlobalPrompt = async () => {
    const selected = await window.electronAPI.selectFiles();
    if (selected && selected.length > 0) {
      const path = selected[0];
      setGlobalPromptDisplay(path);
      setLocalConfig({ ...localConfig, globalPromptPath: path });
    }
  };

  const handleClearGlobalPrompt = () => {
    setGlobalPromptDisplay('');
    setLocalConfig({ ...localConfig, globalPromptPath: '' });
  };

  const toggleBasicSection = () => {
    setExpandedSection(expandedSection === 'basic' ? '' : 'basic');
  };

  const toggleAdvancedSection = () => {
    setExpandedSection(expandedSection === 'advanced' ? '' : 'advanced');
  };

  const handleSave = () => {
    if (!localConfig.apiKey) {
      alert('请输入 API Key');
      return;
    }
    onSave(localConfig);
  };

  const currentProvider = MODEL_PROVIDERS[localConfig.modelProvider];
  const currentModels = currentProvider?.models || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">设置</div>
        </div>

        <div className="form-section">
          <div
            className="form-section-header"
            onClick={toggleBasicSection}
          >
            <div className="form-section-title">基础配置</div>
            <svg
              className={`collapse-icon ${expandedSection === 'basic' ? 'expanded' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {expandedSection === 'basic' && (
            <>
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
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              选择目录
            </button>
          </div>
        </div>
            </>
          )}
        </div>

        <div className="form-section">
          <div
            className="form-section-header"
            onClick={toggleAdvancedSection}
          >
            <div className="form-section-title">高级功能</div>
            <svg
              className={`collapse-icon ${expandedSection === 'advanced' ? 'expanded' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {expandedSection === 'advanced' && (
            <>
              <div className="form-group">
            <label className="form-label">
              全局设置
              <span className="form-hint">可选，为 AI 提供全局指令</span>
            </label>
            {globalPromptDisplay ? (
              <div className="directory-selector">
                <input
                  type="text"
                  className="form-input"
                  value="已设置"
                  readOnly
                  style={{ background: 'var(--bg-secondary)' }}
                />
                <button
                  className="btn-select"
                  onClick={() => setShowGlobalPromptEditor(true)}
                >
                  编辑
                </button>
                <button className="btn-select danger" onClick={handleClearGlobalPrompt}>
                  清除
                </button>
              </div>
            ) : (
              <div className="directory-selector">
                <button
                  className="btn-select"
                  onClick={() => setShowGlobalPromptEditor(true)}
                  style={{ flex: 1 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  直接编写
                </button>
                <button className="btn-select" onClick={handleSelectGlobalPrompt}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  上传文件
                </button>
              </div>
            )}
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
              💡 记忆文件会自动保存对话记录，AI 可以根据历史信息提供更个性化的回复
            </div>
          </div>
            </>
          )}
        </div>

        {showGlobalPromptEditor && (
          <div className="modal-overlay" onClick={() => setShowGlobalPromptEditor(false)}>
            <div className="editor-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">编辑全局设置</div>
              </div>
              <textarea
                className="editor-textarea"
                placeholder="在此输入全局指令..."
                value={globalPromptContent}
                onChange={(e) => setGlobalPromptContent(e.target.value)}
              />
              <div className="modal-actions">
                <button
                  className="btn-modal secondary"
                  onClick={() => setShowGlobalPromptEditor(false)}
                >
                  取消
                </button>
                <button
                  className="btn-modal primary"
                  onClick={async () => {
                    // 保存到用户数据目录
                    const userDataPath = await window.electronAPI.getUserDataPath();
                    const settingPath = `${userDataPath}/lusun-setting.md`;
                    const result = await window.electronAPI.writeFile(
                      settingPath,
                      globalPromptContent
                    );
                    if (result.success) {
                      setGlobalPromptDisplay(settingPath);
                      setLocalConfig({ ...localConfig, globalPromptPath: settingPath });
                      setShowGlobalPromptEditor(false);
                      alert('保存成功');
                    } else {
                      alert('保存失败: ' + result.error);
                    }
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

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
