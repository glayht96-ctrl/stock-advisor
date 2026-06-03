"""Gemini API サービス — ストリーミング対応版"""
import os
import json
from typing import AsyncIterator

MODEL = "gemini-2.5-flash"


def _get_key() -> str:
    """毎回 .env を再読み込みしてサーバー再起動なしでキーを反映"""
    from dotenv import load_dotenv
    load_dotenv(override=True)
    return os.getenv("GEMINI_API_KEY", "")


def _has_key() -> bool:
    key = _get_key()
    return bool(key and not key.startswith("your-gemini"))


def _client():
    from google import genai
    return genai.Client(api_key=_get_key())


# ─── センチメント分析 ────────────────────────────────────────────────────────

async def analyze_news_sentiment(articles: list[dict]) -> dict:
    if not articles:
        return {"articles": [], "overall": "neutral", "summary": "ニュースなし"}

    if not _has_key():
        return {
            "articles": [{"url": a["url"], "sentiment": "neutral"} for a in articles],
            "overall": "neutral",
            "summary": "APIキー未設定（モック）",
        }

    articles_text = "\n".join(
        f"{i+1}. URL:{a['url']}\n   タイトル: {a['title']}\n   要約: {a.get('summary', '')}"
        + (f"\n   本文抜粋: {a['full_text'][:300]}" if a.get('full_text') else "")
        for i, a in enumerate(articles[:20])
    )
    prompt = f"""以下の株式関連ニュース記事のセンチメントを判定してください。

{articles_text}

JSON形式のみで返答（コードブロック不要）:
{{"articles": [{{"url": "...", "sentiment": "positive|negative|neutral"}}, ...], "overall": "positive|negative|neutral", "summary": "全体の市場ムードを日本語30文字以内で"}}

判定基準: positive=好材料, negative=悪材料, neutral=中立"""

    try:
        from google.genai import types
        response = await _client().aio.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=1000,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        raw = response.text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"[WARN] Gemini sentiment: {e}")
        return {
            "articles": [{"url": a["url"], "sentiment": "neutral"} for a in articles],
            "overall": "neutral",
            "summary": "分析エラー",
        }


# ─── 総合分析（ストリーミング） ──────────────────────────────────────────────

def _compute_scores(
    ind: dict, patterns: dict | None, news_articles: list[dict]
) -> tuple[int, int, int]:
    """テクニカル・モメンタム・センチメントスコア（0〜100）を計算"""
    # ── テクニカルスコア ──────────────────────────────────────────
    ts = 50
    rsi  = ind.get("rsi_14")
    hist = (ind.get("macd") or {}).get("histogram")
    bb   = ind.get("bollinger") or {}
    price = None  # will be filled by caller

    if rsi is not None:
        if rsi > 70: ts -= 12
        elif rsi < 30: ts += 12
        elif rsi > 60: ts += 6
        elif rsi < 40: ts -= 6
    if hist is not None:
        ts += 10 if hist > 0 else -10
    # SMAアライメント
    sma20, sma50, sma200 = ind.get("sma_20"), ind.get("sma_50"), ind.get("sma_200")
    # BB位置: price relative to bands
    bb_upper, bb_lower = bb.get("upper"), bb.get("lower")
    ts = max(0, min(100, ts))

    # ── モメンタムスコア ──────────────────────────────────────────
    ms = 50
    if patterns:
        r5  = patterns.get("return_5d")  or 0
        r20 = patterns.get("return_20d") or 0
        r60 = patterns.get("return_60d") or 0
        ms += min(15, max(-15, r5  * 2))
        ms += min(15, max(-15, r20 * 0.8))
        ms += min(10, max(-10, r60 * 0.3))
        if patterns.get("new_high_20d"): ms += 5
        if patterns.get("new_low_20d"):  ms -= 5
        if len(patterns.get("golden_crosses") or []) > len(patterns.get("dead_crosses") or []): ms += 8
        if patterns.get("volume_spikes"): ms += 3
    ms = max(0, min(100, int(ms)))

    # ── センチメントスコア ─────────────────────────────────────────
    ss = 50
    pos = sum(1 for a in news_articles if a.get("sentiment") == "positive")
    neg = sum(1 for a in news_articles if a.get("sentiment") == "negative")
    total_sent = pos + neg
    if total_sent > 0:
        ss += int((pos - neg) / total_sent * 25)
    ss = max(0, min(100, ss))

    return int(ts), int(ms), int(ss)


def _build_analysis_prompt(ticker: str, stock_data: dict, news_articles: list[dict]) -> str:
    ind      = stock_data.get("indicators", {}) or {}
    bb       = ind.get("bollinger") or {}
    macd_d   = ind.get("macd") or {}
    rsi      = ind.get("rsi_14")
    patterns = stock_data.get("price_patterns") or {}

    current = stock_data.get("current_price")
    w52h    = stock_data.get("week52_high")
    w52l    = stock_data.get("week52_low")
    pos52   = None
    if current and w52h and w52l and w52h != w52l:
        pos52 = round((current - w52l) / (w52h - w52l) * 100, 1)

    tech_score, mom_score, sent_score = _compute_scores(ind, patterns, news_articles)
    total_score = round(tech_score * 0.4 + mom_score * 0.35 + sent_score * 0.25)
    verdict = "強気" if total_score >= 60 else "弱気" if total_score <= 40 else "中立"

    news_block = "\n".join(
        f"・[{a.get('sentiment','?')}] {a['title']}" for a in news_articles[:12]
    ) or "なし"

    pat_block = ""
    if patterns:
        gc = patterns.get("golden_crosses") or []
        dc = patterns.get("dead_crosses") or []
        vs = patterns.get("volume_spikes") or []
        sq = patterns.get("bb_squeeze", False)
        bw = patterns.get("bb_bandwidth_pct")
        lines = []
        if gc: lines.append(f"GC: {', '.join(x['date']+' '+x['from_line']+'↑'+x['to_line'] for x in gc[-3:])}")
        if dc: lines.append(f"DC: {', '.join(x['date']+' '+x['from_line']+'↓'+x['to_line'] for x in dc[-3:])}")
        if vs: lines.append(f"出来高急増: {', '.join(x['date']+' ('+str(x['ratio'])+'倍)' for x in vs[-3:])}")
        if sq: lines.append(f"BBスクイーズ中 (bandwidth={bw}%)")
        pat_block = "\n".join(lines)

    return f"""あなたは経験豊富な株式テクニカルアナリストです。
以下のデータを元に「{stock_data.get('name', ticker)}（{ticker}）」を分析してください。

【基本情報】
現在値: {current} {stock_data.get('currency', 'USD')}  前日比: {stock_data.get('change_pct')}%
時価総額: {stock_data.get('market_cap')}
52週 高値:{w52h} / 安値:{w52l}{f' / レンジ内位置:{pos52}%' if pos52 is not None else ''}

【テクニカル指標】
RSI(14): {rsi}
MACD: {macd_d.get('macd')} / Signal: {macd_d.get('signal')} / Hist: {macd_d.get('histogram')}
SMA20: {ind.get('sma_20')} / SMA50: {ind.get('sma_50')} / SMA200: {ind.get('sma_200')}
EMA20: {ind.get('ema_20')}
ボリンジャーバンド: 上{bb.get('upper')} / 中{bb.get('middle')} / 下{bb.get('lower')}

【事前スコア（参考）】
テクニカルスコア: {tech_score}/100  モメンタムスコア: {mom_score}/100  センチメントスコア: {sent_score}/100
総合スコア（参考）: {total_score}/100 → 暫定「{verdict}」

【価格パターン（直近）】
5日: {patterns.get('return_5d','?')}% / 20日: {patterns.get('return_20d','?')}% / 60日: {patterns.get('return_60d','?')}%
20日高値更新: {patterns.get('new_high_20d','?')} / 20日安値更新: {patterns.get('new_low_20d','?')}
{pat_block}

【最新ニュース（センチメント付き）】
{news_block}

以下の4セクション形式で日本語で分析してください（投資助言なし・個人の情報整理目的）。
必ず「## 」で始まる見出しを4つ使い、各セクションを明確に分けること:

## テクニカル分析
SMA/EMAトレンド、RSI・MACDの解釈、ボリンジャーバンド位置、価格パターン（クロス・スクイーズ等）を説明

## ニュース動向
直近ニュースが示す材料の方向感と市場センチメント

## 総合スコア: {total_score}/100
上記データを踏まえた総合評価。**{verdict}** のラベルを文頭に明示。根拠を2〜3文で。

## 注目ポイント
特に目立つシグナルや今後注目すべき価格水準・条件を箇条書きで"""


async def get_stock_analysis_stream(
    ticker: str, stock_data: dict, news_articles: list[dict]
) -> AsyncIterator[str]:
    """ストリーミングで総合分析テキストを yield する"""
    if not _has_key():
        ind  = stock_data.get("indicators", {}) or {}
        rsi  = ind.get("rsi_14")
        hist = (ind.get("macd") or {}).get("histogram")
        rsi_label  = "買われすぎ" if rsi and rsi >= 70 else ("売られすぎ" if rsi and rsi <= 30 else "中立圏")
        macd_label = "強気" if hist and hist > 0 else "弱気"
        text = (
            f"【簡易分析（APIキー未設定）】\n\n"
            f"**モメンタム**: RSI={rsi:.1f} → {rsi_label}\n\n"
            f"**MACD**: ヒストグラム={hist:.2f} → {macd_label}シグナル\n\n"
            f"**移動平均**: SMA20={ind.get('sma_20')} / SMA50={ind.get('sma_50')}\n\n"
            f".env に GEMINI_API_KEY を設定すると Gemini AI による詳細分析が利用できます。"
        ) if rsi else "APIキー未設定。.env に GEMINI_API_KEY を設定してください。"
        yield text
        return

    from google.genai import types
    prompt = _build_analysis_prompt(ticker, stock_data, news_articles)

    try:
        async for chunk in await _client().aio.models.generate_content_stream(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=900,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        ):
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"\n\n分析エラー: {e}"


async def get_portfolio_analysis_stream(
    tickers: list[str], amounts: list[float], stocks: list[dict]
) -> AsyncIterator[str]:
    if not _has_key():
        yield "APIキーが未設定です。.env に GEMINI_API_KEY を設定してください。"
        return

    lines = []
    total_value = 0.0
    for ticker, amount, stock in zip(tickers, amounts, stocks):
        if "error" in stock:
            lines.append(f"- {ticker}: データ取得失敗")
            continue
        price = stock.get("current_price") or 0
        value = price * amount
        total_value += value
        ind = stock.get("indicators", {}) or {}
        change_pct = stock.get("change_pct")
        lines.append(
            f"- {stock.get('name', ticker)} ({ticker}): {amount}株, 現在値={price} {stock.get('currency','')}, "
            f"時価≈{value:,.0f}, 前日比={change_pct}%, RSI={ind.get('rsi_14')}, "
            f"SMA20={ind.get('sma_20')}, SMA50={ind.get('sma_50')}"
        )

    portfolio_text = "\n".join(lines)
    prompt = f"""あなたは経験豊富なポートフォリオアナリストです。
以下の保有銘柄を分析し、日本語でレポートしてください（個人の情報整理目的・投資助言は不要）。

【保有銘柄一覧】
{portfolio_text}

合計時価: 約{total_value:,.0f}円/ドル相当

以下の4点を詳しく分析してください:

1. **セクター分散**: 各銘柄の業種・セクターの偏りと分散度合い
2. **リスク集中**: 特定銘柄・セクターへの集中リスクと比率
3. **テクニカル状況**: 各銘柄のRSI・移動平均から見た現在のモメンタム
4. **全体の見立て**: ポートフォリオ全体のバランス評価と改善の観点（**良好** / **要注意** / **要改善** を明示）"""

    from google.genai import types
    try:
        async for chunk in await _client().aio.models.generate_content_stream(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=1500,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        ):
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"\n\n分析エラー: {e}"


async def get_screener_analysis_stream(
    conditions: list[dict], results: list[dict]
) -> AsyncIterator[str]:
    if not _has_key():
        yield (
            f"【簡易コメント（APIキー未設定）】\n"
            f"{len(results)} 銘柄がヒットしました。\n"
            ".env に GEMINI_API_KEY を設定するとAI解説が利用できます。"
        )
        return

    if not results:
        yield "条件に合致する銘柄がありませんでした。"
        return

    op_map = {"gt": ">", "lt": "<", "gte": "≥", "lte": "≤", "eq": "="}
    ind_map = {
        "rsi": "RSI", "macd_hist": "MACDヒスト", "price": "株価",
        "sma20": "SMA20", "sma50": "SMA50", "sma200": "SMA200",
        "price_vs_sma50": "株価-SMA50差",
    }
    cond_text = " AND ".join(
        f"{ind_map.get(c.get('indicator',''), c.get('indicator',''))} "
        f"{op_map.get(c.get('operator',''), c.get('operator',''))} "
        f"{c.get('value','')}"
        for c in conditions
    )
    results_text = "\n".join(
        f"- {r.get('ticker')} ({r.get('name','?')}): "
        f"セクター={r.get('sector','-')}, 市場={r.get('market','-')}, "
        f"RSI={r.get('rsi','-')}, MACDhist={r.get('macd_hist','-')}, "
        f"前日比={r.get('change_pct','-')}%"
        for r in results[:20]
    )

    prompt = f"""以下のテクニカル条件で日米100銘柄をスクリーニングした結果、{len(results)}銘柄がヒットしました。

【スクリーニング条件】: {cond_text}

【ヒット銘柄一覧】
{results_text}

この銘柄群を横断的に分析し、日本語で解説してください（投資助言なし・個人の情報整理目的）:

1. **共通テーマ**: ヒット銘柄に共通するセクター・業種・地域の傾向
2. **テクニカル背景**: なぜこの条件に合致する銘柄が多い/少ないか、市場全体の状況との関係
3. **注目ポイント**: 特に目立つ銘柄やパターン
4. **全体所感**: この結果から読み取れる現在の市場環境の示唆（**強気** / **弱気** / **中立** を明示）"""

    from google.genai import types
    try:
        async for chunk in await _client().aio.models.generate_content_stream(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=900,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        ):
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"\n\n解説エラー: {e}"


async def get_backtest_comment_stream(
    ticker: str, buy_date: str, sell_date: str, profit_loss_pct: float | None
) -> AsyncIterator[str]:
    if not _has_key():
        pct = f"{profit_loss_pct:+.2f}%" if profit_loss_pct is not None else "不明"
        yield (
            f"【簡易コメント（APIキー未設定）】\n"
            f"{ticker}: {buy_date}〜{sell_date} のパフォーマンス = {pct}\n"
            ".env に GEMINI_API_KEY を設定するとAI振り返りコメントが利用できます。"
        )
        return

    pct_str = f"{profit_loss_pct:+.2f}%" if profit_loss_pct is not None else "不明"
    prompt = f"""株式 {ticker} を {buy_date} に購入し {sell_date} に売却した場合のパフォーマンスは {pct_str} でした。

この期間（{buy_date} 〜 {sell_date}）の相場環境とこの銘柄のパフォーマンスの背景を日本語で分析してください（投資助言なし・個人の情報整理目的）:

1. **マクロ環境**: 当該期間の主要な経済イベント・金利動向・地政学リスク
2. **セクター動向**: {ticker} が属するセクターのトレンド
3. **銘柄固有の要因**: 決算・製品・経営ニュースなど主要な出来事
4. **振り返り**: {pct_str} というパフォーマンスをどう評価するか"""

    from google.genai import types
    try:
        async for chunk in await _client().aio.models.generate_content_stream(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=800,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        ):
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"\n\nコメントエラー: {e}"


async def get_discover_comment_stream(results: list[dict]) -> AsyncIterator[str]:
    """本日の注目銘柄リストをもとに市場動向を事実ベースで解説（ストリーミング）"""
    if not _has_key():
        if not results:
            yield "APIキー未設定。注目銘柄データがありません。"
            return
        lines = [
            f"{r['ticker']}({r.get('name','?')}): "
            f"{r.get('change_pct', 0):+.1f}%  シグナル=[{', '.join(r.get('signals') or ['なし'])}]"
            for r in results[:5]
        ]
        yield (
            "【本日の注目銘柄 簡易コメント（APIキー未設定）】\n\n"
            + "\n".join(lines)
            + "\n\n.env に GEMINI_API_KEY を設定するとAI解説が利用できます。"
        )
        return

    if not results:
        yield "本日はスコアの高い注目銘柄が見つかりませんでした。"
        return

    def _vol(r: dict) -> str:
        v, av = r.get("volume") or 0, r.get("avg_volume") or 0
        return f"{v/av:.1f}倍" if av > 0 and v > 0 else "-"

    stocks_text = "\n".join(
        f"- {r.get('ticker')} ({r.get('name', '?')}): "
        f"セクター={r.get('sector', '-')}, 市場={r.get('market', '-')}, "
        f"前日比={r.get('change_pct', 0):+.1f}%, "
        f"RSI={r.get('rsi') or '-'}, 出来高比={_vol(r)}, "
        f"シグナル=[{', '.join(r.get('signals') or ['なし'])}]"
        for r in results[:15]
    )

    prompt = f"""本日のスコアリングで抽出された注目銘柄リスト（スコア上位15銘柄）です。

{stocks_text}

以下の観点で日本語で解説してください（投資助言なし・個人の情報整理目的）:

1. **動いている銘柄のテーマ**: 本日動いている銘柄に共通する業種・テーマ・地域の傾向
2. **テクニカル面の背景**: 出来高急増・RSI異常値・SMAクロス・MACD転換が出ている背景として考えられる市場環境
3. **特に目立つ銘柄**: 数値や複数シグナルの観点で特徴的な銘柄を2〜3例挙げてその理由を説明
4. **全体の市場感**: 本日の日米株市場全体の動向（**強気** / **弱気** / **中立** を明示）

※「上がる」「下がる」などの断定的予測は含めず、事実データの整理に徹すること。"""

    from google.genai import types
    try:
        async for chunk in await _client().aio.models.generate_content_stream(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=900,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        ):
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"\n\n解説エラー: {e}"


async def get_stock_analysis(ticker: str, stock_data: dict, news_articles: list[dict]) -> str:
    """非ストリーミング版（後方互換）"""
    chunks: list[str] = []
    async for chunk in get_stock_analysis_stream(ticker, stock_data, news_articles):
        chunks.append(chunk)
    return "".join(chunks)


# ─── 銘柄 Q&A（ストリーミング・会話履歴対応） ────────────────────────────────

async def answer_question(
    ticker: str,
    question: str,
    history: list[dict] | None = None,
) -> AsyncIterator[str]:
    context = f"銘柄: {ticker}"
    try:
        from app.services.stock_service import get_stock_data
        stock = get_stock_data(ticker, period="3mo")
        ind = stock.indicators
        context = (
            f"銘柄: {stock.name}（{ticker}）\n"
            f"現在値: {stock.current_price} {stock.currency}  前日比: {stock.change_pct}%\n"
            f"RSI(14): {ind.rsi_14}  MACD hist: {ind.macd.histogram}\n"
            f"SMA20: {ind.sma_20}  SMA50: {ind.sma_50}  SMA200: {ind.sma_200}\n"
            f"EMA20: {ind.ema_20}\n"
            f"ボリンジャー 上:{ind.bollinger.upper} 中:{ind.bollinger.middle} 下:{ind.bollinger.lower}"
        )
    except Exception:
        pass

    if not _has_key():
        yield _rule_based_answer(question, context)
        return

    from google.genai import types

    system_instruction = (
        "あなたは株式分析アシスタントです。"
        "投資助言は行わず、データに基づく客観的な情報のみ提供してください。"
        "回答は日本語で簡潔に（200字程度）。\n\n"
        f"【現在のリアルタイムデータ】\n{context}"
    )

    # Gemini は role: "user" / "model"（"assistant" は使わない）
    contents = []
    for msg in (history or []):
        role = "model" if msg["role"] == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})
    contents.append({"role": "user", "parts": [{"text": question}]})

    try:
        async for chunk in await _client().aio.models.generate_content_stream(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                max_output_tokens=600,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        ):
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"回答エラー: {e}"


def _rule_based_answer(question: str, context: str) -> str:
    q = question.lower()
    lines = context.split("\n")

    def extract(label: str) -> str:
        for line in lines:
            if label in line:
                return line.split(":", 1)[-1].strip() if ":" in line else line
        return "不明"

    if "rsi" in q:
        try:
            rsi = float(extract("RSI(14)").split()[0])
            if rsi >= 70:
                return f"RSIは{rsi:.1f}で買われすぎ圏（70以上）です。過熱感があり反落に注意。"
            elif rsi <= 30:
                return f"RSIは{rsi:.1f}で売られすぎ圏（30以下）です。反発の可能性に注目。"
            return f"RSIは{rsi:.1f}で中立圏（30〜70）です。特段のシグナルは出ていません。"
        except Exception:
            return f"RSIデータ: {extract('RSI(14)')}"

    if "macd" in q:
        try:
            hist = float(extract("MACD hist").split()[0])
            label = "ヒストグラムがプラス（強気）" if hist > 0 else "ヒストグラムがマイナス（弱気）"
            return f"MACDは{label}です（hist: {hist:.2f}）。APIキーを設定するとより詳細な分析が可能です。"
        except Exception:
            return f"MACDデータ: {extract('MACD hist')}"

    if any(k in q for k in ["sma", "移動平均", "トレンド"]):
        return (
            f"移動平均: SMA20={extract('SMA20').split()[0]} / "
            f"SMA50={extract('SMA50').split()[0]} / SMA200={extract('SMA200').split()[0]}\n"
            "GEMINI_API_KEYを設定するとトレンド分析を詳しく説明できます。"
        )

    if any(k in q for k in ["割安", "割高", "バリュー", "per", "pbr"]):
        return "割安・割高の判断にはPER/PBRなどのバリュエーション指標が必要です。GEMINI_API_KEYを設定するとAIが総合判断します。"

    return f"【簡易回答（APIキー未設定）】\n現在のデータ:\n{context}\n\nGEMINI_API_KEYを.envに設定するとより詳しい分析ができます。"
