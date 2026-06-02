import { supabase } from './supabase';

class MusicService {
  constructor() {
    this.songs = [];
    this.currentSongIndex = 0;
    this.lastPlayedIndices = [];
  }

  async fetchSongs() {
    try {
      const { data, error } = await supabase.from('songs').select('*');
      
      if (error) {
        console.error('Error fetching songs:', error);
        return false;
      }
      
      this.songs = data || [];
      console.log('Fetched songs:', this.songs.length);
      return true;
    } catch (error) {
      console.error('Exception fetching songs:', error);
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
