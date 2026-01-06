import { useState, useEffect } from 'react';
import './AdminPanel.css';

function AdminPanel({ onClose }) {
  const [view, setView] = useState('stats'); // stats, users, user-detail
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // 加载统计数据
  const loadStats = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.adminGetStats();
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.adminGetUsers();
      if (result.success) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 查看用户详情
  const viewUserDetail = async (userId) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.adminGetUserDetail(userId);
      if (result.success) {
        setSelectedUser(result.user);
        setView('user-detail');
      }
    } catch (error) {
      console.error('加载用户详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载统计数据
  useEffect(() => {
    if (view === 'stats') loadStats();
    if (view === 'users') loadUsers();
  }, [view]);

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="admin-header">
          <h2>📊 后台管理</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        {/* 侧边栏 */}
        <div className="admin-layout">
          <div className="admin-sidebar">
            <button
              className={`admin-nav-item ${view === 'stats' ? 'active' : ''}`}
              onClick={() => setView('stats')}
            >
              📈 数据统计
            </button>
            <button
              className={`admin-nav-item ${view === 'users' ? 'active' : ''}`}
              onClick={() => setView('users')}
            >
              👥 用户列表
            </button>
            {selectedUser && (
              <button
                className={`admin-nav-item ${view === 'user-detail' ? 'active' : ''}`}
                onClick={() => setView('user-detail')}
              >
                📝 用户详情
              </button>
            )}
          </div>

          {/* 内容区 */}
          <div className="admin-content">
            {loading && <div className="admin-loading">加载中...</div>}

            {!loading && view === 'stats' && stats && (
              <div className="stats-view">
                <div className="stats-cards">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.userCount}</div>
                      <div className="stat-label">注册用户</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">🎭</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.uniqueGuests}</div>
                      <div className="stat-label">游客数量</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.totalRequests}</div>
                      <div className="stat-label">总请求数</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.todayRequests}</div>
                      <div className="stat-label">今日请求</div>
                    </div>
                  </div>
                </div>

                <div className="stats-section">
                  <h3>最近7天请求趋势</h3>
                  {stats.weekTrend && stats.weekTrend.length > 0 ? (
                    <div className="trend-chart">
                      {stats.weekTrend.map((item) => (
                        <div key={item.date} className="trend-item">
                          <div className="trend-date">{item.date}</div>
                          <div className="trend-bar">
                            <div
                              className="trend-fill"
                              style={{ width: `${Math.min(100, (item.requests / Math.max(...stats.weekTrend.map(d => d.requests))) * 100)}%` }}
                            />
                          </div>
                          <div className="trend-value">{item.requests}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">暂无数据</p>
                  )}
                </div>
              </div>
            )}

            {!loading && view === 'users' && (
              <div className="users-view">
                <h3>用户列表 ({users.length})</h3>
                {users.length === 0 ? (
                  <p className="empty-text">暂无用户</p>
                ) : (
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>手机号</th>
                        <th>注册时间</th>
                        <th>最后登录</th>
                        <th>请求数</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.phone}</td>
                          <td>{new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
                          <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('zh-CN') : '-'}</td>
                          <td>{user.total_requests}</td>
                          <td>
                            <button
                              className="btn-view"
                              onClick={() => viewUserDetail(user.id)}
                            >
                              查看详情
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {!loading && view === 'user-detail' && selectedUser && (
              <div className="user-detail-view">
                <button className="btn-back" onClick={() => setView('users')}>
                  ← 返回用户列表
                </button>

                <h3>用户详情</h3>
                <div className="user-info-card">
                  <div className="user-info-row">
                    <span className="label">手机号：</span>
                    <span className="value">{selectedUser.phone}</span>
                  </div>
                  <div className="user-info-row">
                    <span className="label">用户ID：</span>
                    <span className="value">{selectedUser.id}</span>
                  </div>
                  <div className="user-info-row">
                    <span className="label">注册时间：</span>
                    <span className="value">{new Date(selectedUser.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                  <div className="user-info-row">
                    <span className="label">最后登录：</span>
                    <span className="value">{selectedUser.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString('zh-CN') : '-'}</span>
                  </div>
                  <div className="user-info-row">
                    <span className="label">总请求数：</span>
                    <span className="value">{selectedUser.total_requests}</span>
                  </div>
                </div>

                <h4>API Key</h4>
                <div className="api-key-card">
                  <code>{selectedUser.api_key || '未配置'}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
