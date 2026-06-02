-- =============================================
-- Supabase 数据库表结构 SQL
-- =============================================

-- 1. 创建留言板表
CREATE TABLE IF NOT EXISTS guestbook_messages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT '匿名网友',
    tag VARCHAR(50),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 启用 Row Level Security (RLS) - 允许所有人读取和插入
ALTER TABLE guestbook_messages ENABLE ROW LEVEL SECURITY;

-- 3. 创建策略：允许所有人读取留言
CREATE POLICY "Allow public read access" ON guestbook_messages
    FOR SELECT USING (true);

-- 4. 创建策略：允许所有人插入留言
CREATE POLICY "Allow public insert access" ON guestbook_messages
    FOR INSERT WITH CHECK (true);

-- 5. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON guestbook_messages(created_at DESC);

-- =============================================
-- 可选：添加更新时间戳触发器
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guestbook_updated_at
    BEFORE UPDATE ON guestbook_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
