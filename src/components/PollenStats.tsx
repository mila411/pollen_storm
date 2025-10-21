'use client';

import { PollenData } from '@/types';
import { getPollenLabel, getPollenColor, POLLEN_DENSITY_UNIT } from '@/utils/pollenLevels';

interface PollenStatsProps {
  data: PollenData[];
  selectedRegion?: string | null;
}

export default function PollenStats({ data, selectedRegion }: PollenStatsProps) {
  if (!data || data.length === 0) return null;

  const regionFiltered = selectedRegion
    ? data.filter(d => d.region === selectedRegion)
    : data;

  const visibleData = regionFiltered.length > 0 ? regionFiltered : data;
  const dataLength = Math.max(visibleData.length, 1);

  const levelCounts = {
    low: visibleData.filter(d => d.pollenLevel === 'low').length,
    moderate: visibleData.filter(d => d.pollenLevel === 'moderate').length,
    high: visibleData.filter(d => d.pollenLevel === 'high').length,
    very_high: visibleData.filter(d => d.pollenLevel === 'very_high').length
  };

  const averagePollen = visibleData.reduce(
    (sum, d) => sum + d.pollenCount,
    0
  ) / dataLength;

  const isRegionSelected = Boolean(selectedRegion && regionFiltered.length > 0);
  const regionLabel = isRegionSelected
    ? `${visibleData[0].region}の花粉濃度`
    : '平均花粉濃度';
  const panelTitle = isRegionSelected
    ? `${visibleData[0].region}の統計`
    : '全国統計';

  return (
    <div className="glass rounded-lg p-4 min-w-[250px]">
      <h3 className="text-lg font-semibold mb-3">{panelTitle}</h3>
      
      <div className="space-y-3">
        <div>
          <div className="text-sm text-gray-400 mb-1">{regionLabel}</div>
          <div className="text-2xl font-bold text-yellow-500">
            {averagePollen.toFixed(1)} 
            <span className="text-sm ml-1">{POLLEN_DENSITY_UNIT}</span>
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-400 mb-2">レベル分布</div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: getPollenColor('low') }}>
                {getPollenLabel('low')}
              </span>
              <div className="flex-1 mx-2 bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(levelCounts.low / dataLength) * 100}%`,
                    background: getPollenColor('low')
                  }}
                />
              </div>
              <span className="text-sm text-gray-400">{levelCounts.low}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: getPollenColor('moderate') }}>
                {getPollenLabel('moderate')}
              </span>
              <div className="flex-1 mx-2 bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(levelCounts.moderate / dataLength) * 100}%`,
                    background: getPollenColor('moderate')
                  }}
                />
              </div>
              <span className="text-sm text-gray-400">{levelCounts.moderate}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: getPollenColor('high') }}>
                {getPollenLabel('high')}
              </span>
              <div className="flex-1 mx-2 bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(levelCounts.high / dataLength) * 100}%`,
                    background: getPollenColor('high')
                  }}
                />
              </div>
              <span className="text-sm text-gray-400">{levelCounts.high}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: getPollenColor('very_high') }}>
                {getPollenLabel('very_high')}
              </span>
              <div className="flex-1 mx-2 bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(levelCounts.very_high / dataLength) * 100}%`,
                    background: getPollenColor('very_high')
                  }}
                />
              </div>
              <span className="text-sm text-gray-400">{levelCounts.very_high}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-500">
            観測地点: {visibleData.length}箇所
          </div>
        </div>
      </div>
    </div>
  );
}