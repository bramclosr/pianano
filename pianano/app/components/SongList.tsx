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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const SongList = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await axios.get(`${API_URL}/songs`);
      setSongs(response.data);
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  const handleSongSelect = (song: Song) => {
    setSelectedSong(song);
    setShowModal(true);
  };

  // Format Nano amount to exactly 0.1 instead of 1.0
  const formatNanoAmount = (rawAmount: string): string => {
    // Convert to number and divide by 10^30 (Nano raw conversion)
    const nanoAmount = Number(rawAmount) / 1e30;
    // Format to fixed 1 decimal place
    return nanoAmount.toFixed(1);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Play a Song</h2>
      <p className="text-gray-600 mb-4">Select a song to play on the piano. Each play costs 0.1 Nano.</p>
      
      <div className="flex-grow">
        {songs.map((song) => (
          <div key={song.id} className="mb-4 last:mb-0">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
              <h3 className="font-bold text-gray-900 mb-2">{song.name}</h3>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{formatNanoAmount(song.price_raw)} Nano</span>
                <button
                  onClick={() => handleSongSelect(song)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Play Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          Watch the piano play your selected song live on the stream!
        </p>
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