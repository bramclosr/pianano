import React from 'react';

const VideoStream = () => {
  return (
    <div className="bg-black rounded-lg overflow-hidden shadow-md">
      <div className="w-full relative pt-[56.25%]"> {/* 16:9 Aspect Ratio */}
        <iframe
          className="absolute top-0 left-0 right-0 bottom-0 w-full h-full"
          src="https://www.youtube.com/embed/dEGRjOvQClM?autoplay=1&mute=1"
          title="Piano Livestream"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      <div className="bg-gray-800 text-white p-3 text-sm">
        <p>🔴 Live: PiaNano Self-Playing Piano</p>
      </div>
    </div>
  );
};

export default VideoStream; 