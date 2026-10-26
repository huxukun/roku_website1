import { supabase } from './supabase';

/* 歌单清单缓存：先渲染上次的列表，再后台刷新。
   云端慢或暂时离线时，音乐按钮依然可以立即点开。 */
const CACHE_KEY = 'roku-music-library-cache';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

class MusicService {
  constructor() {
    this.songs = [];
    this.mainBgmSongs = [];
    this.gameBgmSongs = [];
    this.currentSongIndex = 0;
    this.lastPlayedIndices = [];
    this.cacheLoaded = false;
  }

  // 启动时先灌入本地缓存，调用方可在创建 UI 前 await 它
  loadCache() {
    if (this.cacheLoaded) return true;
    this.cacheLoaded = true;
    const cached = readCache();
    if (!cached) return false;
    if (Array.isArray(cached.songs)) this.songs = cached.songs;
    if (Array.isArray(cached.mainBgmSongs)) this.mainBgmSongs = cached.mainBgmSongs;
    if (Array.isArray(cached.gameBgmSongs)) this.gameBgmSongs = cached.gameBgmSongs;
    return true;
  }

  saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        songs: this.songs,
        mainBgmSongs: this.mainBgmSongs,
        gameBgmSongs: this.gameBgmSongs,
        updatedAt: Date.now(),
      }));
    } catch (error) {
      /* 配额不足或隐私模式下写入失败，不影响播放 */
    }
  }

  async fetchSongs() {
    console.log('MusicService: fetchSongs called');
    try {
      console.log('MusicService: Querying Supabase for songs...');
      const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
      
      if (error) {
        console.error('MusicService: Error fetching songs:', error);
        return false;
      }
      
      const rows = (data || []).map(song => ({
        ...song,
        url: song.file_path,
      }));
      this.songs = rows;
      this.songs = this.songs.map(({ url, ...song }) => song);
      this.saveCache();
      console.log('MusicService: Fetched songs:', this.songs.length);
      return true;
    } catch (error) {
      console.error('MusicService: Exception fetching songs:', error);
      return false;
    }
  }

  /* 列出桶内某个 BGM 文件夹下的音频，转成播放列表项；
     传歌时只需把 mp3 放进对应文件夹，无需再往数据库插记录 */
  async fetchBgmFolder(folder, playlist) {
    try {
      const { data, error } = await supabase.storage.from('music-files').list(folder, {
        limit: 200,
        sortBy: { column: 'name', order: 'asc' },
      })

      if (error) {
        console.error(`MusicService: Error listing ${folder} folder:`, error)
        return []
      }

      const list = (data || [])
        .filter(item => item.name && /\.(mp3|m4a|ogg|wav)$/i.test(item.name))
        .map(item => {
          /* getPublicUrl 内部已用 encodeURI 处理空格等字符，这里不能再编码，否则会变成 %2520 */
          const path = `${folder}/${item.name}`
          const { data: urlData } = supabase.storage.from('music-files').getPublicUrl(path)
          return {
            title: item.name.replace(/\.[^.]+$/, ''),
            url: urlData?.publicUrl || '',
            playlist,
          }
        })

      /* 不再逐首发 HEAD 预检：部分环境会返回 403/405，导致整张歌单被误判失效。
         坏链接交给播放时的 error 事件自动跳下一首处理。 */
      console.log(`MusicService: ${folder} songs:`, list.length)
      return list
    } catch (error) {
      console.error(`MusicService: Exception listing ${folder} folder:`, error)
      return []
    }
  }

  /* MainSynthBGM = 3D 主场景歌单，GameSynthBGM = 赛车游戏歌单（MyFavor 暂不播放） */
  async fetchBgmSongs() {
    this.mainBgmSongs = await this.fetchBgmFolder('MainSynthBGM', 'main')
    this.gameBgmSongs = await this.fetchBgmFolder('GameSynthBGM', 'game')
    this.saveCache()
    return this.mainBgmSongs.length + this.gameBgmSongs.length
  }

  getMainBgmSongs() {
    return [...this.mainBgmSongs]
  }

  getGameBgmSongs() {
    return [...this.gameBgmSongs]
  }

  getSongById(id) {
    return this.songs.find(song => song.id === id);
  }

  getNextSong() {
    if (this.songs.length === 0) return null;
    
    let nextIndex;
    const availableIndices = this.songs
      .map((_, index) => index)
      .filter(index => !this.lastPlayedIndices.includes(index));
    
    if (availableIndices.length === 0) {
      this.lastPlayedIndices = [];
      nextIndex = Math.floor(Math.random() * this.songs.length);
    } else {
      nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    }
    
    this.lastPlayedIndices.push(nextIndex);
    if (this.lastPlayedIndices.length > this.songs.length) {
      this.lastPlayedIndices.shift();
    }
    
    this.currentSongIndex = nextIndex;
    return this.songs[nextIndex];
  }

  getCurrentSong() {
    return this.songs[this.currentSongIndex] || null;
  }

  getAllSongs() {
    return [...this.songs];
  }

  getSongsCount() {
    return this.songs.length;
  }
}

const musicService = new MusicService();
export default musicService;
