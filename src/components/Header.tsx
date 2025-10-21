'use client';

import { ConnectionStatus } from '@/types';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  lastUpdated?: string | null;
}

export default function Header({
  connectionStatus,
  lastUpdated
}: HeaderProps) {
  const statusColors: Record<ConnectionStatus, string> = {
    ready: 'bg-green-500',
    refreshing: 'bg-yellow-500',
    idle: 'bg-gray-500',
    error: 'bg-red-500'
  };

  const statusText: Record<ConnectionStatus, string> = {
    ready: '最新のデータ',
    refreshing: '更新中...',
    idle: '未取得',
    error: 'エラー'
  };

  const updatedDate = lastUpdated ? new Date(lastUpdated) : null;
  const formattedUpdatedDate = updatedDate
    ? updatedDate.toLocaleDateString('ja-JP')
    : '---';
  const formattedUpdatedTime = updatedDate
    ? updatedDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    : '---';

  return (
    <header className="glass border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="float-animation">
              <span className="text-4xl">🌸</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                PollenStorm AI
              </h1>
              <p className="text-sm text-gray-400">
                花粉可視化 & 予測
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex flex-col text-right">
              <span className="text-xs text-gray-500">最終更新</span>
              <span className="text-sm text-gray-300">{formattedUpdatedDate}</span>
              <span className="text-xs text-gray-400">{formattedUpdatedTime}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${statusColors[connectionStatus]} pulse-glow`} />
              <span className="text-sm text-gray-300">
                {statusText[connectionStatus]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
