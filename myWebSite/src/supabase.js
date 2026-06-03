import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project-id.supabase.co' && supabaseAnonKey !== 'your-anon-key-here') {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
  console.log('Supabase client initialized successfully')
} else {
  console.warn('Supabase environment variables are not set or using default values. Using local storage fallback.')
  // 创建一个模拟对象，让代码不会崩溃
  supabase = {
    from: () => ({
      select: () => ({
        order: async () => Promise.resolve({ data: [], error: new Error('Supabase not configured') }),
        limit: async () => Promise.resolve({ data: [], error: new Error('Supabase not configured') })
      }),
      insert: () => ({
        select: () => ({
          single: async () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        })
      }),
      upsert: () => ({
        select: () => ({
          single: async () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        })
      }),
      delete: () => ({
        eq: async () => Promise.resolve({ error: new Error('Supabase not configured') })
      })
    })
  }
}

export { supabase }
export default supabase
