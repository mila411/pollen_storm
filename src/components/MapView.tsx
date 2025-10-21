'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { PollenData } from '@/types';
import { getPollenColor, getPollenLabel } from '@/utils/pollenLevels';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  pollenData: PollenData[];
  selectedRegion: string | null;
  onRegionClick: (region: string) => void;
  onBackTo3D?: () => void;
}

// Component to update map view when region is selected
function MapController({ selectedRegion, pollenData }: { selectedRegion: string | null; pollenData: PollenData[] }) {
  const map = useMap();

  useEffect(() => {
    if (selectedRegion) {
      const region = pollenData.find(d => d.region === selectedRegion);
      if (region) {
        map.setView([region.coordinates.lat, region.coordinates.lng], 10);
      }
    } else {
      map.setView([36.5, 138], 5); // Center of Japan
    }
  }, [selectedRegion, pollenData, map]);

  return null;
}

export default function MapView({ pollenData, selectedRegion, onRegionClick, onBackTo3D }: MapViewProps) {

  const getPollenRadius = (count: number) => {
    return Math.min(50000, Math.max(10000, count * 500));
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[36.5, 138]}
        zoom={5}
        style={{ height: '100%', width: '100%', background: '#0a0e27' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {pollenData.map((region) => (
          <CircleMarker
            key={region.region}
            center={[region.coordinates.lat, region.coordinates.lng]}
            radius={15}
            pathOptions={{
              fillColor: getPollenColor(region.pollenLevel),
              color: getPollenColor(region.pollenLevel),
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.6
            }}
            eventHandlers={{
              click: () => onRegionClick(region.region)
            }}
          >
            <Popup>
              <div className="text-black p-2">
                <h3 className="font-bold text-lg">{region.region}</h3>
                <p className="text-sm text-gray-600">{region.prefecture}</p>
                <div className="mt-2 space-y-1">
                  <div>
                    <strong>花粉:</strong> {region.pollenCount.toFixed(0)} 個/cm³
                  </div>
                  <div>
                    <strong>レベル:</strong> {getPollenLabel(region.pollenLevel)}
                  </div>
                  <div>
                    <strong>天気:</strong> {region.weatherData.condition || '不明'}
                  </div>
                  <div>
                    <strong>湿度:</strong> {region.weatherData.humidity.toFixed(0)}%
                  </div>
                  <div>
                    <strong>風速:</strong> {region.weatherData.windSpeed.toFixed(1)} m/s
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        <MapController selectedRegion={selectedRegion} pollenData={pollenData} />
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass rounded-lg p-4 z-[1000]">
        <h4 className="text-sm font-semibold mb-2 text-white">花粉レベル</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ background: getPollenColor('low') }}></div>
            <span className="text-xs text-white">{getPollenLabel('low')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ background: getPollenColor('moderate') }}></div>
            <span className="text-xs text-white">{getPollenLabel('moderate')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ background: getPollenColor('high') }}></div>
            <span className="text-xs text-white">{getPollenLabel('high')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ background: getPollenColor('very_high') }}></div>
            <span className="text-xs text-white">{getPollenLabel('very_high')}</span>
          </div>
        </div>
      </div>

      {onBackTo3D && (
        <button
          onClick={onBackTo3D}
          className="absolute top-4 right-4 z-[1000] bg-yellow-500 text-black px-4 py-2 rounded shadow-lg hover:bg-yellow-400 transition"
        >
          3Dビューに戻る
        </button>
      )}
    </div>
  );
}