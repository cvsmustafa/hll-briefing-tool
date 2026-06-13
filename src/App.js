import React, { useState } from 'react';
import MapEditor from './MapEditor';

const MAPS = [
  'Carentan', 'Driel', 'El Alamein', 'Elsenborn', 'Foy',
  'Hill 400', 'Hurtgen', 'Kharkov', 'Kursk', 'Mortain',
  'Omaha Beach', 'Purple Heart Lane', 'Remagen', 'Stalingrad',
  'Saint Marie Du Mont', 'Tobruk', 'Utah Beach'
];

export default function App() {
  const [selectedMap, setSelectedMap] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);

  if (editorOpen && selectedMap) {
    return <MapEditor mapName={selectedMap} onBack={() => setEditorOpen(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      <header className="bg-gray-900 border-b border-yellow-600 px-6 py-4 flex items-center gap-3">
        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
        <h1 className="text-xl font-bold tracking-widest uppercase text-yellow-400">
          HLL Briefing Tool
        </h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">

        <h2 className="text-2xl font-semibold mb-2">Harita Seç</h2>
        <p className="text-gray-400 mb-8">Brifing oluşturmak için bir harita seç.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {MAPS.map((map) => (
            <button
              key={map}
              onClick={() => setSelectedMap(map)}
              className={`
                px-4 py-3 rounded border text-sm font-medium transition-all
                ${selectedMap === map
                  ? 'bg-yellow-500 text-black border-yellow-500'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-yellow-500 hover:text-yellow-400'
                }
              `}
            >
              {map}
            </button>
          ))}
        </div>

        {selectedMap && (
          <div className="mt-10 p-6 bg-gray-900 border border-gray-700 rounded-lg">
            <p className="text-gray-400 text-sm mb-1">Seçilen harita</p>
            <h3 className="text-2xl font-bold text-yellow-400">{selectedMap}</h3>
            <button
              onClick={() => setEditorOpen(true)}
              className="mt-4 px-6 py-2 bg-yellow-500 text-black font-semibold rounded hover:bg-yellow-400 transition-all"
            >
              Brifing Oluştur →
            </button>
          </div>
        )}

      </main>
    </div>
  );
}