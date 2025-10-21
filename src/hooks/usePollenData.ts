'use client';

import { useState, useEffect, useCallback } from 'react';
import { PollenData, PollenPrediction, ConnectionStatus } from '@/types';
import { getFrontendLevelFromCount } from '@/utils/pollenLevels';

const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8001';

const DEFAULT_WEATHER: PollenData['weatherData'] = {
  temperature: 20,
  humidity: 60,
  windSpeed: 0,
  windDirection: 180,
  pressure: 1013,
  rainfall: 0,
  condition: '不明'
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePollenEntry(entry: any): PollenData {
  const pollenCountRaw = toNumber(
    entry?.pollenCount ?? entry?.pollen_count ?? entry?.pollen ?? 0,
    0
  );
  const pollenCount = Math.max(0, pollenCountRaw);
  const coords = entry?.coordinates ?? {};
  const weatherSource = entry?.weatherData ?? entry;
  const pollenLevel = getFrontendLevelFromCount(pollenCount);

  return {
    id: String(entry?.id ?? entry?.region_id ?? entry?.region ?? entry?.prefecture ?? 'unknown'),
    timestamp: entry?.timestamp ?? new Date().toISOString(),
    prefecture: entry?.prefecture ?? entry?.region ?? '不明',
    region: entry?.region ?? entry?.prefecture ?? '不明',
    coordinates: {
      lat: toNumber(entry?.latitude ?? coords.lat, 0),
      lng: toNumber(entry?.longitude ?? coords.lng, 0)
    },
    pollenCount,
    pollenLevel,
    weatherData: {
      temperature: toNumber(weatherSource?.temperature, DEFAULT_WEATHER.temperature),
      humidity: toNumber(weatherSource?.humidity, DEFAULT_WEATHER.humidity),
      windSpeed: toNumber(weatherSource?.windSpeed ?? weatherSource?.wind_speed, DEFAULT_WEATHER.windSpeed),
      windDirection: toNumber(weatherSource?.windDirection ?? weatherSource?.wind_direction, DEFAULT_WEATHER.windDirection),
      pressure: toNumber(weatherSource?.pressure, DEFAULT_WEATHER.pressure),
      rainfall: toNumber(weatherSource?.rainfall, DEFAULT_WEATHER.rainfall),
      condition: String(
        weatherSource?.condition ??
        weatherSource?.weather_condition ??
        weatherSource?.weatherCondition ??
        weatherSource?.telop ??
        DEFAULT_WEATHER.condition
      ).trim() || DEFAULT_WEATHER.condition,
      observedAt: weatherSource?.observedAt ?? weatherSource?.observed_at ?? undefined,
      source: weatherSource?.source ?? undefined
    }
  };
}

function normalizePollenList(payload: unknown): PollenData[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizePollenEntry);
  }
  if (payload && typeof payload === 'object') {
    return [normalizePollenEntry(payload)];
  }
  return [];
}

function normalizePredictionEntry(entry: any): PollenPrediction {
  const predictedValueRaw = toNumber(
    entry?.pollen_predicted ??
    entry?.pollenPredicted ??
    entry?.predicted ??
    entry?.pollen_tomorrow ??
    entry?.tomorrow ?? 0,
    0
  );
  const pollenTodayRaw = toNumber(
    entry?.pollen_today ??
    entry?.pollenToday ??
    entry?.today ??
    entry?.pollen_count ??
    0,
    0
  );
  const predictedValue = Math.max(0, predictedValueRaw);
  const pollenToday = Math.max(0, pollenTodayRaw);
  const predictedLevel = getFrontendLevelFromCount(predictedValue);

  const factors = entry?.factors ?? {};

  return {
    prefecture: entry?.prefecture ?? entry?.region ?? '不明',
    region: entry?.region ?? entry?.prefecture ?? '不明',
    date: entry?.timestamp ?? new Date().toISOString(),
    predictedLevel,
    confidence: Number(entry?.confidence ?? 0),
    factors: {
      temperature: toNumber(factors.temperature ?? entry?.temperatureImpact ?? entry?.temperature, 0),
      humidity: toNumber(factors.humidity ?? entry?.humidityImpact ?? entry?.humidity, 0),
      windSpeed: toNumber(factors.windSpeed ?? entry?.windImpact ?? entry?.wind_speed, 0),
      historicalTrend: toNumber(
        factors.historicalTrend,
        predictedValue - pollenToday
      )
    }
  };
}

function normalizePredictionList(payload: unknown): PollenPrediction[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizePredictionEntry);
  }
  if (payload && typeof payload === 'object') {
    return [normalizePredictionEntry(payload)];
  }
  return [];
}

interface FetchOptions {
  refresh?: boolean;
  date?: string;
}

export function usePollenData(targetDate?: string) {
  const [pollenData, setPollenData] = useState<PollenData[] | null>(null);
  const [predictions, setPredictions] = useState<PollenPrediction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const applyPollenUpdate = useCallback((payload: unknown) => {
    const normalized = normalizePollenList(payload);
    if (normalized.length > 0) {
      setPollenData(normalized);
    }
  }, []);

  // Fetch initial data
  const fetchInitialData = useCallback(async (options: FetchOptions = {}) => {
    const { refresh = false, date } = options;
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setConnectionStatus('refreshing');

      const queryParams = new URLSearchParams();
      if (refresh) {
        queryParams.set('refresh', 'true');
      }
      const effectiveDate = date ?? targetDate;
      if (effectiveDate) {
        queryParams.set('date', effectiveDate);
      }
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';

      // Fetch current pollen data
      const pollenResponse = await fetch(`${ML_SERVICE_URL}/data/current${query}`);
      if (!pollenResponse.ok) throw new Error('Failed to fetch pollen data');
      const pollenResult = await pollenResponse.json();

      // Fetch predictions
      const predictionResponse = await fetch(`${ML_SERVICE_URL}/predict${query}`);
      if (!predictionResponse.ok) throw new Error('Failed to fetch predictions');
      const predictionResult = await predictionResponse.json();

      const normalizedPollen = normalizePollenList(pollenResult?.data ?? pollenResult);
      const normalizedPredictions = normalizePredictionList(
        predictionResult?.predictions ?? predictionResult
      );

      setPollenData(normalizedPollen);
      setPredictions(normalizedPredictions);
      setError(null);
      setConnectionStatus('ready');
      const backendTimestamp =
        (typeof pollenResult?.timestamp === 'string' && pollenResult.timestamp) ||
        (typeof predictionResult?.timestamp === 'string' && predictionResult.timestamp) ||
        null;
      const requestedDate =
        (typeof pollenResult?.requested_date === 'string' && pollenResult.requested_date) ||
        (typeof predictionResult?.requested_date === 'string' && predictionResult.requested_date) ||
        effectiveDate ||
        null;
      setLastUpdated(
        backendTimestamp ??
          (requestedDate ? new Date(`${requestedDate}T12:00:00`).toISOString() : new Date().toISOString())
      );
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConnectionStatus('error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetDate]);

  useEffect(() => {
    fetchInitialData({ date: targetDate });
  }, [fetchInitialData, targetDate]);

  return {
    pollenData,
    predictions,
    loading,
    refreshing,
    error,
    connectionStatus,
    lastUpdated,
    refetch: (date?: string) => {
      void fetchInitialData({ refresh: true, date: date ?? targetDate });
    }
  };
}