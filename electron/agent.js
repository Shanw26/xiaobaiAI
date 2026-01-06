const fs = require('fs').promises;
const path = require('path');
const os = require('os');

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

// 默认工作目录（用户下载目录）
let workDirectory = path.join(os.homedir(), 'Downloads');

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
    description: '向文件写入内容。如果文件存在则覆盖，如果不存在则创建新文件。',
    input_schema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: '文件的相对路径或绝对路径',
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
];

/**
 * 工具处理器
 */
async function handleToolUse(toolName, input) {
  console.log(`Agent: 调用工具 ${toolName}`, input);

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
        console.log(`✓ 文件已创建: ${filePath}`);
        return `文件已创建: ${filePath}`;
      }

      case 'read_file': {
        let filePath = input.filePath;
        if (!path.isAbsolute(filePath)) {
          filePath = path.join(workDirectory, filePath);
        }

        const content = await fs.readFile(filePath, 'utf-8');
        console.log(`✓ 文件已读取: ${filePath}`);
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

        console.log(`✓ 目录已列出: ${dirPath}`);
        return JSON.stringify(items, null, 2);
      }

      case 'create_directory': {
        let dirPath = input.dirPath;
        if (!path.isAbsolute(dirPath)) {
          dirPath = path.join(workDirectory, dirPath);
        }

        await fs.mkdir(dirPath, { recursive: true });
        console.log(`✓ 目录已创建: ${dirPath}`);
        return `目录已创建: ${dirPath}`;
      }

      default:
        return `错误: 未知的工具 - ${toolName}`;
    }
  } catch (error) {
    console.error(`工具调用失败: ${toolName}`, error);
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
  console.log('Agent: 开始创建客户端', { provider, model, hasTools: true });

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

  console.log('Agent: 客户端创建成功（已配置文件操作工具）');

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
    console.log('Agent: 准备发送消息', { messageLength: message.length, fileCount: files.length });

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

    console.log('Agent: 开始调用 API（带工具支持）');

    // 构建消息数组
    let messages = [{ role: 'user', content }];
    let fullText = '';
    let maxIterations = 10; // 防止无限循环
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      // 发送消息
      const stream = await agentInstance.client.messages.stream({
        model: agentInstance.model,
        max_tokens: 4096,
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

      // 检查是否有工具调用
      const toolUseBlocksInResponse = responseMessage.content.filter(
        (block) => block.type === 'tool_use'
      );

      if (toolUseBlocksInResponse.length === 0) {
        // 没有工具调用，结束循环
        console.log('Agent: 消息发送完成（无工具调用）');
        return fullText;
      }

      // 处理工具调用
      console.log(`Agent: 检测到 ${toolUseBlocksInResponse.length} 个工具调用`);

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
      console.log('Agent: 工具调用完成，继续对话...');
    }

    console.log('Agent: 消息发送完成');
    return fullText;
  } catch (error) {
    console.error('Agent: 发送消息失败:', error);
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
