# 音乐加载问题诊断指南

## 🎯 常见问题排查步骤

### 1️⃣ 检查 Supabase 存储配置

#### 确保存储桶是公开的
1. 进入 Supabase 仪表板
2. 点击左侧菜单 **Storage**
3. 选择 `music-files` 存储桶
4. 点击 **Policies** 标签
5. 确保有允许公开读取的策略：
   ```sql
   -- 允许所有人读取存储桶中的文件
   CREATE POLICY "Allow public access to music files"
   ON storage.objects
   FOR SELECT
   USING (bucket_id = 'music-files');
   ```

#### 检查存储桶权限
- 确保存储桶的访问权限设置为 **Public**
- 在存储桶设置中，确认 **Access Control** 为 **Public**

### 2️⃣ 验证文件 URL 格式

#### 正确的公开 URL 格式
```
https://[project-id].supabase.co/storage/v1/object/public/music-files/[filename].mp3
```

#### 错误的 URL 格式
- ❌ 使用签名 URL（带 token 参数）
- ❌ 路径错误
- ❌ 文件名包含未正确编码的特殊字符

### 3️⃣ 测试 URL 可访问性

1. 将歌曲的 file_path 直接复制到浏览器地址栏
2. 检查是否能正常播放或下载
3. 如果返回 404 或权限错误，说明：
   - 文件路径不正确
   - 存储桶权限配置有误
   - 文件不存在

### 4️⃣ 检查数据库记录

1. 在 Supabase 仪表板点击 **Table Editor**
2. 选择 `songs` 表
3. 检查每条记录的 `file_path` 字段
4. 确认 URL 格式正确且可访问

### 5️⃣ 浏览器控制台调试

打开浏览器开发者工具（F12），查看 Console 标签，会看到详细的调试信息：

```
MusicService: fetchSongs called
MusicService: Querying Supabase for songs...
MusicService: Fetched songs: X
MusicService: Songs data: [...]
UIManager: loadSongsFromService called
UIManager: URL 验证结果: {valid: true, ...}
MusicVisualizer: Loading audio from URL: ...
```

### 6️⃣ 正确添加歌曲的 SQL 示例

```sql
INSERT INTO songs (title, artist, file_path) VALUES
(
  '歌曲名称',
  '艺术家',
  'https://your-project-id.supabase.co/storage/v1/object/public/music-files/your-song.mp3'
);
```

## 🔧 快速修复清单

- [ ] 确认 Supabase 存储桶 `music-files` 存在且为公开访问
- [ ] 确认音乐文件已上传到存储桶
- [ ] 确认数据库中 `songs` 表的记录包含正确的公开 URL
- [ ] 确认 URL 在浏览器中可以直接访问
- [ ] 检查浏览器控制台是否有错误信息

## 💡 提示

1. **文件名编码**：如果文件名包含空格或特殊字符，确保在 URL 中正确编码
2. **CORS 配置**：在 Supabase Storage 设置中，确保 CORS 配置允许您的域名访问
3. **文件大小**：大文件可能加载较慢，建议先测试小文件
