/**
 * 小白AI 全局配置
 *
 * 集中管理应用配置，避免硬编码
 */

// 🔥 从 package.json 读取版本号（自动同步）
// 注意：这里的版本号会在构建时由 Vite 注入
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '2.20.7';

// 应用信息
export const APP_NAME = '小白AI';
export const APP_FULL_NAME = '小白AI - 操作系统级AI助手';

// GitHub 相关
export const GITHUB_REPO = 'Shanw26/xiaobaiAI';
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;
export const GITHUB_RELEASES_URL = `${GITHUB_URL}/releases`;

// 更新检查 API
export const UPDATE_CHECK_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// Supabase 配置（从环境变量读取）
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 调试模式
export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;
