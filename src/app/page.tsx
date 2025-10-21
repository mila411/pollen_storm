'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { PollenData, PollenPrediction } from '@/types';
import { usePollenData } from '@/hooks/usePollenData';
import Header from '@/components/Header';
import RegionSelector from '@/components/RegionSelector';
import PollenStats from '@/components/PollenStats';
import PredictionPanel from '@/components/PredictionPanel';
import LoadingScreen from '@/components/LoadingScreen';
import { getPollenLabel, getPollenColor, POLLEN_DENSITY_UNIT } from '@/utils/pollenLevels';

// Dynamic imports for components that use browser-only APIs
const PollenVisualization = dynamic(
  () => import('@/components/PollenVisualization'),
  { ssr: false }
);

const MapView = dynamic(
  () => import('@/components/MapView'),
  { ssr: false }
);

export default function Home() {
  type TimeMode = 'today' | 'yesterday' | 'week' | 'custom';

  const today = new Date();
  const seasonYear = today.getMonth() + 1 >= 2 ? today.getFullYear() : today.getFullYear() - 1;
  const seasonStart = new Date(seasonYear, 1, 1, 12);
  const seasonEndCandidate = new Date(seasonYear, 4, 31, 12);
  const isTodayInSeason = today >= seasonStart && today <= seasonEndCandidate;
  const seasonEndBase = isTodayInSeason ? today : seasonEndCandidate;
  const seasonEndTime = Math.max(seasonStart.getTime(), seasonEndBase.getTime());
  const seasonEnd = new Date(seasonEndTime);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const clampDateToSeason = (date: Date) => {
    if (date.getTime() < seasonStart.getTime()) {
      return new Date(seasonStart.getTime());
    }
    if (date.getTime() > seasonEnd.getTime()) {
      return new Date(seasonEnd.getTime());
    }
    return new Date(date.getTime());
  };

  const seasonStartString = formatDate(seasonStart);
  const seasonEndString = formatDate(seasonEnd);
  const seasonToday = clampDateToSeason(today);
  const seasonTodayString = formatDate(seasonToday);
  const realTodayString = formatDate(today);
  const seasonYesterdayBase = new Date(seasonToday);
  seasonYesterdayBase.setDate(seasonYesterdayBase.getDate() - 1);
  const seasonYesterdayString = formatDate(
    clampDateToSeason(seasonYesterdayBase)
  );
  const seasonWeekBase = new Date(seasonToday);
  seasonWeekBase.setDate(seasonWeekBase.getDate() - 7);
  const seasonWeekString = formatDate(
    clampDateToSeason(seasonWeekBase)
  );

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'map'>('3d');
  const [timeMode, setTimeMode] = useState<TimeMode>(
    () => (seasonTodayString === realTodayString ? 'today' : 'custom')
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    () => seasonTodayString
  );

  const handleQuickSelect = (mode: TimeMode) => {
    let targetDate = new Date(seasonToday);
    if (mode === 'yesterday') {
      targetDate.setDate(seasonToday.getDate() - 1);
    } else if (mode === 'week') {
      targetDate.setDate(seasonToday.getDate() - 7);
    }
    const clamped = clampDateToSeason(targetDate);
    const clampedString = formatDate(clamped);
    setSelectedDate(clampedString);
    if (mode === 'today' && clampedString === seasonTodayString) {
      setTimeMode('today');
    } else if (mode === 'yesterday' && clampedString === seasonYesterdayString) {
      setTimeMode('yesterday');
    } else if (mode === 'week' && clampedString === seasonWeekString) {
      setTimeMode('week');
    } else {
      setTimeMode('custom');
    }
  };

  const handleCalendarChange = (value: string) => {
    if (!value) return;
    const parsed = new Date(value);
    const clamped = clampDateToSeason(parsed);
    const normalized = formatDate(clamped);
    setSelectedDate(normalized);
    if (normalized === seasonTodayString) {
      setTimeMode('today');
    } else if (normalized === seasonYesterdayString) {
      setTimeMode('yesterday');
    } else if (normalized === seasonWeekString) {
      setTimeMode('week');
    } else {
      setTimeMode('custom');
    }
  };

  const { 
    pollenData, 
    predictions, 
    loading, 
    error,
    connectionStatus,
    lastUpdated
  } = usePollenData(selectedDate);

  const currentRegionData = selectedRegion
    ? pollenData?.find((d: PollenData) => d.region === selectedRegion)
    : null;

  const currentPrediction = selectedRegion
    ? predictions?.find((p: PollenPrediction) => p.region === selectedRegion)
    : null;

  const currentRegionObservedAt = currentRegionData?.weatherData?.observedAt ?? null;

  if (loading && !pollenData) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a0e27] to-[#050810]">
      <Header 
        connectionStatus={connectionStatus}
        lastUpdated={lastUpdated}
      />
      
      <div className="relative">
        {/* Control Panel */}
        <div className="absolute top-4 left-4 z-10 space-y-4">
          <RegionSelector
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
            regions={pollenData || []}
          />
          
          <div className="glass rounded-lg p-4">
            <div className="text-sm text-gray-300 mb-2">表示モード</div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('3d')}
                className={`px-4 py-2 rounded ${
                  viewMode === '3d'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-700 text-white'
                }`}
              >
                3D パーティクル
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded ${
                  viewMode === 'map'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-700 text-white'
                }`}
              >
                マップ
              </button>
            </div>
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-sm text-gray-300">時間</div>
                <div className="text-xs text-gray-500">過去1年間まで選択できます</div>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-xs text-gray-500">選択日</span>
                <span className="text-sm text-gray-200">
                  {selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('ja-JP') : '---'}
                </span>
              </div>
            </div>

            <div className="mb-3">
              <input
                type="date"
                value={selectedDate}
                min={seasonStartString}
                max={seasonEndString}
                onChange={(event) => handleCalendarChange(event.target.value)}
                className="w-full rounded border border-gray-600 bg-gray-800/80 px-3 py-2 text-sm text-gray-100 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickSelect('today')}
                className={`px-3 py-2 rounded text-sm ${
                  timeMode === 'today'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-700 text-white'
                }`}
              >
                今日
              </button>
              <button
                onClick={() => handleQuickSelect('yesterday')}
                className={`px-3 py-2 rounded text-sm ${
                  timeMode === 'yesterday'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-700 text-white'
                }`}
              >
                昨日
              </button>
              <button
                onClick={() => handleQuickSelect('week')}
                className={`px-3 py-2 rounded text-sm ${
                  timeMode === 'week'
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-700 text-white'
                }`}
              >
                1週間前
              </button>
            </div>
          </div>
        </div>

        {/* Main Visualization */}
        <div className="h-[70vh]">
          {viewMode === '3d' ? (
            <PollenVisualization
              pollenData={pollenData || []}
              selectedRegion={selectedRegion}
              onRegionClick={setSelectedRegion}
            />
          ) : (
            <MapView
              pollenData={pollenData || []}
              selectedRegion={selectedRegion}
              onRegionClick={setSelectedRegion}
              onBackTo3D={() => setViewMode('3d')}
            />
          )}
        </div>

        {/* Stats Panel */}
        <div className="absolute bottom-4 right-4 z-10">
          <PollenStats data={pollenData || []} selectedRegion={selectedRegion} />
        </div>
      </div>

      {/* Region Detail Panel */}
      {selectedRegion && currentRegionData && (
        <div className="container mx-auto px-4 py-8">
          <div className="glass rounded-xl p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  {currentRegionData.region}
                </h2>
                <p className="text-gray-400">{currentRegionData.prefecture}</p>
              </div>
              <button
                onClick={() => setSelectedRegion(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Data */}
              <div>
                <h3 className="text-xl font-semibold mb-4">現在の花粉状況</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">花粉レベル</span>
                      <span className={`font-semibold px-2 py-1 rounded-full text-sm border border-current`} style={{ color: getPollenColor(currentRegionData.pollenLevel) }}>
                        {getPollenLabel(currentRegionData.pollenLevel)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">推定濃度</span>
                      <span className="font-bold" style={{ color: getPollenColor(currentRegionData.pollenLevel) }}>
                        {currentRegionData.pollenCount.toFixed(0)}
                        <span className="text-sm ml-1">{POLLEN_DENSITY_UNIT}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">天気</span>
                    <span>{currentRegionData.weatherData.condition || '不明'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">湿度</span>
                    <span>{currentRegionData.weatherData.humidity.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">風速</span>
                    <span>{currentRegionData.weatherData.windSpeed.toFixed(1)} m/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">風向</span>
                    <span>{getWindDirection(currentRegionData.weatherData.windDirection)}</span>
                  </div>
                  {currentRegionObservedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">観測時刻</span>
                      <span>{formatObservedAt(currentRegionObservedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Prediction */}
              {currentPrediction && (
                <PredictionPanel prediction={currentPrediction} />
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 left-4 bg-red-500 text-white px-6 py-3 rounded-lg">
          エラー: {error}
        </div>
      )}
    </main>
  );
}

function getWindDirection(degrees: number): string {
  const directions = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

function formatObservedAt(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '不明';
  }
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
