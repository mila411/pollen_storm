// PollenStorm AI - Type Definitions

export interface PollenData {
  id: string;
  timestamp: Date | string;
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
  condition: string;
  observedAt?: string;
  source?: string;
}

export interface PollenPrediction {
  prefecture: string;
  region: string;
  date: Date | string;
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

export type ConnectionStatus = 'idle' | 'refreshing' | 'ready' | 'error';