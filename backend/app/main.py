from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import stock, news, ask, compare, portfolio, backtest, screen, ws

load_dotenv()

app = FastAPI(
    title="Stock Advisor API",
    description="個人用株式分析ダッシュボード（日本株 + 米国株）",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://stock-advisor-frontend.vercel.app",
        "https://stock-advisor-beige.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stock.router,     prefix="/stock",     tags=["stock"])
app.include_router(news.router,      prefix="/news",      tags=["news"])
app.include_router(ask.router,       prefix="/ask",       tags=["ask"])
app.include_router(compare.router,   prefix="/compare",   tags=["compare"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
app.include_router(backtest.router,  prefix="/backtest",  tags=["backtest"])
app.include_router(screen.router,    prefix="/screen",    tags=["screen"])
app.include_router(ws.router,        prefix="/ws",        tags=["ws"])


@app.get("/health")
def health():
    from app.services.cache import stats
    return {"status": "ok", "version": "1.2.0", "cache": stats()}


@app.get("/config")
def get_config():
    from app.services.claude_service import _has_key
    return {"claude_enabled": _has_key()}


@app.delete("/cache")
def clear_cache():
    from app.services.cache import clear_all
    return {"cleared": clear_all()}
