'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaymentModal from './PaymentModal';

interface Song {
  id: number;
  name: string;
  nano_address: string;
  price_raw: string;
}

const SongList = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await axios.get('http://localhost:3000/songs');
      setSongs(response.data);
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  const handleSongSelect = (song: Song) => {
    setSelectedSong(song);
    setShowModal(true);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Available Songs</h2>
      <div className="songs">
        {songs.map((song) => (
          <div key={song.id} className="flex justify-between items-center p-4 border-b border-gray-200 last:border-b-0">
            <span className="song-name text-gray-900 font-medium">{song.name}</span>
            <button
              onClick={() => handleSongSelect(song)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Play ({Number(song.price_raw) / 1e30} Nano)
            </button>
          </div>
        ))}
      </div>
      
      {showModal && selectedSong && (
        <PaymentModal 
          song={selectedSong}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default SongList; 