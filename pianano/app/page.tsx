import VideoStream from './components/VideoStream';
import SongList from './components/SongList';
import UploadForm from './components/UploadForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white p-4">
        <h1 className="text-2xl font-bold m-0">Pianano</h1>
        <p className="mt-2 opacity-80">Watch the self-playing piano and request songs with Nano</p>
      </header>
      <main>
        <VideoStream />
        <div className="max-w-6xl mx-auto p-4 mt-8 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8">
          <SongList />
          <UploadForm />
        </div>
      </main>
    </div>
  );
}
