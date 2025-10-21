# 🚀 PollenStorm AI - クイックスタートガイド

このガイドに従って、5分でPollenStorm AIを起動できます。

## 📋 前提条件の確認

```bash
# Node.jsのバージョン確認（18.0以上が必要）
node --version

# Pythonのバージョン確認（3.9以上が必要）
python3 --version

# npmのバージョン確認
npm --version
```

## 🎯 最速セットアップ（推奨）

### ステップ1: 初回セットアップ

```bash
# セットアップスクリプトを実行（初回のみ）
chmod +x setup.sh
./setup.sh
```

これで以下がインストールされます：
- フロントエンド依存関係（Next.js, React, Three.js等）
- Python仮想環境と最小限の依存関係
- 必要な設定ファイル

### ステップ2: サービス起動

**ターミナル1 - MLサービス:**
```bash
cd ml-model
source venv/bin/activate
uvicorn main:app --reload --port 8001
```

**ターミナル2 - フロントエンド:**
```bash
npm run dev
```

### アクセス
- 🎨 フロントエンド: http://localhost:3000
- 🔮 MLサービス: http://localhost:8001
- 📚 API Docs: http://localhost:8001/docs

## 🔧 手動セットアップ（トラブル時）

### フロントエンド

```bash
# 1. node_modulesをクリーン
rm -rf node_modules package-lock.json

# 2. 依存関係をインストール
npm install --legacy-peer-deps

# 3. 環境変数を設定（既にあればスキップ）
cp .env.local.example .env.local

# 4. 開発サーバーを起動
npm run dev
```

→ http://localhost:3000 でアクセス

### MLサービス

```bash
# 1. ml-modelディレクトリへ移動
cd ml-model

# 2. Python仮想環境を作成（既にあればスキップ）
python3 -m venv venv

# 3. 仮想環境をアクティブ化
source venv/bin/activate  # macOS/Linux
# または
venv\Scripts\activate     # Windows

# 4. 依存関係をインストール
pip install -r requirements.txt

# 5. サーバーを起動
uvicorn main:app --reload --port 8001
```

→ http://localhost:8001 でアクセス
→ http://localhost:8001/docs でAPI ドキュメント

## ✅ 動作確認

### 1. ブラウザで確認

http://localhost:3000 を開く

以下が表示されればOK：
- ✅ ヘッダーに「接続中」の緑色インジケーター
- ✅ 3Dパーティクルまたはマップビュー
- ✅ 地域選択ドロップダウン
- ✅ 統計パネル（右下）

### 2. APIの動作確認

```bash
# 現在の花粉データを取得
curl http://localhost:8001/data/current

# 予測を取得
curl http://localhost:8001/predict

# モデル情報を取得
curl http://localhost:8001/model/info
```

### 3. WebSocketの確認

ブラウザのコンソールで：
```javascript
const ws = new WebSocket('ws://localhost:8001/stream');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

## 🎮 使い方

### 基本操作

1. **地域選択**
   - 左上のドロップダウンから地域を選択
   - 詳細情報が表示されます

2. **表示モード切替**
   - 「3D パーティクル」: Three.jsによる動的可視化
   - 「マップ」: 日本地図上の分布表示

3. **時間選択**
   - 「今日」: 現在のデータ
   - 「明日」: AI予測

4. **3Dビュー操作**
   - ドラッグ: 視点回転
   - スクロール: ズーム
   - パーティクルの色: 花粉レベル

5. **マップビュー操作**
   - マーカークリック: 地域詳細を表示
   - 色: 花粉レベル（緑→黄→橙→赤）

## 🐛 トラブルシューティング

### エラー: `npm install`がフリーズする

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps --no-audit
```

### エラー: `Cannot find module 'next'`

```bash
npm install --legacy-peer-deps
```

### エラー: `ModuleNotFoundError: No module named 'fastapi'`

```bash
cd ml-model
source venv/bin/activate
pip install fastapi uvicorn pydantic
```

### エラー: `uvicorn: command not found`

```bash
# 仮想環境が正しくアクティブ化されているか確認
cd ml-model
source venv/bin/activate
which python  # venv内のpythonを指しているはず

# uvicornを再インストール
pip install uvicorn
```

### ポート3000が使用中

```bash
# 別のポートで起動
npm run dev -- -p 3001
```

### ポート8001が使用中

```bash
# 使用中のプロセスを確認
lsof -i :8001

# または別のポートで起動
uvicorn main:app --reload --port 8002
```

### WebSocketが接続できない

1. MLサービスが起動しているか確認
2. ファイアウォールの設定を確認
3. `.env.local`のURLを確認

### パーティクルが表示されない

1. ブラウザのコンソールでエラーを確認
2. WebGLがサポートされているか確認
3. ブラウザをハードリロード（Cmd+Shift+R / Ctrl+Shift+R）

## 📦 モックデータの生成

テスト用のモックデータを生成：

```bash
cd ml-model
python generate_mock_data.py
```

生成されるファイル：
- `historical_data.json` - 365日分の履歴データ
- `sample_payloads.json` - APIレスポンスのサンプル

## 🔄 開発中のリロード

### フロントエンド
- ファイルを保存すると自動的にリロード（Hot Reload）

### MLサービス
- ファイルを保存すると自動的に再起動（`--reload`オプション）

### 手動再起動

```bash
# 全サービスを停止: Ctrl+C

# 再起動
./start-dev.sh
```

## 📊 APIドキュメント

MLサービスのインタラクティブなAPIドキュメント：
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## 🎨 カスタマイズ

### 地域を追加

`ml-model/data/data_fetcher.py`の`REGIONS`配列に追加：

```python
{"id": "your_region", "name": "地域名", "prefecture": "都道府県", "lat": 緯度, "lng": 経度}
```

### カラーテーマ変更

`src/app/globals.css`の`:root`変数を編集

### 予測モデルの調整

`ml-model/models/predictor.py`の`_create_mock_model`メソッドを編集

## 🚀 次のステップ

1. **実際のAPIと接続**
   - `data_fetcher.py`のAPIエンドポイントを実装
   - 気象庁や環境省のAPIキーを取得

2. **モデルのトレーニング**
   - 実データを収集
   - `predictor.py`で実際のLSTMモデルを実装

3. **デプロイ**
   - フロントエンド: Vercel
   - バックエンド: Render/Railway
   - README.mdの「デプロイ」セクションを参照

## 💡 ヒント

- 開発中は両方のターミナルを開いたままにする
- エラーログは各ターミナルに表示される
- APIの動作確認には`curl`やPostmanを使用
- ブラウザの開発者ツールでWebSocketメッセージを確認

## 📞 サポート

問題が発生した場合：
1. このガイドのトラブルシューティングを確認
2. README.mdの詳細ドキュメントを参照
3. GitHub Issuesで質問

**🌸 楽しい開発を！**
