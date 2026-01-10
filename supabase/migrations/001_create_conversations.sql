-- 删除旧表（如果存在）
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- 重新创建表，明确指定 id 为 TEXT 类型（而不是 UUID）
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  thinking TEXT,
  files TEXT, -- JSON 格式存储文件信息
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_conversations_user_created ON conversations(user_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- 启用 RLS（Row Level Security）
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的对话
-- 注意：auth.uid() 返回 UUID 类型，需要转换为 TEXT
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own conversations"
ON conversations FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own conversations"
ON conversations FOR UPDATE
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own conversations"
ON conversations FOR DELETE
USING (user_id = auth.uid()::text);

-- RLS 策略：用户只能访问自己对话的消息
CREATE POLICY "Users can view messages of own conversations"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert messages to own conversations"
ON messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete messages of own conversations"
ON messages FOR DELETE
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()::text
  )
);
