'use client';

import { PollenData } from '@/types';

interface RegionSelectorProps {
  selectedRegion: string | null;
  onRegionChange: (region: string | null) => void;
  regions: PollenData[];
}

export default function RegionSelector({
  selectedRegion,
  onRegionChange,
  regions
}: RegionSelectorProps) {
  return (
    <div className="glass rounded-lg p-4 min-w-[250px]">
      <label className="text-sm text-gray-300 mb-2 block">
        地域を選択
      </label>
      <select
        value={selectedRegion || ''}
        onChange={(e) => onRegionChange(e.target.value || null)}
        className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-500"
      >
        <option value="">全地域</option>
        {regions.map((region) => (
          <option key={region.region} value={region.region}>
            {region.region} - {region.prefecture}
          </option>
        ))}
      </select>
      
      {selectedRegion && (
        <button
          onClick={() => onRegionChange(null)}
          className="mt-2 text-sm text-yellow-500 hover:text-yellow-400"
        >
          選択解除
        </button>
      )}
    </div>
  );
}