import VideoStream from './components/VideoStream';
import SongList from './components/SongList';
import DonationProgress from './components/DonationProgress';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white p-4">
        <h1 className="text-2xl font-bold m-0">PiaNano</h1>
        <p className="mt-2 opacity-80">Watch the self-playing piano and request songs with Nano</p>
      </header>
      <main className="max-w-6xl mx-auto p-4 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 mb-8">
          <VideoStream />
          <SongList />
        </div>
        <DonationProgress />
      </main>
    </div>
  );
}
