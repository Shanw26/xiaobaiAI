const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 引入数据库模块用于获取 device_id
const db = require('./database');

// v2.9.8 - 导入 Supabase 客户端用于读取云端记忆
let supabaseAdmin = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  // 从环境变量获取 Supabase URL 和 Key
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
  }
} catch (error) {
  // Supabase 不可用时，只使用本地文件
}

/**
 * 安全的日志记录函数（避免 EPIPE 错误）
 * 在 Electron 主进程中使用，避免向已关闭的流写入数据
 */
function safeLog(...args) {
  try {
    // 检查 process.stdout 是否可写
    if (process.stdout && process.stdout.writable) {
      console.log(...args);
    }
  } catch (error) {
    // 忽略输出错误，避免崩溃
  }
}

function safeError(...args) {
  try {
    // 检查 process.stderr 是否可写
    if (process.stderr && process.stderr.writable) {
      console.error(...args);
    }
  } catch (error) {
    // 忽略输出错误，避免崩溃
  }
}

/**
 * 将文件或文件夹移到回收站
 * @param {string} filePath - 文件或文件夹路径
 * @returns {Promise<void>}
 */
async function moveToTrash(filePath) {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS: 使用 AppleScript
    const script = `tell application "Finder" to move POSIX file "${filePath}" to trash`;
    await execPromise(`osascript -e '${script}'`);
  } else if (platform === 'win32') {
    // Windows: 使用 PowerShell
    // 🔥 关键修复：Windows 路径需要正确转义，使用 .NET 方法避免路径问题
    const escapedPath = filePath.replace(/\\/g, '\\\\').replace(/'/g, "''");
    const script = `
      $shell = New-Object -ComObject Shell.Application
      $folder = $shell.Namespace('${escapedPath.substring(0, escapedPath.lastIndexOf('\\'))}')
      $item = $folder.ParseName('${escapedPath.substring(escapedPath.lastIndexOf('\\') + 1)}')
      $item.InvokeVerb('Delete')
    `;
    await execPromise(`powershell -NoProfile -Command "${script.replace(/\n/g, '').replace(/\s+/g, ' ')}"`, {
      shell: 'powershell.exe',
      windowsHide: true
    });
  } else {
    // Linux: 使用 gvfs-trash 或 trash-cli
    try {
      await execPromise(`gvfs-trash "${filePath}"`);
    } catch (error) {
      // 如果 gvfs-trash 不可用，尝试 trash-cli
      await execPromise(`trash-put "${filePath}"`);
    }
  }
}

/**
 * 清空回收站
 * @returns {Promise<void>}
 */
async function emptyTrash() {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS: 使用 AppleScript 清空回收站
    const script = 'tell application "Finder" to empty trash';
    await execPromise(`osascript -e '${script}'`);
    safeLog('✅ macOS 回收站已清空');
  } else if (platform === 'win32') {
    // Windows: 使用 PowerShell 清空回收站
    const script = `
      $shell = New-Object -ComObject Shell.Application
      $shell.Namespace(0xA).Items() | ForEach-Object { Remove-Item $_.Path -Recurse -Force }
    `;
    await execPromise(`powershell -NoProfile -Command "${script.replace(/\n/g, '').replace(/\s+/g, ' ')}"`, {
      shell: 'powershell.exe',
      windowsHide: true
    });
    safeLog('✅ Windows 回收站已清空');
  } else {
    // Linux: 清空 ~/.local/share/Trash/
    await execPromise('rm -rf ~/.local/share/Trash/*');
    safeLog('✅ Linux 回收站已清空');
  }
}

// 模型提供商配置
const MODEL_PROVIDERS = {
  anthropic: {
    name: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
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

// v2.9.1 - 取消默认工作目录，不再使用固定的工作目录
let workDirectory = null;

// v2.10.23 - AI 记忆缓存，避免每次都读取文件
let aiMemoryCache = null;
let aiMemoryCacheTime = null;
const AI_MEMORY_CACHE_TTL = 5 * 60 * 1000; // 缓存5分钟

/**
 * 设置工作目录
 */
function setWorkDirectory(dir) {
  workDirectory = dir;
}

/**
 * 获取工作目录
 */
function getWorkDirectory() {
  return workDirectory;
}

/**
 * 定义文件操作工具（使用 Anthropic 工具格式）
 */
const FILE_TOOLS = [
  {
    name: 'write_file',
    description: '向文件写入内容。如果文件存在则覆盖，如果不存在则创建新文件。\\n\\n重要说明：\\n- 必须使用绝对路径（Windows: C:\\\\Users\\\\xxx, macOS/Linux: /Users/xxx）或用户主目录路径（以 ~/ 开头）\\n- 不支持相对路径\\n- 文件路径必须由用户明确指定\\n\\n返回格式要求：\\n- 创建成功后，使用格式：✅ 文件已创建：`/完整/文件/路径`\\n- 文件路径必须用反引号包裹，这样用户可以点击打开',
    input_schema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: '文件的绝对路径（Windows: C:\\\\Users\\\\xxx.txt, macOS/Linux: /Users/xxx.txt, 或 ~/xxx.txt）',
        },
        content: {
          type: 'string',
          description: '要写入文件的内容',
        },
      },
      required: ['filePath', 'content'],
    },
  },
  {
    name: 'read_file',
    description: '读取文件内容。必须使用绝对路径（Windows: C:\\\\Users\\\\xxx, macOS/Linux: /Users/xxx, 或 ~/xxx）',
    input_schema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: '文件的绝对路径（Windows: C:\\\\Users\\\\xxx.txt, macOS/Linux: /Users/xxx.txt, 或 ~/xxx.txt）',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'list_directory',
    description: '列出目录中的文件和子目录。必须使用绝对路径（Windows: C:\\\\Users\\\\xxx, macOS/Linux: /Users/xxx, 或 ~/xxx）',
    input_schema: {
      type: 'object',
      properties: {
        dirPath: {
          type: 'string',
          description: '目录的绝对路径（Windows: C:\\\\Users\\\\xxx, macOS/Linux: /Users/xxx, 或 ~/xxx）',
        },
      },
      required: [],
    },
  },
  {
    name: 'empty_trash',
    description: '清空回收站（删除所有已删除的文件）。⚠️ 注意：此操作不可逆，请谨慎使用！\n\n支持平台：\n- macOS: 使用 AppleScript 清空回收站\n- Windows: 使用 PowerShell 清空回收站\n- Linux: 清空 ~/.local/share/Trash/ 目录\n\n返回格式：\n- 成功：✅ 回收站已清空\n- 失败：❌ 清空回收站失败：[错误信息]',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_directory',
    description: '创建新目录',
    input_schema: {
      type: 'object',
      properties: {
        dirPath: {
          type: 'string',
          description: '目录的相对路径或绝对路径',
        },
      },
      required: ['dirPath'],
    },
  },
  {
    name: 'delete_file',
    description: '删除文件或文件夹。⚠️ 注意：此操作不可逆，请谨慎使用！可以删除任意位置的文件或文件夹。',
    input_schema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: '文件或文件夹的相对路径或绝对路径',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'execute_command',
    description: '执行终端命令（shell命令）。⚠️ 注意：此功能非常强大，可以执行任意系统命令，请谨慎使用！\n\n使用场景：\n- 系统管理操作（如：删除、移动、查找文件）\n- 执行脚本或程序\n- 查看系统信息\n- 网络操作\n\n示例命令：\n- macOS: ls -la, find . -name "*.txt", ps aux\n- Windows: dir, tasklist\n- Linux: ls, pwd, top',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '要执行的终端命令',
        },
        options: {
          type: 'object',
          description: '执行选项（可选）',
          properties: {
            timeout: {
              type: 'number',
              description: '超时时间（毫秒），默认 30000（30秒）',
            },
            cwd: {
              type: 'string',
              description: '工作目录（可选）',
            },
          },
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'save_user_info',
    description: '保存用户信息到全局配置文件。当用户主动提供个人信息（如姓名、职业、偏好等）时使用此工具保存。\n\n使用场景：\n- 用户说："我叫晓力"\n- 用户说："我是产品经理"\n- 用户说："我喜欢简洁的设计"\n\n重要：必须先征得用户同意才能保存！',
    input_schema: {
      type: 'object',
      properties: {
        info: {
          type: 'string',
          description: '用户信息内容（格式：键: 值，例如 "姓名: 晓力" 或 "职业: 产品经理"）',
        },
      },
      required: ['info'],
    },
  },
  {
    name: 'get_user_info',
    description: '获取已保存的用户信息。在需要了解用户背景时使用此工具。',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_ai_memory',
    description: '获取AI对话记忆，包括用户偏好、重要对话记录、常用操作等。⭐ 重要：每次回答问题前都应该先读取记忆！\n\n使用场景：\n- 回答问题前（必须先执行）\n- 了解用户偏好和习惯\n- 查看历史重要对话\n- 避免重复询问用户信息\n\n返回内容：\n- 用户偏好和习惯\n- 重要对话记录\n- 常用操作和命令\n- 技术栈和项目信息',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'save_ai_memory',
    description: '保存AI对话记忆，记录用户偏好、重要对话、常用操作等。\n\n使用场景：\n- 用户提到偏好："我喜欢用简短的命令"\n- 用户提到习惯："我每天都会检查日志"\n- 重要对话记录：技术方案、决策过程\n- 常用操作：经常执行的命令\n\n重要：必须先征得用户同意才能保存！\n\n格式要求：\n- 使用 Markdown 格式\n- 按类别组织（用户偏好、重要对话、常用操作）\n- 简洁明了，便于快速查阅',
    input_schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'AI记忆内容（Markdown格式，按类别组织）',
        },
      },
      required: ['content'],
    },
  },
];

/**
 * 工具处理器
 */
async function handleToolUse(toolName, input) {
  safeLog(`Agent: 调用工具 ${toolName}`, input);

  try {
    switch (toolName) {
      case 'write_file': {
        let filePath = input.filePath;
        // v2.10.6 - 支持跨平台绝对路径检查
        // Windows: C:\Users\xxx, macOS/Linux: /Users/xxx, 所有平台: ~/xxx
        const isWindowsAbsPath = process.platform === 'win32' && /^[a-zA-Z]:\\/.test(filePath);
        if (!path.isAbsolute(filePath) && !filePath.startsWith('~/') && !isWindowsAbsPath) {
          return '错误：文件操作必须使用绝对路径。\\n\\nWindows 示例：C:\\\\Users\\\\用户名\\\\文件.txt\\nmacOS/Linux 示例：/Users/用户名/文件.txt\\n或使用 ~/: ~/Documents/文件.txt';
        }

        // 处理 ~/ 路径
        if (filePath.startsWith('~/')) {
          filePath = path.join(os.homedir(), filePath.slice(2));
        }

        // 确保目录存在
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        // 写入文件
        await fs.writeFile(filePath, input.content, 'utf-8');
        safeLog(`✓ 文件已创建: ${filePath}`);
        // v2.9.2 - 返回格式化的消息，文件路径用反引号包裹以便识别
        return `✅ 文件已创建：\`${filePath}\``;
      }

      case 'read_file': {
        let filePath = input.filePath;
        // v2.10.6 - 支持跨平台绝对路径检查
        const isWindowsAbsPath = process.platform === 'win32' && /^[a-zA-Z]:\\/.test(filePath);
        if (!path.isAbsolute(filePath) && !filePath.startsWith('~/') && !isWindowsAbsPath) {
          return '错误：文件操作必须使用绝对路径。\\n\\nWindows 示例：C:\\\\Users\\\\用户名\\\\文件.txt\\nmacOS/Linux 示例：/Users/用户名/文件.txt\\n或使用 ~/: ~/Documents/文件.txt';
        }

        // 处理 ~/ 路径
        if (filePath.startsWith('~/')) {
          filePath = path.join(os.homedir(), filePath.slice(2));
        }

        const content = await fs.readFile(filePath, 'utf-8');
        safeLog(`✓ 文件已读取: ${filePath}`);
        return content;
      }

      case 'list_directory': {
        let dirPath = input.dirPath;
        // v2.10.6 - 支持跨平台绝对路径检查
        const isWindowsAbsPath = process.platform === 'win32' && /^[a-zA-Z]:\\/.test(dirPath);
        if (!dirPath || (!path.isAbsolute(dirPath) && !dirPath.startsWith('~/') && !isWindowsAbsPath)) {
          return '错误：文件操作必须使用绝对路径。\\n\\nWindows 示例：C:\\\\Users\\\\用户名\\\\Documents\\nmacOS/Linux 示例：/Users/用户名/Documents\\n或使用 ~/: ~/Documents';
        }

        // 处理 ~/ 路径
        if (dirPath.startsWith('~/')) {
          dirPath = path.join(os.homedir(), dirPath.slice(2));
        }

        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const items = await Promise.all(
          entries.map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            const stats = await fs.stat(fullPath);
            return {
              name: entry.name,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: stats.size,
            };
          })
        );

        safeLog(`✓ 目录已列出: ${dirPath}`);
        return JSON.stringify(items, null, 2);
      }

      case 'create_directory': {
        let dirPath = input.dirPath;
        // v2.10.6 - 支持跨平台绝对路径检查
        const isWindowsAbsPath = process.platform === 'win32' && /^[a-zA-Z]:\\/.test(dirPath);
        if (!path.isAbsolute(dirPath) && !dirPath.startsWith('~/') && !isWindowsAbsPath) {
          return '错误：文件操作必须使用绝对路径。\\n\\nWindows 示例：C:\\\\Users\\\\用户名\\\\Documents\\nmacOS/Linux 示例：/Users/用户名/Documents\\n或使用 ~/: ~/Documents';
        }

        // 处理 ~/ 路径
        if (dirPath.startsWith('~/')) {
          dirPath = path.join(os.homedir(), dirPath.slice(2));
        }

        await fs.mkdir(dirPath, { recursive: true });
        safeLog(`✓ 目录已创建: ${dirPath}`);
        // v2.9.2 - 返回格式化的消息
        return `✅ 目录已创建：\`${dirPath}\``;
      }

      case 'empty_trash': {
        try {
          await emptyTrash();
          return '✅ 回收站已清空';
        } catch (error) {
          safeError('清空回收站失败:', error);
          return `❌ 清空回收站失败：${error.message}`;
        }
      }

      case 'delete_file': {
        let filePath = input.filePath;
        // v2.10.6 - 支持跨平台绝对路径检查
        const isWindowsAbsPath = process.platform === 'win32' && /^[a-zA-Z]:\\/.test(filePath);
        if (!path.isAbsolute(filePath) && !filePath.startsWith('~/') && !isWindowsAbsPath) {
          return '错误：文件操作必须使用绝对路径。\\n\\nWindows 示例：C:\\\\Users\\\\用户名\\\\文件.txt\\nmacOS/Linux 示例：/Users/用户名/文件.txt\\n或使用 ~/: ~/Documents/文件.txt';
        }

        // 处理 ~/ 路径
        if (filePath.startsWith('~/')) {
          filePath = path.join(os.homedir(), filePath.slice(2));
        }

        // 检查文件/文件夹是否存在
        const stats = await fs.stat(filePath);
        const itemType = stats.isDirectory() ? '文件夹' : '文件';

        // 将文件/文件夹移到回收站
        await moveToTrash(filePath);
        safeLog(`✓ ${itemType}已移到回收站: ${filePath}`);

        // 返回详细信息和恢复提示
        const fileName = path.basename(filePath);
        return `${itemType}已移到回收站: ${fileName}

💡 如需恢复，可以：
1. 打开回收站，右键点击"${fileName}"选择"还原"
2. 或告诉我"帮我从回收站恢复${fileName}"，我可以帮你操作`;
      }

      case 'execute_command': {
        const command = input.command;
        const options = input.options || {};
        const { timeout = 30000, cwd = null } = options;

        safeLog(`执行命令: ${command}`);

        try {
          const execOptions = {
            timeout,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          };

          if (cwd) {
            execOptions.cwd = cwd;
          }

          const { stdout, stderr } = await execPromise(command, execOptions);

          safeLog(`✓ 命令执行成功`);

          let result = `命令执行成功\n`;
          if (stdout) {
            result += `\n输出:\n${stdout}`;
          }
          if (stderr) {
            result += `\n错误输出:\n${stderr}`;
          }

          return result;
        } catch (error) {
          safeError(`命令执行失败:`, error);

          let errorMsg = `命令执行失败: ${error.message}`;
          if (error.stdout) {
            errorMsg += `\n\n输出:\n${error.stdout}`;
          }
          if (error.stderr) {
            errorMsg += `\n\n错误:\n${error.stderr}`;
          }

          return errorMsg;
        }
      }

      case 'save_user_info': {
        // v2.9.1 - 用户信息保存到用户主目录
        const userInfoPath = path.join(os.homedir(), 'xiaobai-user-info.md');

        // 解析用户信息
        const info = input.info;
        let content = '';

        try {
          // 如果文件存在，读取现有内容
          try {
            const existingContent = await fs.readFile(userInfoPath, 'utf-8');
            content = existingContent;
          } catch (err) {
            // 文件不存在，创建新的
            content = '# 用户信息\n\n';
            content += `> 最后更新：${new Date().toLocaleString()}\n\n`;
          }

          // 添加新信息
          content += `- ${info}\n`;

          // 写入文件
          await fs.writeFile(userInfoPath, content, 'utf-8');
          safeLog(`✓ 用户信息已保存: ${info}`);
          return `用户信息已保存：${info}`;
        } catch (error) {
          safeError('保存用户信息失败:', error);
          return `错误: ${error.message}`;
        }
      }

      case 'get_user_info': {
        // v2.9.1 - 用户信息从用户主目录读取
        const userInfoPath = path.join(os.homedir(), 'xiaobai-user-info.md');

        try {
          const content = await fs.readFile(userInfoPath, 'utf-8');
          safeLog('✓ 用户信息已读取');
          return content;
        } catch (error) {
          // 文件不存在，返回默认信息
          const defaultInfo = '# 用户信息\n\n> 暂无用户信息\n\n可以通过对话告诉我你的信息，我会帮你记录下来。';
          return defaultInfo;
        }
      }

      case 'get_ai_memory': {
        // v2.10.0 - 优先从云端读取记忆，支持跨设备同步
        try {
          // 先尝试从云端读取（如果 Supabase 可用）
          if (supabaseAdmin) {
            try {
              // 获取当前设备 ID
              const deviceId = db.getDeviceId();

              // 从云端数据库读取当前设备的记忆
              const { data, error } = await supabaseAdmin
                .from('ai_memory')
                .select('content')
                .eq('device_id', deviceId)
                .maybeSingle();

              if (data && data.content) {
                safeLog('✓ AI记忆已从云端读取 (device_id:', deviceId, ')');
                return data.content;
              } else if (error) {
                safeLog('云端记忆读取失败:', error.message);
              }
            } catch (cloudError) {
              safeLog('云端记忆读取失败，尝试本地文件:', cloudError.message);
            }
          }

          // 从本地文件读取（备用方案）
          const aiMemoryPath = path.join(os.homedir(), 'xiaobai-ai-memory.md');
          const content = await fs.readFile(aiMemoryPath, 'utf-8');
          safeLog('✓ AI记忆已从本地文件读取');
          return content;
        } catch (error) {
          // 文件不存在，返回默认模板
          const defaultMemory = `# AI对话记忆

## 🤖 AI指令区

**每次对话开始时，请先阅读此记忆文件！**

---

## 用户偏好

### 工作习惯
- （待补充）

### 沟通风格
- （待补充）

### 技术偏好
- （待补充）

---

## 重要对话记录

### 技术讨论
- （待补充）

### 产品决策
- （待补充）

---

## 常用操作

### 日常任务
- （待补充）

### 常用命令
- （待补充）

---

**最后更新**：${new Date().toLocaleString()}`;
          safeLog('✓ AI记忆使用默认模板');
          return defaultMemory;
        }
      }

      case 'save_ai_memory': {
        // v2.10.0 - AI记忆同时保存到本地文件和云端数据库（支持跨设备同步）
        const aiMemoryPath = path.join(os.homedir(), 'xiaobai-ai-memory.md');

        try {
          // 1. 写入本地文件
          await fs.writeFile(aiMemoryPath, input.content, 'utf-8');
          safeLog(`✓ AI记忆已保存到本地文件`);

          // 2. 同步到云端数据库（如果 Supabase 可用）
          if (supabaseAdmin) {
            try {
              const deviceId = db.getDeviceId();

              // 使用 upsert：如果存在则更新，不存在则插入
              const { data, error } = await supabaseAdmin
                .from('ai_memory')
                .upsert({
                  device_id: deviceId,
                  content: input.content,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'device_id' // 如果 device_id 冲突，则更新
                });

              if (error) {
                safeLog('⚠️ 云端记忆保存失败:', error.message);
              } else {
                safeLog('✓ AI记忆已同步到云端 (device_id:', deviceId, ')');
              }
            } catch (cloudError) {
              safeLog('⚠️ 云端记忆同步失败:', cloudError.message);
            }
          }

          return 'AI记忆已保存成功';
        } catch (error) {
          safeError('保存AI记忆失败:', error);
          return `错误: ${error.message}`;
        }
      }

      default:
        return `错误: 未知的工具 - ${toolName}`;
    }
  } catch (error) {
    safeError(`工具调用失败: ${toolName}`, error);
    return `错误: ${error.message}`;
  }
}

/**
 * 创建 AI Agent（使用 Anthropic SDK）
 * @param {string} provider - 模型提供商 ('anthropic' | 'zhipu')
 * @param {string} apiKey - API Key
 * @param {string} model - 模型 ID
 * @param {object} options - 额外选项
 */
async function createAgent(provider, apiKey, model, options = {}) {
  safeLog('Agent: 开始创建客户端', { provider, model, hasApiKey: !!apiKey });

  const { default: Anthropic } = await import('@anthropic-ai/sdk');

  const providerConfig = MODEL_PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`不支持的模型提供商: ${provider}`);
  }

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API Key 为空，无法创建 Agent 客户端');
  }

  // 创建 Anthropic 客户端
  const client = new Anthropic({
    apiKey: apiKey,
    baseURL: providerConfig.baseUrl,
  });

  safeLog('Agent: 客户端创建成功（已配置文件操作工具）');

  // ✨ v2.10.11 修复：返回对象中包含 apiKey，用于创建新实例
  return {
    client,
    model,
    provider,
    apiKey,  // ← 保存 apiKey，用于后续创建新实例
    hasTools: true,
  };
}

/**
 * 自动加载 AI 记忆（无需 AI 调用工具）- v2.10.23 添加缓存
 * @returns {Promise<string>} 记忆内容
 */
async function loadAIMemory() {
  try {
    // v2.10.23 - 检查缓存是否有效
    const now = Date.now();
    if (aiMemoryCache && aiMemoryCacheTime && (now - aiMemoryCacheTime < AI_MEMORY_CACHE_TTL)) {
      safeLog('✓ AI 记忆使用缓存');
      return aiMemoryCache;
    }

    // 优先从云端读取
    if (supabaseAdmin) {
      try {
        const deviceId = db.getDeviceId();
        const { data, error } = await supabaseAdmin
          .from('ai_memory')
          .select('content')
          .eq('device_id', deviceId)
          .maybeSingle();

        if (data && data.content) {
          safeLog('✓ AI 记忆已从云端读取');
          aiMemoryCache = data.content;
          aiMemoryCacheTime = now;
          return data.content;
        }
      } catch (cloudError) {
        safeLog('云端记忆读取失败，尝试本地文件');
      }
    }

    // 从本地文件读取
    const aiMemoryPath = path.join(os.homedir(), 'xiaobai-ai-memory.md');
    const content = await fs.readFile(aiMemoryPath, 'utf-8');
    safeLog('✓ AI 记忆已从本地文件读取');

    // v2.10.23 - 更新缓存
    aiMemoryCache = content;
    aiMemoryCacheTime = now;

    return content;
  } catch (error) {
    // 返回默认模板
    const defaultMemory = `# AI 对话记忆

## 用户偏好
- （待补充）

## 重要对话记录
- （待补充）

## 常用操作
- （待补充）
`;
    return defaultMemory;
  }
}

/**
 * 自动更新 AI 记忆（智能提取关键信息）- v2.10.23 更新缓存
 * @param {string} userMessage - 用户消息
 * @param {string} aiResponse - AI 回复
 */
async function updateAIMemory(userMessage, aiResponse) {
  try {
    const aiMemoryPath = path.join(os.homedir(), 'xiaobai-ai-memory.md');

    // 读取现有记忆
    let existingMemory = '';
    try {
      existingMemory = await fs.readFile(aiMemoryPath, 'utf-8');
    } catch (error) {
      // 文件不存在，使用默认模板
      existingMemory = `# AI 对话记忆

## 用户偏好
- （待补充）

## 重要对话记录
- （待补充）

## 常用操作
- （待补充）

---
**最后更新**：${new Date().toLocaleString()}
`;
    }

    // 获取当前日期
    const today = new Date().toLocaleDateString('zh-CN');

    // 构建要添加的新内容（简单提取策略）
    const newEntry = `
### ${today}
- 用户问：${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}
- AI 答：${aiResponse.slice(0, 100)}${aiResponse.length > 100 ? '...' : ''}
`;

    // 检查是否已经有今天的记录
    if (existingMemory.includes(`### ${today}`)) {
      // 今天已有记录，追加内容
      const todaySectionEnd = existingMemory.indexOf('---', existingMemory.indexOf(`### ${today}`));
      if (todaySectionEnd !== -1) {
        existingMemory =
          existingMemory.slice(0, todaySectionEnd) +
          newEntry +
          existingMemory.slice(todaySectionEnd);
      }
    } else {
      // 今天没有记录，添加新段落
      const insertPosition = existingMemory.indexOf('## 重要对话记录');
      if (insertPosition !== -1) {
        existingMemory =
          existingMemory.slice(0, insertPosition) +
          '## 重要对话记录' +
          newEntry +
          '\n---\n' +
          existingMemory.slice(insertPosition + '## 重要对话记录'.length);
      }
    }

    // 更新最后修改时间
    const updatedMemory = existingMemory.replace(
      /\*\*最后更新\*\*：.*/,
      `**最后更新**：${new Date().toLocaleString()}`
    );

    // 保存到本地文件
    await fs.writeFile(aiMemoryPath, updatedMemory, 'utf-8');
    safeLog('✅ AI 记忆已自动更新');

    // v2.10.23 - 更新缓存
    aiMemoryCache = updatedMemory;
    aiMemoryCacheTime = Date.now();

    // 如果已登录，同步到云端
    if (supabaseAdmin) {
      try {
        const deviceId = db.getDeviceId();
        await supabaseAdmin
          .from('ai_memory')
          .upsert({
            device_id: deviceId,
            content: updatedMemory,
            updated_at: new Date().toISOString()
          });
        safeLog('✅ AI 记忆已同步到云端');
      } catch (cloudError) {
        safeLog('云端同步失败（非致命）:', cloudError.message);
      }
    }
  } catch (error) {
    safeError('自动更新 AI 记忆失败:', error.message);
    // 不阻塞主流程
  }
}

/**
 * 发送消息并获取流式响应（支持工具调用）
 * @param {object} agentInstance - Agent 实例
 * @param {string} message - 用户消息
 * @param {array} files - 附件文件列表
 * @param {function} onDelta - 流式回调
 */
async function sendMessage(agentInstance, message, files = [], onDelta) {
  try {
    safeLog('Agent: 准备发送消息', { messageLength: message.length, fileCount: files.length });

    // ✨ 自动加载 AI 记忆（无需 AI 主动调用）
    const aiMemory = await loadAIMemory();
    safeLog('✅ AI 记忆已自动加载');

    // 构建消息内容
    let content = [{ type: 'text', text: message }];

    // 添加文件内容
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          // 图片文件
          const imageBuffer = await fs.readFile(file.path);
          const base64Image = imageBuffer.toString('base64');
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: file.type,
              data: base64Image,
            },
          });
        } else {
          // 其他文件，读取文本内容
          const fileContent = await fs.readFile(file.path, 'utf-8');
          content.push({
            type: 'text',
            text: `\n\n[文件: ${file.name}]\n\`\`\`\n${fileContent}\n\`\`\`\n`,
          });
        }
      }
    }

    safeLog('Agent: 开始调用 API（带工具支持）');

    // 系统提示词（注入自动加载的记忆）- v2.10.27 优化：强化工具使用指令
    const systemPrompt = `你是小白AI，一个基于 Claude Agent SDK 的 AI 助手。

## 📝 用户记忆

${aiMemory}

---

## 🛠️ 工具使用规则（重要）

你必须优先使用专用工具，而不是执行 shell 命令：

### 1. 文件系统操作
- **清空回收站** → 调用 \`empty_trash\` 工具（不要用 rm 命令）
- **删除文件** → 调用 \`delete_file\` 工具
- **移到回收站** → 调用 \`move_to_trash_file\` 工具
- **创建目录** → 调用 \`create_directory\` 工具
- **列出目录** → 调用 \`list_directory\` 工具
- **读取文件** → 调用 \`read_file\` 工具
- **写入文件** → 调用 \`write_file\` 工具

### 2. 何时使用 execute_command
只有在以下情况才使用 \`execute_command\` 工具：
- 查看系统信息（如：ps aux, top, df -h）
- 查看进程列表
- 查看网络状态
- 执行 git 命令
- 其他无法用专用工具完成的操作

### 3. 常见错误示例
❌ 用户说"清空回收站"，你执行：rm -rf ~/.Trash/*
✅ 用户说"清空回收站"，你调用：empty_trash 工具

❌ 用户说"删除这个文件"，你执行：rm /path/to/file
✅ 用户说"删除这个文件"，你调用：delete_file 工具

---

## 工作原则

1. **诚实优先**：不知道就说不知道，不编造信息
2. **工具优先**：所有操作优先使用专用工具，确保结果准确
3. **简洁沟通**：直接回答，不绕弯子
4. **文件路径格式**：必须用反引号包裹路径（如 \`/path/to/file\`），方便用户点击

## 思考过程展示（涉及工具调用时）

格式要求：
⏺ 分析问题
  内容（1-2句）

⏺ 执行方案
  调用：xxx 工具

⏺ 完成！
  结果

何时展示：工具调用任务、技术问题、代码修改（纯聊天可省略）

## 命令执行规则

直接执行：打开应用、查看信息、查找文件
询问确认：删除文件、系统配置修改、sudo 操作

## 用户信息保存

直接保存：用户说"帮我保存"、"直接记下来"
先询问：用户只提到信息但无明确指令

由晓力开发，帮助用户高效工作。`;

    // 构建消息数组
    // 思考过程格式要求已在系统提示词中说明，无需在此重复
    let messages = [
      { role: 'user', content }
    ];
    let fullText = '';
    let maxIterations = 10; // 防止无限循环
    let iteration = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    while (iteration < maxIterations) {
      iteration++;

      // 发送消息（带系统提示词）- v2.10.23 优化：降低 max_tokens 以提升响应速度
      const stream = await agentInstance.client.messages.stream({
        model: agentInstance.model,
        max_tokens: 2048,
        system: systemPrompt,
        tools: FILE_TOOLS,
        messages: messages,
      });

      let currentText = '';
      let toolUseBlocks = [];

      // 处理流式响应
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            const text = event.delta.text;
            currentText += text;
            fullText += text;
            if (onDelta) {
              onDelta({ text, fullText });
            }
          }
        } else if (event.type === 'content_block_stop') {
          // 检查是否有工具调用
          const block = stream.currentMessageSnapshot?.content?.find(
            (block, index) =>
              index === stream.currentContentBlockIndex &&
              block.type === 'tool_use'
          );
          if (block) {
            toolUseBlocks.push(block);
          }
        }
      }

      // 获取完整的响应
      const responseMessage = await stream.finalMessage();

      // 累计 token 使用量
      if (responseMessage.usage) {
        totalInputTokens += responseMessage.usage.input_tokens || 0;
        totalOutputTokens += responseMessage.usage.output_tokens || 0;
      }

      // 检查是否有工具调用
      const toolUseBlocksInResponse = responseMessage.content.filter(
        (block) => block.type === 'tool_use'
      );

      if (toolUseBlocksInResponse.length === 0) {
        // 没有工具调用，结束循环
        safeLog('Agent: 消息发送完成（无工具调用）');
        safeLog('Agent: Token 使用量', {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens
        });

        // ✨ 自动更新 AI 记忆（无需用户提醒）
        await updateAIMemory(message, fullText);

        return {
          text: fullText,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens
        };
      }

      // 处理工具调用
      safeLog(`Agent: 检测到 ${toolUseBlocksInResponse.length} 个工具调用`);

      // 添加助手消息到历史
      messages.push({
        role: 'assistant',
        content: responseMessage.content,
      });

      // 执行所有工具调用
      for (const toolUse of toolUseBlocksInResponse) {
        const toolResult = await handleToolUse(toolUse.name, toolUse.input);

        // 添加工具结果到消息
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: toolResult,
            },
          ],
        });
      }

      // 🔥 关键修复：工具执行完成后，发送一次更新以隐藏等待指示器
      // 即使AI还没有发送文本响应，也要通知前端工具已执行完成
      if (onDelta) {
        onDelta({ text: '', fullText });
        safeLog('Agent: 工具执行完成，已发送UI更新');
      }

      // 继续循环，让模型处理工具结果
      safeLog('Agent: 工具调用完成，继续对话...');
    }

    safeLog('Agent: 消息发送完成');
    safeLog('Agent: Token 使用量', {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens
    });

    // ✨ 自动更新 AI 记忆（无需用户提醒）
    await updateAIMemory(message, fullText);

    return {
      text: fullText,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens
    };
  } catch (error) {
    safeError('Agent: 发送消息失败:', error);
    throw error;
  }
}

/**
 * 获取所有可用的模型提供商
 */
function getProviders() {
  return Object.keys(MODEL_PROVIDERS).map((key) => ({
    id: key,
    ...MODEL_PROVIDERS[key],
  }));
}

/**
 * 获取指定提供商的模型列表
 */
function getModels(providerId) {
  const provider = MODEL_PROVIDERS[providerId];
  return provider ? provider.models : [];
}

module.exports = {
  MODEL_PROVIDERS,
  createAgent,
  sendMessage,
  getProviders,
  getModels,
  setWorkDirectory,
  getWorkDirectory,
  FILE_TOOLS,
};
