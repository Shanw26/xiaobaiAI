import './Sidebar.css';

// 简单的日期分组函数
function getDateGroup(createdAt) {
  const date = new Date(createdAt);
  const now = new Date();
  const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) return 'today';
  if (daysDiff === 1) return 'yesterday';
  if (daysDiff <= 7) return 'week';
  return 'older';
}

function Sidebar({
  conversations,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onOpenSettings,
  currentUser,
}) {
  const groupedConversations = conversations.reduce((groups, conv) => {
    const group = getDateGroup(conv.createdAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(conv);
    return groups;
  }, {});

  const groupNames = {
    today: '今天',
    yesterday: '昨天',
    week: '过去 7 天',
    older: '更早',
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <img src="/logo.svg" alt="小白AI Logo" />
          </div>
          <div className="logo-info">
            <span className="logo-text">小白AI</span>
            <span className="logo-version">v2.5.1</span>
          </div>
        </div>
        <button className="btn-new-chat" onClick={onNewChat}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新对话
        </button>
      </div>

      <div className="sidebar-content">
        {Object.entries(groupedConversations).map(([groupKey, groupConvs]) => (
          <div key={groupKey} className="sidebar-section">
            <div className="sidebar-title">{groupNames[groupKey]}</div>
            {groupConvs.map((conv) => (
              <div
                key={conv.id}
                className={`chat-item ${currentChatId === conv.id ? 'active' : ''}`}
                onClick={() => onSelectChat(conv.id)}
              >
                <div className="chat-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="chat-item-info">
                  <div className="chat-item-title">{conv.title}</div>
                  <div className="chat-item-preview">
                    {conv.messages[0]?.content.slice(0, 30) || '空对话'}...
                  </div>
                </div>
                <div className="chat-item-action">
                  <button
                    className="btn-icon-small"
                    title="删除"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('确定删除这个对话吗？')) {
                        onDeleteChat(conv.id);
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="btn-settings" onClick={onOpenSettings}>
          {currentUser ? (
            <span className="settings-user-avatar">
              {currentUser.phone ? currentUser.phone.slice(-2) : '用户'}
            </span>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6M1 12h6m6 0h6" />
              <circle cx="12" cy="12" r="9" strokeDasharray="4 4" />
            </svg>
          )}
          设置
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
