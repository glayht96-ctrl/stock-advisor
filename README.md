# 📈 Stock Advisor

個人用株式分析ダッシュボード（日本株 + 米国株）

## 機能一覧

### 株価・チャート
- 折れ線チャート / ローソク足チャート（切り替え可）
- 出来高バーチャート（上昇・下落で色分け）
- 期間選択: 1ヶ月 / 3ヶ月 / 6ヶ月 / 1年 / 2年
- SMA20・SMA50・SMA200・EMA20オーバーレイ（個別トグル）

### バックテスト
- 購入日・売却日・投資金額を指定してシミュレーション
- 損益額・損益率・年率換算リターンをカード表示
- Gemini AIによる相場背景の振り返りコメント（ストリーミング）

### 銘柄スクリーナー
- 日米100銘柄対象（米国50 + 日本50）
- RSI・MACD・SMA・株価でフィルタリング（条件追加/削除可）
- プリセット: 売られすぎ / 強気転換 / 上昇トレンド / 買われすぎ
- 結果テーブルにセクター情報・市場フィルター（全銘柄/US/JP）タブ
- 16並列処理で高速スクリーニング

### ポートフォリオ分析
- 複数銘柄の保有数量を入力してAI一括分析
- セクター分散・リスク集中・テクニカル状況・全体見立て

### ニュース & センチメント
- 複数RSSを非同期並列取得（Yahoo!ファイナンス・Google News・日経・Reuters）
- 記事本文取得でセンチメント精度向上（BeautifulSoup4）
- Gemini センチメント分析（positive / negative / neutral）

### AI機能（GEMINI_API_KEY 設定時にフル機能）
- AI総合分析：テクニカル＋ニュースをGemini 2.5 Flashで分析（ストリーミング）
- 銘柄Q&A：チャット形式で質問
- バックテストコメント・ポートフォリオ一括分析
- APIキー未設定時はルールベース簡易回答

### RSIアラート
- 銘柄・指標（RSI/株価）・閾値・方向を設定
- 30秒ごとにバックグラウンドポーリング → ブラウザ通知（Notification API）
- 発火履歴（最大50件）をlocalStorageに保存、未読バッジ付き履歴タブ

### PDF出力
- 分析画面（チャート・テクニカル指標・AI分析テキスト）をPDF出力
- jsPDF + html2canvas 使用（遅延ロードで通常表示に影響なし）

### その他
- ウォッチリスト（localStorage永続化）・検索履歴
- 銘柄比較テーブル（最大6銘柄）
- 主要指数ショートカット（日経/S&P500/NASDAQ）
- インメモリキャッシュ（株価5分・ニュース3分・銘柄info1時間）
- スマホ・PC両対応

---

## ローカル開発

### バックエンド

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# .env を編集: GEMINI_API_KEY=your-key  （AI機能を使う場合のみ必須）

uvicorn app.main:app --reload --port 8000
```

動作確認:
```bash
curl http://localhost:8000/health
curl "http://localhost:8000/stock/AAPL?period=3mo"
curl "http://localhost:8000/backtest/AAPL?buy_date=2024-01-01&amount=10000"
curl -X POST http://localhost:8000/screen/ \
  -H "Content-Type: application/json" \
  -d '{"conditions":[{"indicator":"rsi","operator":"lte","value":30}]}'
```

### フロントエンド

```bash
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

---

## APIエンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/stock/{ticker}` | 株価・テクニカル指標（SMA/EMA/BB/MACD含む） |
| GET | `/stock/{ticker}/analysis/stream` | Gemini総合分析（SSEストリーミング） |
| GET | `/news/{ticker}` | ニュース一覧（本文取得・センチメント） |
| POST | `/ask/stream` | 銘柄Q&A（SSEストリーミング） |
| GET | `/compare/` | 複数銘柄比較 |
| GET | `/backtest/{ticker}` | バックテスト計算 |
| GET | `/backtest/{ticker}/comment` | バックテストAIコメント（SSEストリーミング） |
| POST | `/screen/` | 銘柄スクリーニング（日米100銘柄） |
| POST | `/portfolio/analyze` | ポートフォリオ一括分析（SSEストリーミング） |
| GET | `/health` | ヘルスチェック＋キャッシュ統計 |
| GET | `/config` | APIキー状態確認 |
| DELETE | `/cache` | キャッシュクリア |
| GET | `/docs` | Swagger UI |

---

## デプロイ

### 前提

| 必要なもの | 入手先 |
|---|---|
| GitHubアカウント | https://github.com |
| Renderアカウント | https://render.com |
| Vercelアカウント | https://vercel.com |
| Gemini APIキー | https://aistudio.google.com/apikey |

---

### バックエンド — Render（Docker）

#### 1. GitHubリポジトリの準備

```bash
git init
git add .
git commit -m "Initial commit"
# GitHubでリポジトリを作成後:
git remote add origin https://github.com/<your-user>/stock-advisor.git
git push -u origin main
```

#### 2. Renderでサービス作成

1. https://dashboard.render.com にアクセスしてログイン
2. **「New +」→「Web Service」** をクリック
3. 「Build and deploy from a Git repository」を選択
4. GitHubリポジトリを接続（初回はGitHub認証が必要）
5. リポジトリを選択して **「Connect」**

#### 3. 基本設定

| 項目 | 値 |
|---|---|
| Name | `stock-advisor-api`（任意） |
| Region | `Singapore` または `Oregon` |
| Branch | `main` |
| Runtime | **Docker** |
| Dockerfile Path | `./backend/Dockerfile` |
| Instance Type | `Free`（無料枠） |

#### 4. 環境変数の設定

「Environment」セクションで以下を追加:

| キー | 値 | 備考 |
|---|---|---|
| `GEMINI_API_KEY` | `AIza...` | **必須** — AIistudio から取得 |

> ⚠️ 無料プランはスリープあり（15分アイドルで停止）。最初のリクエストは30秒ほどかかる場合があります。

#### 5. デプロイ

「Create Web Service」をクリックしてデプロイ開始。
ビルドログを確認し、`Listening on 0.0.0.0:8000` が表示されれば成功。

デプロイ後のURL例: `https://stock-advisor-api.onrender.com`

#### Dockerビルドのローカル確認

Dockerがインストールされていれば以下で事前確認できます:

```bash
# リポジトリルートから実行
docker build -t stock-advisor-api ./backend
docker run -p 8000:8000 -e GEMINI_API_KEY=your-key stock-advisor-api

# 動作確認
curl http://localhost:8000/health
```

---

### フロントエンド — Vercel

#### 1. 本番用API URLの設定

`frontend/.env.production` を編集:
```bash
# RenderのデプロイURLに変更
VITE_API_BASE_URL=https://stock-advisor-api.onrender.com
```

`backend/app/main.py` のCORSにVercelのURLを追加（すでに追加済み）:
```python
allow_origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "https://stock-advisor-frontend.vercel.app",  # ← 実際のVercel URLに変更
],
```

#### 2. ビルド確認

```bash
cd frontend
npm install
npm run build    # エラーなく完了することを確認
```

#### 3. Vercelでのデプロイ

1. https://vercel.com にアクセスしてログイン
2. **「Add New → Project」** をクリック
3. GitHubリポジトリを選択して **「Import」**
4. 以下の設定を変更:

| 項目 | 値 |
|---|---|
| Framework Preset | **Vite** |
| Root Directory | **`frontend`** |
| Build Command | `npm run build` |
| Output Directory | `dist` |

5. 「Environment Variables」で以下を追加:

| キー | 値 |
|---|---|
| `VITE_API_BASE_URL` | `https://stock-advisor-api.onrender.com` |

6. **「Deploy」** をクリック

デプロイ後のURL例: `https://stock-advisor-frontend.vercel.app`

#### 4. CORS URLの更新とバックエンド再デプロイ

Vercelのデプロイが完了したら実際のURLが確定します。
`backend/app/main.py` の `allow_origins` を実際のURLに更新し、Renderに再デプロイ:

```bash
git add backend/app/main.py
git commit -m "update CORS for production"
git push
```

Renderは自動的に再デプロイします（Auto Deploy が有効の場合）。

---

### デプロイ後の動作確認

```bash
# バックエンドのヘルスチェック
curl https://stock-advisor-api.onrender.com/health

# AAPL株価取得
curl https://stock-advisor-api.onrender.com/stock/AAPL

# バックテスト
curl "https://stock-advisor-api.onrender.com/backtest/AAPL?buy_date=2024-01-01&amount=10000"

# スクリーニング（売られすぎ）
curl -X POST https://stock-advisor-api.onrender.com/screen/ \
  -H "Content-Type: application/json" \
  -d '{"conditions":[{"indicator":"rsi","operator":"lte","value":30}]}'

# フロントエンド動作確認
# ブラウザで https://stock-advisor-frontend.vercel.app にアクセス
```

---

## ディレクトリ構成

```
stock-advisor/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/    stock / news / ask / compare / portfolio / backtest / screen
│   │   ├── services/   stock_service / news_service / claude_service / cache
│   │   └── models/     schemas
│   ├── Dockerfile
│   ├── render.yaml
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/ SummaryCard / StockChart / SubChart /
    │   │               TechnicalPanel / AnalysisPanel / QAChat /
    │   │               NewsPanel / SearchBar / ComparePanel /
    │   │               AlertPanel / BacktestPanel / ReportButton
    │   ├── pages/      Home / Analysis / Portfolio / Screener
    │   ├── hooks/      useStock / useNews / useWatchlist /
    │   │               useSearchHistory / useConfig / useAlerts
    │   ├── types/      index.ts
    │   └── lib/        api.ts
    ├── .env.production
    └── vercel.json
```

> ⚠️ 本ツールは個人利用専用。投資は自己責任で。
