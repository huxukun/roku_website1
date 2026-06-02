import { supabase } from './supabase';

class MusicService {
  constructor() {
    this.songs = [];
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
