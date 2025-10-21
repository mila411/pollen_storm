# 🌸 PollenStorm AI

**リアルタイム日本スギ花粉データ可視化 & AI予測システム**

PollenStorm AIは、日本のスギ花粉データをリアルタイムで3D可視化し、AIモデルで花粉リスクを予測するWebアプリケーションです。

<p align="center">
  <img src=".github/main.png" alt="logo" width=95%>
</p>

![PollenStorm AI](https://img.shields.io/badge/Status-done-green) ![Python](https://img.shields.io/badge/Python-3.9+-blue) ![React](https://img.shields.io/badge/React-18+-61DAFB) ![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688)

---

## 🎯 主な機能

### 1. **3Dパーティクル可視化**
- Three.jsを使用した動的な3D花粉パーティクルストーム
- 風向・風速に基づくリアルタイムアニメーション
- 花粉レベルに応じた色分け表示（緑→黄→橙→赤）

### 2. **インタラクティブマップビュー**
- Leaflet.jsによる日本地図上の花粉分布表示
- 地域別の詳細情報ポップアップ
- リアルタイムデータ更新

### 3. **AI予測**
- LSTM/回帰モデルによる明日の花粉リスク予測
- 気象データ（気温、湿度、風速）を考慮した高精度予測
- 信頼度スコア付き予測結果

### 4. **リアルタイム更新**
- WebSocketによる継続的なデータストリーミング
- 15分ごとの自動データ収集
- 接続状態の可視化

### 5. **詳細な地域情報**
- 地域選択による詳細表示
- 現在の花粉状況と気象条件
- 明日の予測と影響要因分析

---

## 📁 プロジェクト構造

```
pollen_storm/
├── src/                          # Next.js フロントエンド
│   ├── app/
│   │   ├── layout.tsx           # アプリレイアウト
│   │   ├── page.tsx             # メインページ
│   │   └── globals.css          # グローバルスタイル
│   ├── components/
│   │   ├── Header.tsx           # ヘッダーコンポーネント
│   │   ├── RegionSelector.tsx   # 地域選択
│   │   ├── PollenStats.tsx      # 統計表示
│   │   ├── PredictionPanel.tsx  # 予測パネル
│   │   ├── PollenVisualization.tsx  # 3D可視化
│   │   ├── MapView.tsx          # マップビュー
│   │   └── LoadingScreen.tsx    # ローディング画面
│   ├── hooks/
│   │   └── usePollenData.ts     # データフックAPIの
│   └── types/
│       └── index.ts             # 型定義
├── ml-model/                     # Python ML サービス
│   ├── main.py                  # FastAPI サーバー
│   ├── models/
│   │   └── predictor.py         # 予測モデル
│   ├── data/
│   │   └── data_fetcher.py      # データ収集
│   ├── utils/
│   │   └── websocket_manager.py # WebSocket管理
│   └── requirements.txt         # Python依存関係
├── backend/                      # Node.js バックエンド（オプション）
│   ├── server.js                # Express サーバー
│   ├── routes/                  # APIルート
│   └── services/                # ビジネスロジック
├── shared/                       # 共有定義
│   └── types.ts                 # 共通型定義
├── package.json                 # フロントエンド依存関係
├── next.config.js               # Next.js設定
├── tailwind.config.js           # Tailwind CSS設定
└── README.md                    # このファイル
```

---

## 🚀 セットアップ手順

### 前提条件

- **Node.js** 18.0以上
- **Python** 3.9以上
- **npm** または **yarn**

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd hackason
```

### 2. フロントエンドのセットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.local.example .env.local
```

`.env.local`を編集：

```env
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:8001
```

### 3. ML サービスのセットアップ

```bash
cd ml-model

# Python仮想環境の作成（推奨）
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt

#### サンプルデータの設定

FastAPI 側は外部APIとのリアルタイム連携を廃止し、あらかじめ取得したサンプルデータを参照するアーキテクチャになりました。サーバー起動時にはローカルファイルに保存されたスナップショットを読み込み、欠損している地域だけを静的フォールバック( `ml-model/data/static/pollen/` )で補完します。必要に応じて以下の環境変数で参照ファイルやディレクトリを変更してください。

| 変数名                            | デフォルト値                                                          | 説明                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `REALTIME_USER_AGENT`             | `PollenStormAI/1.0 (+https://github.com/your-org/pollenstorm-ai)`     | 外部APIに送信する User-Agent を上書きします。                                                        |
| `REALTIME_REFERER`                | `https://www.jma.go.jp/bosai/amedas/`                                 | JMA アクセス時の Referer ヘッダーを指定します。                                                      |
| `AMEDAS_API_BASE`                 | `https://www.jma.go.jp/bosai/amedas/data/latest`                      | AMeDAS 観測データのベースURL。                                                                       |
| `AMEDAS_LATEST_TIME_URL`          | `https://www.jma.go.jp/bosai/amedas/data/latest_time.txt`             | 最新タイムスタンプ取得用 URL。                                                                       |
| `JMA_FORECAST_BASE`               | `https://www.jma.go.jp/bosai/forecast/data/forecast/{pref_code}.json` | 都道府県予報データのテンプレートURL（将来的な活用を想定）。                                          |
| `POLLEN_API_BASE`                 | なし                                                                  | 環境省 花粉観測データを利用したい場合に設定するテンプレートURL。                                     |
| `POLLEN_API_STATIC_DIR`           | `ml-model/data/static/pollen`                                         | リアルタイム取得に失敗した際に参照するローカルJSONのディレクトリ。                                   |
| `REALTIME_TRUST_ENV`              | `false`                                                               | `true` に設定すると `HTTP(S)_PROXY` などOSのプロキシ環境変数を利用して外部APIへ接続します。          |
| `POLLEN_FAILURE_COOLDOWN_SECONDS` | `300`                                                                 | 花粉APIへの接続失敗後、再試行までに待機する秒数。DNS等で落ちている場合に過剰なリトライを防止します。 |
| `REALTIME_SAMPLE_FILE`            | `ml-model/data/static/sample_regions.json`                            | 読み込みに使用するサンプルデータの保存先。任意のパスに変更可能。                                     |
| `POLLEN_API_STATIC_DIR`           | `ml-model/data/static/pollen`                                         | 地域ごとの単体サンプル(JSON)を格納するディレクトリ。スナップショット生成時の入力として利用します。   |

> 新しくサンプルを作成したい場合は、`python -m ml-model.data.generate_sample_data` を一度実行すると `REALTIME_SAMPLE_FILE` に統合JSONが出力されます。外部APIから収集したデータを別途保存したい場合は、既存の `ml-model/data/static/pollen/` にJSONを配置し、同コマンドで再生成してください。
```

### 4. バックエンドのセットアップ（オプション）

```bash
cd backend

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
```

---

## 🎮 実行方法

### ターミナル 1: ML サービスの起動

```bash
cd ml-model
source venv/bin/activate  # 仮想環境をアクティブ化
uvicorn main:app --reload --port 8001
```

サービスが起動します: `http://localhost:8001`

### ターミナル 2: フロントエンドの起動

```bash
npm run dev
```

アプリケーションが起動します: `http://localhost:3000`

### ターミナル 3: バックエンドの起動（オプション）

```bash
cd backend
npm run dev
```

バックエンドが起動します: `http://localhost:8000`

---

## 🧪 API エンドポイント

### ML Service (Port 8001)

#### `GET /data/current`
現在の花粉データを取得

```bash
curl http://localhost:8001/data/current
```

#### `GET /predict`
明日の花粉予測を取得

```bash
curl http://localhost:8001/predict
```

#### `GET /predict?region=tokyo`
特定地域の予測を取得

```bash
curl http://localhost:8001/predict?region=tokyo
```

#### `WebSocket /stream`
リアルタイムデータストリーム

```javascript
const ws = new WebSocket('ws://localhost:8001/stream');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};
```

#### `GET /model/info`
モデル情報を取得

```bash
curl http://localhost:8001/model/info
```

---

## 📊 データフォーマット

### PollenData

```json
{
  "region": "東京",
  "region_id": "tokyo",
  "prefecture": "東京都",
  "latitude": 35.6762,
  "longitude": 139.6503,
  "pollen_count": 45.2,
  "temperature": 18.5,
  "humidity": 65.0,
  "wind_speed": 3.5,
  "wind_direction": 180.0,
  "rainfall": 0.0,
  "timestamp": "2024-10-20T10:00:00Z"
}
```

### Prediction

```json
{
  "region": "東京",
  "pollen_today": 45.2,
  "pollen_predicted": 52.3,
  "confidence": 0.87,
  "wind_dir": 180.0,
  "wind_speed": 3.5,
  "temperature": 18.5,
  "humidity": 65.0,
  "risk_level": "high",
  "timestamp": "2024-10-20T10:00:00Z"
}
```

---

## 🧠 AIモデル

### 特徴量

1. **pollen_today** - 現在の花粉数
2. **temperature** - 気温（°C）
3. **humidity** - 湿度（%）
4. **wind_speed** - 風速（m/s）
5. **wind_direction** - 風向（度）
6. **rainfall** - 降水量（mm）
7. **day_of_year** - 年間通算日

### モデルアーキテクチャ

- **タイプ**: LSTM + 線形回帰アンサンブル
- **入力**: 7次元特徴ベクトル
- **出力**: 明日の花粉スコア (0-100)
- **精度**: ~87%（モックデータ）

### 予測ロジック

```python
prediction = (
    pollen_today * 0.7 +
    (temperature - 15) * 2 +
    -(humidity - 50) * 0.5 +
    -wind_speed * 1.5 +
    random_variation
)
```

---

## 🎨 デザインシステム

### カラーパレット

```css
--pollen-low: #4ade80       /* 緑 - 低い */
--pollen-moderate: #fbbf24  /* 黄 - 普通 */
--pollen-high: #fb923c      /* 橙 - 多い */
--pollen-very-high: #ef4444 /* 赤 - 非常に多い */
--bg-dark: #0a0e27          /* 背景 */
--bg-darker: #050810        /* 濃い背景 */
```

### フォント

- **メインフォント**: Noto Sans JP
- **ウェイト**: 400 (Regular), 500 (Medium), 700 (Bold)

---

## 🔧 カスタマイズ

### 実際のAPIへの接続

`ml-model/data/data_fetcher.py`の`fetch_from_api`メソッドを編集：

```python
async def fetch_from_api(self, url: str) -> Dict:
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=YOUR_HEADERS) as response:
            return await response.json()
```

### モデルの訓練

```bash
curl -X POST http://localhost:8001/train
```

または、独自のモデルをトレーニングして`models/pollen_model.pkl`として保存。

---

## 🧩 テクノロジースタック

### フロントエンド
- **React 18** - UIライブラリ
- **Next.js 14** - Reactフレームワーク
- **TypeScript** - 型安全性
- **Three.js** - 3Dレンダリング
- **@react-three/fiber** - React Three.jsラッパー
- **Leaflet** - 地図表示
- **Tailwind CSS** - スタイリング
- **Socket.io-client** - WebSocket接続

### バックエンド
- **FastAPI** - Python Webフレームワーク
- **uvicorn** - ASGIサーバー
- **WebSockets** - リアルタイム通信
- **aiohttp** - 非同期HTTP

### AI/ML
- **NumPy** - 数値計算
- **scikit-learn** - 機械学習
- **TensorFlow/Keras** - ディープラーニング（オプション）

---

## 📄 ライセンス

MIT License

---

## 🙏 謝辞

- 日本気象協会（JMA）- 気象データ
- ウェザーニュース - 花粉情報
- OpenStreetMap - 地図データ
