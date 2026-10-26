-- =============================================
-- 作品集：数据表 + Storage 桶 + 访问策略
-- 在 Supabase Dashboard -> SQL Editor 中执行本文件即可（可重复执行）。
-- =============================================

-- 1) 作品集数据表
CREATE TABLE IF NOT EXISTS public.portfolio_items (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200),
    description TEXT,
    link TEXT,
    file_type VARCHAR(16) NOT NULL CHECK (file_type IN ('image', 'video', 'model')),
    file_url TEXT NOT NULL,
    storage_path VARCHAR(500),
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 老库补列（已存在时忽略）
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- 所有人都能查看作品集
DROP POLICY IF EXISTS "Allow public read access to portfolio" ON public.portfolio_items;
CREATE POLICY "Allow public read access to portfolio" ON public.portfolio_items
    FOR SELECT USING (true);

-- 站点使用前端密码模式，没有 Supabase Auth 用户，因此这里放开写入。
-- 若要更安全，请接入 Supabase Auth 并改为 authenticated 策略。
DROP POLICY IF EXISTS "Allow public write access to portfolio" ON public.portfolio_items;
CREATE POLICY "Allow public write access to portfolio" ON public.portfolio_items
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_portfolio_position
    ON public.portfolio_items(position ASC, created_at ASC);

-- 2) Storage 桶：portfolio-files（公开读）
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-files', 'portfolio-files', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage 策略：允许匿名读取 / 上传 / 删除（与前端密码模式一致）
DROP POLICY IF EXISTS "Public read portfolio files" ON storage.objects;
CREATE POLICY "Public read portfolio files" ON storage.objects
    FOR SELECT USING (bucket_id = 'portfolio-files');

DROP POLICY IF EXISTS "Public upload portfolio files" ON storage.objects;
CREATE POLICY "Public upload portfolio files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'portfolio-files');

DROP POLICY IF EXISTS "Public delete portfolio files" ON storage.objects;
CREATE POLICY "Public delete portfolio files" ON storage.objects
    FOR DELETE USING (bucket_id = 'portfolio-files');
