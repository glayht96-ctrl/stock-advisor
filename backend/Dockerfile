FROM python:3.12-slim

WORKDIR /app

# 依存パッケージインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリコピー
COPY app/ ./app/

# ポート
EXPOSE 8000

# 起動（本番用：reload不要、workers=1でメモリ節約）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
