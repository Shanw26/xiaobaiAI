-- 修改 user_id 字段，允许 NULL（支持游客模式）
-- 问题：游客模式下 user_id 为 NULL，但表结构定义为 NOT NULL
-- 解决：将 user_id 改为可空

-- ============================================
-- 1. 修改 conversations 表
-- ============================================

-- 删除旧的约束
ALTER TABLE conversations ALTER COLUMN user_id DROP NOT NULL;

-- ============================================
-- 2. 确认修改
-- ============================================

-- 验证修改成功
SELECT
    column_name,
    is_nullable,
    data_type
FROM
    information_schema.columns
WHERE
    table_name = 'conversations'
    AND column_name = 'user_id';

-- 预期结果：is_nullable = 'YES'
