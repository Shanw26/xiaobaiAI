import { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, signOut } from '../lib/cloudService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初始化：检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔍 [AuthContext] 检查登录状态...');
      const user = await getCurrentUser();
      if (user) {
        console.log('✅ [AuthContext] 用户已登录:', user.phone);
        setCurrentUser(user);
      } else {
        console.log('ℹ️  [AuthContext] 未登录');
      }
    } catch (error) {
      console.error('❌ [AuthContext] 检查登录状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = (user) => {
    console.log('📝 [AuthContext] 用户登录:', user.phone);
    // 保存到 localStorage，刷新页面后可以恢复
    localStorage.setItem('xiaobai_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const logout = async () => {
    try {
      console.log('🚪 [AuthContext] 用户退出登录');
      await signOut();
      setCurrentUser(null);
    } catch (error) {
      console.error('❌ [AuthContext] 退出登录失败:', error);
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    logout,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
