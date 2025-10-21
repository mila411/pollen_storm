// PollenStorm AI - Shared Type Definitions

export interface PollenData {
  id: string;
  timestamp: Date;
  prefecture: string;
  region: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  pollenCount: number;
  pollenLevel: 'low' | 'moderate' | 'high' | 'very_high';
  weatherData: WeatherData;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  rainfall: number;
}

export interface PollenPrediction {
  prefecture: string;
  region: string;
  date: Date;
  predictedLevel: 'low' | 'moderate' | 'high' | 'very_high';
  confidence: number;
  factors: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    historicalTrend: number;
  };
}

export interface ParticleData {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  intensity: number;
  color: string;
  size: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: Date;
}

export type PollenLevel = 'low' | 'moderate' | 'high' | 'very_high';

export interface Region {
  id: string;
  name: string;
  prefecture: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  bounds: MapBounds;
}