-- =============================================================
-- AERO / Y2K 风格 BGM 歌单文件夹
--
-- 现有：MainSynthBGM（主场景）、GameSynthBGM（赛车游戏）
-- 按同样命名补建：
--   MainAeroBGM / MainY2KBGM    → 两种风格的主场景歌单
--   GameAeroBGM / GameY2KBGM    → 两种风格对应的游戏歌单
--
-- Supabase Storage 的目录是“虚拟”的，只要上传文件到该前缀就会自动生成。
-- 这里插入零字节占位对象，让这几个歌单在 Dashboard 的 music-files 桶里
-- 立即可见、可直接点进去上传，而不必手动新建文件夹。
-- 占位文件名以下划线开头且不是音频后缀，不会被播放列表读取。
--
-- 在 Supabase Dashboard → SQL Editor 中整段执行，可重复执行。
-- =============================================================

-- 用 NOT EXISTS 保证可重复执行。
-- 注意：storage.objects 上没有可推断的 (bucket_id, name) 唯一约束，
-- 直接写 ON CONFLICT (bucket_id, name) 会报 42P10，所以这里改为条件插入。
insert into storage.objects (bucket_id, name, owner, metadata)
select v.bucket_id, v.name, null, '{"mimetype":"application/octet-stream"}'::jsonb
from (
  values
    ('music-files', 'MainAeroBGM/.emptyFolderPlaceholder'),
    ('music-files', 'MainY2KBGM/.emptyFolderPlaceholder'),
    ('music-files', 'GameAeroBGM/.emptyFolderPlaceholder'),
    ('music-files', 'GameY2KBGM/.emptyFolderPlaceholder')
) as v(bucket_id, name)
where not exists (
  select 1
  from storage.objects o
  where o.bucket_id = v.bucket_id
    and o.name = v.name
);

-- 验证：应能看到 4 个新目录（连同原有的 MainSynthBGM / GameSynthBGM）
select name, created_at
from storage.objects
where bucket_id = 'music-files'
  and (
    name like 'MainSynthBGM/%'
    or name like 'GameSynthBGM/%'
    or name like 'MainAeroBGM/%'
    or name like 'MainY2KBGM/%'
    or name like 'GameAeroBGM/%'
    or name like 'GameY2KBGM/%'
  )
order by name;

-- 可选：如果以后不想保留占位文件（目录里已有真实音频后可删）
-- delete from storage.objects
-- where bucket_id = 'music-files'
--   and name in (
--     'MainAeroBGM/.emptyFolderPlaceholder',
--     'MainY2KBGM/.emptyFolderPlaceholder',
--     'GameAeroBGM/.emptyFolderPlaceholder',
--     'GameY2KBGM/.emptyFolderPlaceholder'
--   );

-- 说明：歌曲放进对应文件夹即成为该歌单曲目，无需再往 songs 表插记录。
-- 支持的格式：mp3 / m4a / ogg / wav（见 MusicService.fetchBgmFolder）。
