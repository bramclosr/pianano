'use client';

import React, { useState } from 'react';
import axios from 'axios';

const TEST_NANO_ADDRESS = 'nano_3uct7fjjxg87ccg3n6dtx51hk7ekjkz79ihd7pdsasp6qzo9pim6fcy1jh66';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const UploadForm = () => {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    setUploading(true);
    const formData = new FormData();
    
    formData.append('name', name);
    formData.append('midi_data', file);
    formData.append('nano_address', TEST_NANO_ADDRESS);
    formData.append('price_raw', '10000000000000000000000000000000');

    try {
      const response = await axios.post(`${API_URL}/songs`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Upload response:', response.data);
      setName('');
      setFile(null);
      alert('Song uploaded successfully!');
      
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Error details:', error);
      alert(`Failed to upload song: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Upload Your MIDI</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block mb-2 text-gray-900 font-medium">Song Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-gray-900"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="file" className="block mb-2 text-gray-900 font-medium">MIDI File:</label>
          <input
            type="file"
            id="file"
            accept=".mid,.midi"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full p-2 border border-gray-300 rounded text-gray-900"
            required
          />
        </div>
        <button
          type="submit"
          disabled={uploading || !file || !name}
          className="w-full py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload Song'}
        </button>
      </form>
    </div>
  );
};

export default UploadForm; 