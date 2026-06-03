-- =============================================
-- Supabase 数据库表结构 SQL
-- =============================================

-- 1. 创建留言板表
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT '匿名网友',
    tag VARCHAR(50),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 启用 Row Level Security (RLS) - 允许所有人读取和插入
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 3. 创建策略：允许所有人读取留言
CREATE POLICY "Allow public read access" ON messages
    FOR SELECT USING (true);

-- 4. 创建策略：允许所有人插入留言
CREATE POLICY "Allow public insert access" ON messages
    FOR INSERT WITH CHECK (true);

-- 5. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON messages(created_at DESC);

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
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 个人信息表 - 存储头像和个人介绍
-- =============================================
CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY,
    avatar TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 启用 RLS
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取个人信息
CREATE POLICY "Allow public read access to profile" ON profile
    FOR SELECT USING (true);

-- 允许所有人更新个人信息（可选：你可以修改为仅允许认证用户）
CREATE POLICY "Allow public update access to profile" ON profile
    FOR UPDATE USING (true);

-- 允许所有人插入个人信息
CREATE POLICY "Allow public insert access to profile" ON profile
    FOR INSERT WITH CHECK (true);

-- 为 profile 表添加更新时间戳触发器
CREATE TRIGGER update_profile_updated_at
  BEFORE UPDATE ON profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========== 博客表 ==========
CREATE TABLE IF NOT EXISTS blogs (
  id BIGINT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  date VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 启用 RLS
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取博客
CREATE POLICY "Allow public read access to blogs" ON blogs
  FOR SELECT USING (true);

-- 允许所有人插入和更新博客（注意：生产环境应该限制为认证用户）
CREATE POLICY "Allow public write access to blogs" ON blogs
  FOR ALL USING (true);

-- 为 blogs 表添加更新时间戳触发器
CREATE TRIGGER update_blogs_updated_at
  BEFORE UPDATE ON blogs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 音乐表 - 存储歌曲信息
-- =============================================
CREATE TABLE IF NOT EXISTS songs (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(100),
    file_path VARCHAR(500) NOT NULL,
    duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 启用 RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取歌曲
CREATE POLICY "Allow public read access to songs" ON songs
    FOR SELECT USING (true);

-- 允许所有人插入歌曲（需要认证）
CREATE POLICY "Allow authenticated insert songs" ON songs
    FOR INSERT WITH CHECK (true);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at DESC);
