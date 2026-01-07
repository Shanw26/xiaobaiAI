const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
    const script = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${filePath.replace(/\\/g, '\\\\')}', 'OnlyErrorDialogs', 'SendToRecycleBin')`;
    await execPromise(`powershell -Command "${script}"`, { shell: 'powershell.exe' });
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

// 默认工作目录（小白AI专用工作目录）
let workDirectory = path.join(os.homedir(), 'Downloads', '小白AI工作目录');

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
    description: '向文件写入内容。如果文件存在则覆盖，如果不存在则创建新文件。\n\n重要说明：\n- 如果用户未指定文件路径，默认使用小白AI工作目录\n- 相对路径会自动添加到工作目录下\n- 绝对路径会直接使用\n- 工作目录：~/Downloads/小白AI工作目录',
    input_schema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: '文件的相对路径或绝对路径。如果未指定，默认使用工作目录',
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
    description: '读取文件内容',
    input_schema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: '文件的相对路径或绝对路径',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'list_directory',
    description: '列出目录中的文件和子目录',
    input_schema: {
      type: 'object',
      properties: {
        dirPath: {
          type: 'string',
          description: '目录的相对路径或绝对路径，默认为工作目录',
        },
      },
      required: [],
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
        // 如果是相对路径，拼接工作目录
        if (!path.isAbsolute(filePath)) {
          filePath = path.join(workDirectory, filePath);
        }

        // 确保目录存在
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        // 写入文件
        await fs.writeFile(filePath, input.content, 'utf-8');
        safeLog(`✓ 文件已创建: ${filePath}`);
        return `文件已创建: ${filePath}`;
      }

      case 'read_file': {
        let filePath = input.filePath;
        if (!path.isAbsolute(filePath)) {
          filePath = path.join(workDirectory, filePath);
        }

        const content = await fs.readFile(filePath, 'utf-8');
        safeLog(`✓ 文件已读取: ${filePath}`);
        return content;
      }

      case 'list_directory': {
        let dirPath = input.dirPath || '.';
        if (!path.isAbsolute(dirPath)) {
          dirPath = path.join(workDirectory, dirPath);
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
        if (!path.isAbsolute(dirPath)) {
          dirPath = path.join(workDirectory, dirPath);
        }

        await fs.mkdir(dirPath, { recursive: true });
        safeLog(`✓ 目录已创建: ${dirPath}`);
        return `目录已创建: ${dirPath}`;
      }

      case 'delete_file': {
        let filePath = input.filePath;
        if (!path.isAbsolute(filePath)) {
          filePath = path.join(workDirectory, filePath);
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
        // 用户信息保存到工作目录的用户信息文件
        const userInfoPath = path.join(workDirectory, '用户信息.md');

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
        const userInfoPath = path.join(workDirectory, '用户信息.md');

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
  safeLog('Agent: 开始创建客户端', { provider, model, hasTools: true });

  const { default: Anthropic } = await import('@anthropic-ai/sdk');

  const providerConfig = MODEL_PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`不支持的模型提供商: ${provider}`);
  }

  // 创建 Anthropic 客户端
  const client = new Anthropic({
    apiKey: apiKey,
    baseURL: providerConfig.baseUrl,
  });

  safeLog('Agent: 客户端创建成功（已配置文件操作工具）');

  return {
    client,
    model,
    provider,
    hasTools: true,
  };
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

    // 系统提示词
    const systemPrompt = `你是小白AI，一个基于 Claude Agent SDK 的 AI 助手。

## 核心能力
1. **文件操作**：可以创建、读取、编辑、删除文件
2. **用户信息管理**：可以记住用户的个人信息，提供个性化服务
3. **对话记忆**：通过全局设置和记忆文件，记住用户偏好

## 思考过程展示
回答技术问题时，先展示简洁的思考过程，格式如下：

\`\`\`思考
**分析**：问题本质（1-2句）

**方案**：解决方法（1-2句）

**注意**：关键风险（1-2点）

**预期**：会得到什么结果（1句）
\`\`\`

何时展示：
- ✅ 技术问题、代码修改、文件操作
- ❌ 简单问候、闲聊

## 文件操作规则
- **默认路径**：如果用户未指定文件位置，默认使用 ~/Downloads/小白AI工作目录
- **相对路径**：自动添加到工作目录下
- **绝对路径**：直接使用用户指定的路径
- **安全限制**：只能操作工作目录内的文件

## 用户信息管理
当用户提到以下信息时，**必须先征得用户同意**，然后使用 save_user_info 工具保存：
- 个人信息：姓名、职业、年龄、所在地等
- 偏好信息：喜欢的风格、习惯、需求等
- 背景信息：工作、学习、项目等

**重要**：
1. 先友好地询问："我发现这是一个关于你的信息，要不要我帮你记下来？"
2. 用户同意后，再调用 save_user_info 工具
3. 使用格式：键: 值（例如 "姓名: 晓力"）

示例对话：
用户：我叫晓力，是个产品经理
AI：很高兴认识你，晓力！我发现这些是关于你的个人信息，要不要我帮你记下来，方便以后更好地为你服务？
用户：好的
AI：[调用 save_user_info 工具，保存 "姓名: 晓力" 和 "职业: 产品经理"]

## 工作方式
- 简洁友好，直击要点
- 主动询问，确认需求
- 记住信息，提供个性化服务
- 诚实面对不知道的事情

## 产品哲学（记住这些）
- **简单**：专注一个功能并做到极致
- **单点击穿**：找到一个核心价值点
- **All-in**：投入所有资源

你是由晓力开发的 AI 助手，帮助他更高效地工作。`;

    // 构建消息数组
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

      // 发送消息（带系统提示词）
      const stream = await agentInstance.client.messages.stream({
        model: agentInstance.model,
        max_tokens: 4096,
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

      // 继续循环，让模型处理工具结果
      safeLog('Agent: 工具调用完成，继续对话...');
    }

    safeLog('Agent: 消息发送完成');
    safeLog('Agent: Token 使用量', {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens
    });
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
