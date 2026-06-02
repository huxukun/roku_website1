# Supabase 集成说明

本项目已成功集成 Supabase 作为后端服务，用于留言板的持久化存储。

## 📋 设置步骤

### 1️⃣ 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com) 并注册/登录
2. 点击 "New Project" 创建新项目
3. 等待项目创建完成（通常需要 2-3 分钟）

### 2️⃣ 获取 API 密钥

1. 进入项目后，点击左侧菜单的 **Settings**（齿轮图标）
2. 点击 **API**
3. 复制以下两个值：
   - **Project URL**: 例如 `https://xxxxx.supabase.co`
   - **anon public key**: 长串的密钥

### 3️⃣ 创建 .env 文件

在项目根目录创建 `.env` 文件：

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **重要**: 将上面两个值替换为您在步骤 2 中复制的实际值

### 4️⃣ 创建数据库表

1. 在 Supabase 仪表板中，点击左侧菜单的 **SQL Editor**
2. 点击 **New Query** 创建新查询
3. 复制以下 SQL 代码并执行：

```sql
-- 创建留言板表
CREATE TABLE IF NOT EXISTS guestbook_messages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT '匿名网友',
    tag VARCHAR(50),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 启用 Row Level Security
ALTER TABLE guestbook_messages ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取留言
CREATE POLICY "Allow public read access" ON guestbook_messages
    FOR SELECT USING (true);

-- 允许所有人插入留言
CREATE POLICY "Allow public insert access" ON guestbook_messages
    FOR INSERT WITH CHECK (true);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON guestbook_messages(created_at DESC);
```

### 5️⃣ 验证配置

1. 重启开发服务器：
```bash
npm run dev
```

2. 打开浏览器访问 http://localhost:5173/
3. 打开留言板并提交一条测试留言
4. 在 Supabase 仪表板的 **Table Editor** 中查看是否有数据

## 🎯 功能特性

### ✅ 已实现的功能

- **数据持久化**: 留言将永久保存在 Supabase 数据库中
- **实时加载**: 页面加载时自动从 Supabase 获取留言
- **错误处理**: 网络错误时会显示友好的错误提示
- **回退机制**: 如果 Supabase 未配置，系统会自动使用 localStorage 作为备选方案

### 🔧 技术细节

- **前端框架**: 纯 JavaScript，无框架依赖
- **数据库操作**: 使用 Supabase JavaScript 客户端
- **数据格式**: 与本地存储格式完全兼容
- **安全策略**: 使用 RLS（行级安全策略）控制数据访问

## 📝 数据表结构

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键，自动递增 |
| name | VARCHAR(100) | 留言者昵称 |
| tag | VARCHAR(50) | 标签（可选） |
| text | TEXT | 留言内容 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 🚀 部署注意事项

### 前端部署

如果部署到生产环境：

1. 确保 `.env` 文件中的环境变量已正确配置
2. 在 Supabase 的 **Authentication** > **URL Configuration** 中添加您的生产域名到 **Site URL** 和 **Redirect URLs**

### 匿名访问

当前配置允许匿名用户提交留言。如果需要添加用户认证系统，可以：

1. 在 Supabase 启用 Email/Password 认证
2. 修改 RLS 策略，限制只有登录用户才能操作
3. 在前端添加登录/注册界面

## 🔒 安全建议

1. **不要暴露 Service Role Key**: 只在前端使用 anon key
2. **配置 RLS**: 确保数据库有适当的行级安全策略
3. **限制数据量**: 可以添加查询限制，防止滥用
4. **定期备份**: 定期备份 Supabase 数据库

## 📞 常见问题

### Q: 为什么提交留言没有反应？

A: 检查浏览器控制台是否有错误信息，确保：
- `.env` 文件配置正确
- Supabase 表已创建
- RLS 策略已配置

### Q: 如何查看数据库中的数据？

A: 在 Supabase 仪表板 > **Table Editor** > 选择 **guestbook_messages** 表

### Q: 可以删除留言吗？

A: 当前实现不支持删除功能。如果需要，可以添加删除按钮和对应的 Supabase DELETE 操作。

## 🎉 恭喜！

如果一切配置正确，您的留言板现在应该可以正常工作了！有任何问题请随时询问。

---

**项目结构更新**:
- ✅ `src/supabase.js` - Supabase 客户端配置
- ✅ `src/UIManager.js` - 留言板逻辑已更新
- ✅ `.env.example` - 环境变量示例
- ✅ `supabase-schema.sql` - 数据库表结构
