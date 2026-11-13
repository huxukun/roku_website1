#!/usr/bin/env node
/**
 * 记忆仓库 → 个人网站博客同步
 * ---------------------------------------------------------------
 * 数据流：second-brain-memory（私有）→ Supabase `blogs` 表 → 网站现有博客 UI
 *
 * 只发布「显式公开」的内容：
 *   - 仅扫描 AI任务记忆/知识/、领域/、日志/
 *   - frontmatter 里必须写 `公开: true`
 *   - 其余一律跳过（默认私密）
 *
 * 幂等：id 由文件路径哈希得到，重复运行只更新不重复插入；
 *       取消公开或删除的文件，下次运行会从 blogs 表下线。
 *
 * 环境变量：
 *   MEMORY_TOKEN              读私有仓库的 PAT（只读 repo 即可）
 *   SUPABASE_URL              https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY 服务端密钥；没有则退回 SUPABASE_ANON_KEY
 */

const API = 'https://api.github.com'
const REPO = process.env.MEMORY_REPO || 'huxukun/second-brain-memory'
const REF = process.env.MEMORY_REF || 'main'
const TOKEN = process.env.MEMORY_TOKEN
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

// 只扫这三个目录，而且还要卡片自己写 公开: true
const SOURCE_DIRS = ['AI任务记忆/知识/', '领域/', '日志/']

// id 命名空间：8e18 ~ 9e18，避开手工写入博客的 id
const ID_BASE = 8000000000000000000n
const ID_SPAN = 1000000000000000000n

const TIMEOUT = 15000

function stableId(str) {
  let h = 0xcbf29ce484222325n
  for (const byte of Buffer.from(str, 'utf8')) {
    h ^= BigInt(byte)
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn
  }
  return (ID_BASE + (h % ID_SPAN)).toString()
}

function splitFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!m) return { meta: {}, body: text }
  const meta = {}
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    meta[key] = val
  }
  return { meta, body: text.slice(m[0].length) }
}

function isPublic(meta) {
  return /^(true|yes|是|1)$/i.test(String(meta['公开'] ?? ''))
}

async function gh(path, accept = 'application/vnd.github+json') {
  const res = await fetch(`${API}/repos/${REPO}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    signal: AbortSignal.timeout(TIMEOUT)
  })
  if (!res.ok) throw new Error(`GitHub ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`)
  return res
}

async function listMarkdown() {
  const res = await gh(`/git/trees/${REF}?recursive=1`)
  const { tree } = await res.json()
  return tree
    .filter((n) => n.type === 'blob' && n.path.endsWith('.md'))
    .map((n) => n.path)
    .filter((p) => SOURCE_DIRS.some((d) => p.startsWith(d)))
    .filter((p) => !/\/README\.md$/i.test(p) && !p.endsWith('/.gitkeep'))
}

async function readFile(path) {
  const res = await gh(`/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${REF}`, 'application/vnd.github.raw')
  return res.text()
}

function toPost(path, raw) {
  const { meta, body } = splitFrontmatter(raw)
  if (!isPublic(meta)) return null

  const fallbackTitle = /^#\s+(.+)$/m.exec(body)?.[1]?.trim()
  const title = (meta['标题'] || fallbackTitle || path.split('/').pop().replace(/\.md$/, '')).trim()
  const date = (meta['日期'] || /(\d{4}-\d{2}-\d{2})/.exec(path)?.[1] || new Date().toISOString().slice(0, 10)).trim()
  const summary = (meta['摘要'] || '').trim()
  const content = (summary ? `> ${summary}\n\n` : '') + body.trim()

  return {
    id: Number(stableId(path)),
    title,
    date,
    content,
    source: path
  }
}

async function supabase(path, init = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    signal: AbortSignal.timeout(TIMEOUT)
  })
  if (!res.ok) throw new Error(`Supabase ${res.status} ${path}: ${(await res.text()).slice(0, 300)}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function main() {
  if (!TOKEN) throw new Error('缺少 MEMORY_TOKEN（需要读取私有记忆仓库）')
  if (!SB_URL || !SB_KEY) throw new Error('缺少 SUPABASE_URL / SUPABASE_*_KEY')

  const paths = await listMarkdown()
  console.log(`扫描 ${paths.length} 个候选文件`)

  const posts = []
  for (const path of paths) {
    try {
      const post = toPost(path, await readFile(path))
      if (post) posts.push(post)
    } catch (err) {
      console.warn(`跳过 ${path}: ${err.message}`)
    }
  }
  console.log(`其中 ${posts.length} 个标记为公开`)

  if (posts.length) {
    const rows = posts.map(({ id, title, date, content }) => ({ id, title, date, content }))
    await supabase('blogs?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows)
    })
    console.log(`已写入/更新 ${rows.length} 篇博客`)
  }

  // 下线：曾经同步过、但现在已经不公开（或已删除）的卡片
  if (!posts.length) {
    console.warn('没有公开卡片，跳过下线步骤，防止误删全部博客')
    return
  }

  const existing = await supabase(`blogs?select=id,title&id=gte.${ID_BASE}`)
  const live = new Set(posts.map((p) => String(p.id)))
  const stale = (existing || []).filter((row) => !live.has(String(row.id)))

  for (const row of stale) {
    await supabase(`blogs?id=eq.${row.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
    console.log(`已下线：${row.title}`)
  }

  console.log(`完成：上线 ${posts.length} 篇，下线 ${stale.length} 篇`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
