'use client';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#050810] flex items-center justify-center">
      <div className="text-center">
        <div className="float-animation mb-6">
          <span className="text-8xl">🌸</span>
        </div>
        <h2 className="text-2xl font-bold text-yellow-500 mb-4">
          PollenStorm AI
        </h2>
        <div className="flex items-center justify-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="text-gray-400 mt-4">
          データを読み込み中...
        </p>
      </div>
    </div>
  );
}