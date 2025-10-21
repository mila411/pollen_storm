'use client';

import { PollenPrediction } from '@/types';

interface PredictionPanelProps {
  prediction: PollenPrediction;
}

export default function PredictionPanel({ prediction }: PredictionPanelProps) {
  const levelColors = {
    low: 'text-green-500',
    moderate: 'text-yellow-500',
    high: 'text-orange-500',
    very_high: 'text-red-500'
  };

  const levelText = {
    low: '低い',
    moderate: '普通',
    high: '多い',
    very_high: '非常に多い'
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <span className="mr-2">🔮</span>
        明日の予測
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">予測レベル</span>
          <span className={`font-bold ${levelColors[prediction.predictedLevel]}`}>
            {levelText[prediction.predictedLevel]}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">信頼度</span>
          <span className="font-semibold">
            {(prediction.confidence * 100).toFixed(0)}%
          </span>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-2">予測要因</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">気温影響</span>
              <span>{prediction.factors.temperature > 0 ? '+' : ''}
                {prediction.factors.temperature.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">湿度影響</span>
              <span>{prediction.factors.humidity > 0 ? '+' : ''}
                {prediction.factors.humidity.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">風速影響</span>
              <span>{prediction.factors.windSpeed > 0 ? '+' : ''}
                {prediction.factors.windSpeed.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-500 bg-opacity-20 rounded text-sm">
          💡 予測は過去のデータとAIモデルに基づいています
        </div>
      </div>
    </div>
  );
}