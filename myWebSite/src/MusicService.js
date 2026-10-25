import { supabase } from './supabase';

class MusicService {
  constructor() {
    this.songs = [];
    this.mainBgmSongs = [];
    this.gameBgmSongs = [];
    this.currentSongIndex = 0;
    this.lastPlayedIndices = [];
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
      
      this.songs = data || [];
      console.log('MusicService: Fetched songs:', this.songs.length);
      console.log('MusicService: Songs data:', this.songs);
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
          const path = `${folder}/${item.name}`
          const { data: urlData } = supabase.storage.from('music-files').getPublicUrl(path)
          return {
            title: item.name.replace(/\.[^.]+$/, ''),
            url: urlData?.publicUrl || '',
            playlist,
          }
        })

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
