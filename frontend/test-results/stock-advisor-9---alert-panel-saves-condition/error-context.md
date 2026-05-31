# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock-advisor.spec.ts >> 9 - alert panel saves condition
- Location: e2e\stock-advisor.spec.ts:194:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=≤ 25').or(locator('text=≥ 25'))
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=≤ 25').or(locator('text=≥ 25'))

```

```yaml
- banner:
  - button "← 戻る"
  - text: Apple Inc. (AAPL) $312.06 ▲0.07% LIVE
  - button "PDF出力"
  - button "☆ ウォッチ"
- main:
  - 'textbox "銘柄コード 例: 7203.T AAPL"':
    - /placeholder: "銘柄コード　例: 7203.T　AAPL"
    - text: AAPL
  - button "×"
  - button "分析"
  - button "トヨタ 7203.T"
  - button "ソフトバンクG 9984.T"
  - button "Apple AAPL"
  - button "NVIDIA NVDA"
  - button "Sony 6758.T"
  - button "Tesla TSLA"
  - paragraph: 現在値
  - paragraph: $312.06
  - paragraph: ▲ 0.22(+0.07%)
  - paragraph: 時価総額
  - paragraph: $4583.3B
  - paragraph: 出来高
  - paragraph: 6998.3万(+58%vs平均)
  - paragraph: 52週高値
  - paragraph: $315
  - paragraph: 52週安値
  - paragraph: $195
  - text: 52週安値 52週高値 195.07 現在位置 98% 315
  - heading "株価チャート" [level=2]
  - button "折れ線"
  - button "ローソク"
  - button "SMA20"
  - button "SMA50"
  - button "SMA200"
  - button "EMA20"
  - button "1ヶ月"
  - button "3ヶ月"
  - button "6ヶ月"
  - button "1年"
  - button "2年"
  - img: 5/30 6/11 6/24 7/3 7/15 7/25 8/5 8/14 8/26 9/5 9/16 9/26 10/8 10/21 11/3 11/14 11/28 12/11 12/24 1/7 1/16 1/29 2/9 2/19 3/2 3/11 3/23 4/1 4/13 4/23 5/4 5/13 5/29 $175 $210 $245 $280 $315
  - text: SMA20 SMA50
  - paragraph: 出来高
  - img
  - heading "サブチャート" [level=2]
  - button "RSI"
  - button "MACD"
  - img: 5/30 6/11 6/24 7/3 7/15 7/25 8/5 8/14 8/26 9/5 9/16 9/26 10/8 10/20 10/31 11/13 11/26 12/9 12/19 1/2 1/13 1/26 2/4 2/13 2/26 3/9 3/18 3/30 4/9 4/20 4/30 5/12 5/29 0 25 50 75 100
  - text: ─ 70 買われすぎ ─ 30 売られすぎ
  - heading "テクニカル指標" [level=2]
  - paragraph: RSI (14)
  - paragraph: "79"
  - paragraph: 買われすぎ
  - paragraph: 70↑過熱 / 30↓売られすぎ
  - paragraph: MACD
  - paragraph: "+0.62"
  - paragraph: 強気
  - paragraph: "MACD: 10.45 / Signal: 9.84"
  - paragraph: ボリンジャーバンド
  - paragraph: バンド内
  - paragraph: "上限: $318"
  - paragraph: "中央: $297"
  - paragraph: "下限: $277"
  - paragraph: 移動平均
  - paragraph: SMA 20
  - paragraph: $297
  - paragraph: ↑上回る
  - paragraph: SMA 50
  - paragraph: $275
  - paragraph: ↑上回る
  - paragraph: SMA 200
  - paragraph: $263
  - paragraph: ↑上回る
  - paragraph: EMA 20
  - paragraph: $298
  - paragraph: ↑上回る
  - button "アラート設定"
  - button "履歴 1"
  - 'textbox "銘柄 (例: AAPL)"': AAPL
  - combobox:
    - option "RSI" [selected]
    - option "株価"
  - combobox:
    - option "以上 (≥)" [selected]
    - option "以下 (≤)"
  - spinbutton: "70"
  - button "追加"
  - text: AAPL RSI ≥ 70
  - button "×"
  - paragraph: ブラウザ通知が拒否されています。ブラウザの設定から通知を許可してください。
  - heading "バックテスト" [level=2]
  - text: 購入日
  - textbox: 2024-01-01
  - text: 売却日
  - textbox: 2026-05-31
  - text: 投資金額 ($)
  - spinbutton: "25"
  - button "計算"
  - heading "🤖 AI 総合分析" [level=2]
  - text: Claude 有効
  - button "分析する"
  - paragraph: 「分析する」を押すと Gemini がテクニカル指標・ニュースをリアルタイムで総合分析します
  - heading "💬 銘柄Q&A" [level=2]
  - text: Claude 有効
  - button "RSIは今どう見る？"
  - button "MACDのシグナルは？"
  - button "移動平均との位置関係は？"
  - button "ボリンジャーバンドは？"
  - button "直近の注目ポイントは？"
  - textbox "AAPLについて質問する..."
  - button "送信" [disabled]
  - heading "関連ニュース (20件)" [level=2]
  - button "🤖 センチメント分析"
  - 'link "📰 Apple Stock: We Don''t Need No Engineering, We Don''t Need No Fold-A-Phone (NASDAQ:AAPL) - Seeking Alpha Apple Stock: We Don''t Need No Engineering, We Don''t Need No Fold-A-Phone (NASDAQ:AAPL)&nbsp;&nbsp;Seeking Alpha Google News (EN) · 4時間前 EN"':
    - /url: https://news.google.com/rss/articles/CBMipgFBVV95cUxNZTZJdkxySVdlNUVlM3U1elZXMjhsd0ZvdzdZQi1laUxWalAwWkE4Y3lOUFk5RTF2TzAwZnNrM05nRHBNOGk5VjFlSzltd0FzdllLYUhHV0ZhbDVBdWptcTAya0tSWUpvSnVtQmRlVWc2OWQzVFh0S2J2anJHT3VFOVFTbWdFT3A5QnJ6bFVrNnRBdU84WTJya3FtcmxoSk41TGgteXRR?oc=5
    - text: 📰
    - paragraph: "Apple Stock: We Don't Need No Engineering, We Don't Need No Fold-A-Phone (NASDAQ:AAPL) - Seeking Alpha"
    - paragraph: "Apple Stock: We Don't Need No Engineering, We Don't Need No Fold-A-Phone (NASDAQ:AAPL)&nbsp;&nbsp;Seeking Alpha"
    - text: Google News (EN) · 4時間前 EN
  - link "📰 AAPL Stock Quote Price and Forecast - CNN AAPL Stock Quote Price and Forecast&nbsp;&nbsp;CNN Google News (EN) · 5時間前 EN":
    - /url: https://news.google.com/rss/articles/CBMiUEFVX3lxTE00U3JoRzhkckt5aVFxb1NVNnBndWhrcDM5N0NqUzZGUk8xQk04OF9jVWRULXh2RmlJaGpTS1FJWEREaUlNUnhfSHk2cm53NllX?oc=5
    - text: 📰
    - paragraph: AAPL Stock Quote Price and Forecast - CNN
    - paragraph: AAPL Stock Quote Price and Forecast&nbsp;&nbsp;CNN
    - text: Google News (EN) · 5時間前 EN
  - 'link "📰 Apple Inc. (AAPL): Renaissance Technologies Opens New Position - Yahoo Finance Apple Inc. (AAPL): Renaissance Technologies Opens New Position&nbsp;&nbsp;Yahoo Finance Google News (EN) · 23時間前 EN"':
    - /url: https://news.google.com/rss/articles/CBMipwFBVV95cUxPSFhaNjZVUWpJNW5VSS1WXzlBWThmNzc5UFF3RzNYb0hOUWN4MkpGOFdpWnNBTVdpQ3pZRHZSeFlVbkF6d3ByWVRPQTJHMjJpNFA2WFhXeTNodmpteldyUVZaTTRXUnBuNDBtLVYzeVo4QTItazN3VHNpSGdHSG5rclJyQ2pKRzBFVnluUzhKWmotMmtTMjc2U1VpNVN4bkR2YjBCYklNYw?oc=5
    - text: 📰
    - paragraph: "Apple Inc. (AAPL): Renaissance Technologies Opens New Position - Yahoo Finance"
    - paragraph: "Apple Inc. (AAPL): Renaissance Technologies Opens New Position&nbsp;&nbsp;Yahoo Finance"
    - text: Google News (EN) · 23時間前 EN
  - link "📰 Interchange Capital Partners LLC Grows Stock Position in Apple Inc. $AAPL - MarketBeat Interchange Capital Partners LLC Grows Stock Position in Apple Inc. $AAPL&nbsp;&nbsp;MarketBeat Google News (EN) · 1日前 EN":
    - /url: https://news.google.com/rss/articles/CBMizAFBVV95cUxPbDJnMkM2YUtVWWVkc1JCcXJDM256RmlPLVVMT01xNmQxQ2FJdTBnZElJUC1wOWNYSlJ5RzBNWVA1bkZoNVBab0R4YlB4aWxoUWpPXzJQUTVDMHBEWkNYd29Pc05obFVXcThNeVZtOEJBakVZbF92NDhpTlRLV2RXMnJWcnU5bEZJdnhqbjNoSmZHQ0pRVEQ0RkE2Ynp6b0o4YmEzd0VvWXdENG01VXJHQnVhSjkydTR1R1k4VWtmYU1oZVJGTE1way1iM3U?oc=5
    - text: 📰
    - paragraph: Interchange Capital Partners LLC Grows Stock Position in Apple Inc. $AAPL - MarketBeat
    - paragraph: Interchange Capital Partners LLC Grows Stock Position in Apple Inc. $AAPL&nbsp;&nbsp;MarketBeat
    - text: Google News (EN) · 1日前 EN
  - 'link "📰 Apple (AAPL) is a Great Momentum Stock: Should You Buy? - Yahoo Finance Apple (AAPL) is a Great Momentum Stock: Should You Buy?&nbsp;&nbsp;Yahoo Finance Google News (EN) · 1日前 EN"':
    - /url: https://news.google.com/rss/articles/CBMinAFBVV95cUxPdW5pQnQtSzJGY2h5WnJ3NWJIa05oZTRkZmhieEVyZ2lvalU0cU4tbkg5WjZMY2d0NU9wWVc2ZzZ5S290bVRjXzhjTGtPRW1pZW9ZUExjR2JXUGlaeXJfS2U0d0NYRDZqOFpoU2kyS0tDNVliWFJXOGc1NG1LclZBVlVkVWRlbXVTb21iVHAyWW5yTFp6V1ZDQXFaU2E?oc=5
    - text: 📰
    - paragraph: "Apple (AAPL) is a Great Momentum Stock: Should You Buy? - Yahoo Finance"
    - paragraph: "Apple (AAPL) is a Great Momentum Stock: Should You Buy?&nbsp;&nbsp;Yahoo Finance"
    - text: Google News (EN) · 1日前 EN
  - link "📰 Apple’s Agentic AI Plans Could Be Its Biggest Growth Story Yet - MarketBeat Apple’s Agentic AI Plans Could Be Its Biggest Growth Story Yet&nbsp;&nbsp;MarketBeat Google News (EN) · 1日前 EN":
    - /url: https://news.google.com/rss/articles/CBMioAFBVV95cUxPNnY1LWFBN2FVclZFaEoxN3R2ZmxhZl8wYi1mVnpEZUtqMU5TdEdpa0lqY1I0N1kwRTdBeWt1VEowUzNETmczNGJuenJsSFZJZDQwNEdkcS1ScUlaWHdid3lrOWJqSGpJeFI0WVlsYXlnZGktTWhLY2ZoYWxDcXRvRG1YbnhwSXg4S0Z0Zm5GRVotNU5fdkwtNmg4RUQ3RUd5?oc=5
    - text: 📰
    - paragraph: Apple’s Agentic AI Plans Could Be Its Biggest Growth Story Yet - MarketBeat
    - paragraph: Apple’s Agentic AI Plans Could Be Its Biggest Growth Story Yet&nbsp;&nbsp;MarketBeat
    - text: Google News (EN) · 1日前 EN
  - link "📰 Apple (AAPL) Stock Price Hits All-Time High As Tim Cook's Quiet AI Strategy Outpaces Rivals - foreignpolicyjournal.com Apple (AAPL) Stock Price Hits All-Time High As Tim Cook's Quiet AI Strategy Outpaces Rivals&nbsp;&nbsp;foreignpolicyjournal.com Google News (EN) · 2日前 EN":
    - /url: https://news.google.com/rss/articles/CBMi0wFBVV95cUxNUlZvR2Y3MjE1SVpYSFlXbGphM3Aya1BrSFY4QndZclpxUkVYSlh0U3JuUllrU2h3dVdWTDBBUGRtdmd6cXdTd3dQMVpwUUxZWS14V0M5aEM0azVCLTVPU212a1lXZ01KbE9WVmVMaWd4MER5RWpMNnYta19rcTRzRlBLV2UzWmJTS0xlTE5hR0tEMzFFSDJlQjFCQzRVcm1iTlBxa09PU2U0d3VsakJHZmxiUk5jbXRjZHNTXzFEYlFxdDBPZDBlOVYzbFBPNWtmZU84?oc=5
    - text: 📰
    - paragraph: Apple (AAPL) Stock Price Hits All-Time High As Tim Cook's Quiet AI Strategy Outpaces Rivals - foreignpolicyjournal.com
    - paragraph: Apple (AAPL) Stock Price Hits All-Time High As Tim Cook's Quiet AI Strategy Outpaces Rivals&nbsp;&nbsp;foreignpolicyjournal.com
    - text: Google News (EN) · 2日前 EN
  - link "📰 Apple Stock Price Forecast. Should You Buy AAPL? - StockInvest.us Apple Stock Price Forecast. Should You Buy AAPL?&nbsp;&nbsp;StockInvest.us Google News (EN) · 2日前 EN":
    - /url: https://news.google.com/rss/articles/CBMiSEFVX3lxTE1VbENZRW0tMHdrVVp0RTNab2E1c05HeC1Ca3EzUmw2bHp0NGJzMG9RNG9kQ0FxaFlSU2wzbzJoR3JKQmZtbjVBUQ?oc=5
    - text: 📰
    - paragraph: Apple Stock Price Forecast. Should You Buy AAPL? - StockInvest.us
    - paragraph: Apple Stock Price Forecast. Should You Buy AAPL?&nbsp;&nbsp;StockInvest.us
    - text: Google News (EN) · 2日前 EN
  - link "📰 Is Apple (AAPL) One of the Best Reddit Stocks to Buy According to Billionaires? - Yahoo Finance Is Apple (AAPL) One of the Best Reddit Stocks to Buy According to Billionaires?&nbsp;&nbsp;Yahoo Finance Google News (EN) · 2日前 EN":
    - /url: https://news.google.com/rss/articles/CBMilgFBVV95cUxQMXF1QlFMNUFQZ3M3Zm5XeVRBNjNRRGdYaWhUNVdtcDJ4WFpnQWhUUG52MzcwY1BCNldBYnZoVHd6NTFrY3Q5Z2FaRGpHRHJrbzNqQXY2bDhkTmdMREhGWm1wdTY3WG1fdkswLXZnT19HVTRXb1FLeFhuVktMZUZXNzJBdExxYkt1cnJ3LURPbDdIVzhRV3c?oc=5
    - text: 📰
    - paragraph: Is Apple (AAPL) One of the Best Reddit Stocks to Buy According to Billionaires? - Yahoo Finance
    - paragraph: Is Apple (AAPL) One of the Best Reddit Stocks to Buy According to Billionaires?&nbsp;&nbsp;Yahoo Finance
    - text: Google News (EN) · 2日前 EN
  - link "📰 What Could Push AAPL Stock Higher From Here? - Trefis What Could Push AAPL Stock Higher From Here?&nbsp;&nbsp;Trefis Google News (EN) · 3日前 EN":
    - /url: https://news.google.com/rss/articles/CBMipwFBVV95cUxPYThHWDdxTTJRNEJEbmxnOUctMjBXV3pxS204SXpHTmJ5OHFPSUR2YUhyZFJOZVcxSTJxcmdGRW9Dd2Y2akdSamktc0NLMFVYY1FMeFhxcU52RG1sVUdoOThQTlJDdThXblp3bkszQWdRcGpWdGY5S1BwX3c0dndFQlVwWVlBTVQtcTVOdWh3ZWdzbndiWWxzOFN3RmJDZ1B6bV9qQ2FWTQ?oc=5
    - text: 📰
    - paragraph: What Could Push AAPL Stock Higher From Here? - Trefis
    - paragraph: What Could Push AAPL Stock Higher From Here?&nbsp;&nbsp;Trefis
    - text: Google News (EN) · 3日前 EN
  - 'link "📰 AAPL Stock: The Math Behind The Upside - Trefis AAPL Stock: The Math Behind The Upside&nbsp;&nbsp;Trefis Google News (EN) · 3日前 EN"':
    - /url: https://news.google.com/rss/articles/CBMiqwFBVV95cUxNYV9CYURGUHFjYV83aGZuQ015SEtmQlZVN0gwYnlvWVJadDNvZzRMLXdKVF9ZUmZvelUyX3NBc0k0a0FnMmVaZlFybVpWMmdYajhkS3V5ZC1QbFAwcW9EZDNIMmJiXzlmeTRqREN5QmVjT0VUbV94c2hzV2NvUkJRQzlvMWFIXzFIcFRUM2NHa0lHQlFITUROUm1NTmI4SlRnVXpKOXFQNkNzWW8?oc=5
    - text: 📰
    - paragraph: "AAPL Stock: The Math Behind The Upside - Trefis"
    - paragraph: "AAPL Stock: The Math Behind The Upside&nbsp;&nbsp;Trefis"
    - text: Google News (EN) · 3日前 EN
  - link "📰 Ashton Thomas Private Wealth LLC Decreases Stock Position in Apple Inc. $AAPL - MarketBeat Ashton Thomas Private Wealth LLC Decreases Stock Position in Apple Inc. $AAPL&nbsp;&nbsp;MarketBeat Google News (EN) · 3日前 EN":
    - /url: https://news.google.com/rss/articles/CBMi0gFBVV95cUxNdzhuSVFfT1NkTXZ5em42YklDX09UQ0lULWc1LUtBWWVmemFnV2hMcG42Rzh1WnRtR3pGZEEtR3VPZEpzSFBWWTNhamxtX0tSanp2MUU1QnY3VkI3NUVPa04tRlZuelZ1VldHM1BUTDF1ckdTMmJwNFRudEwtWnY0MFpqcjJXc2lZTE5lYlRPOXlOV3B2VzlwLXNyMU1aN0JMRlpvS0wtZXIwRU03enJRcXRQNHhxaVM0OWtLQ21oQU51aEYxdlRGNnZtQlNLTHJZelE?oc=5
    - text: 📰
    - paragraph: Ashton Thomas Private Wealth LLC Decreases Stock Position in Apple Inc. $AAPL - MarketBeat
    - paragraph: Ashton Thomas Private Wealth LLC Decreases Stock Position in Apple Inc. $AAPL&nbsp;&nbsp;MarketBeat
    - text: Google News (EN) · 3日前 EN
  - link "📰 APPLE STOCK | TOP STOCKS TO BUY NOW?? | AAPL Stock Analysis | Tech Stocks Tim Burton (UWZwnEw5GZ) - Mshale APPLE STOCK | TOP STOCKS TO BUY NOW?? | AAPL Stock Analysis | Tech Stocks Tim Burton (UWZwnEw5GZ)&nbsp;&nbsp;Mshale Google News (EN) · 3日前 EN":
    - /url: https://news.google.com/rss/articles/CBMiW0FVX3lxTFBoTDd1Umk4THlMSV9qVmJnQUVseGhXeVgtTXdxY0N0NmtXRFd1aWJrX19qWGFwZ1NpejBJbDhQcTBiTUg2ZG1jMHNwLUlNcXdBSmptRkpmSzRDSHc?oc=5
    - text: 📰
    - paragraph: APPLE STOCK | TOP STOCKS TO BUY NOW?? | AAPL Stock Analysis | Tech Stocks Tim Burton (UWZwnEw5GZ) - Mshale
    - paragraph: APPLE STOCK | TOP STOCKS TO BUY NOW?? | AAPL Stock Analysis | Tech Stocks Tim Burton (UWZwnEw5GZ)&nbsp;&nbsp;Mshale
    - text: Google News (EN) · 3日前 EN
  - link "📰 Apple (AAPL) Stock Quotes, Company News And Chart Analysis - Investor's Business Daily Apple (AAPL) Stock Quotes, Company News And Chart Analysis&nbsp;&nbsp;Investor's Business Daily Google News (EN) · 3日前 EN":
    - /url: https://news.google.com/rss/articles/CBMimAFBVV95cUxPSGNhelByVDlqTl9VZWRUUDhacVp6bW9OSGJIM3VGRUllM1ZYVU5zUlU2MWwwNU8zVEZoTjlKN2JTZTc1U3RuSGtCazlYV05hZDkwQTNTSE9penJ1MGJ4QzY5VXlCQ1d5VTlXelF1anVuM2pJTEFRWjZHRkswbDFrbzViNkVVSzh3THZpX2NHWXNkR3RzcVNqMA?oc=5
    - text: 📰
    - paragraph: Apple (AAPL) Stock Quotes, Company News And Chart Analysis - Investor's Business Daily
    - paragraph: Apple (AAPL) Stock Quotes, Company News And Chart Analysis&nbsp;&nbsp;Investor's Business Daily
    - text: Google News (EN) · 3日前 EN
  - link "📰 Apple Stock (AAPL) Opinions on Price Surge to New Highs - Quiver Quantitative Apple Stock (AAPL) Opinions on Price Surge to New Highs&nbsp;&nbsp;Quiver Quantitative Google News (EN) · 4日前 EN":
    - /url: https://news.google.com/rss/articles/CBMilwFBVV95cUxPczRBUkg5NEI3ZzAtcFMyblZuSVk1T3VjZklodUVScURVenQ1eWN1MzJZR3kxNDJDQ0ZTdEJ6UGRfMEVSMlhMWU1wdHdOYWc3dTAwWFdRMGNLSldyUEk1MTZGdHNDR1F2cVdua3A1R0FVQXN3RXczVlhqRkxPNmFsSktXMTJMMnR3QzNNbDdTbzJuVlppRy1F?oc=5
    - text: 📰
    - paragraph: Apple Stock (AAPL) Opinions on Price Surge to New Highs - Quiver Quantitative
    - paragraph: Apple Stock (AAPL) Opinions on Price Surge to New Highs&nbsp;&nbsp;Quiver Quantitative
    - text: Google News (EN) · 4日前 EN
  - link "📰 Apple Inc. $AAPL Stock Holdings Raised by Carmel Capital Partners LLC - MarketBeat Apple Inc. $AAPL Stock Holdings Raised by Carmel Capital Partners LLC&nbsp;&nbsp;MarketBeat Google News (EN) · 4日前 EN":
    - /url: https://news.google.com/rss/articles/CBMixwFBVV95cUxOb21oWldKM0N4aVgtcTJqclE5TURybGZwX1pvZzV2alRBZGxpUzFHSTE5ZUVvUTRZemlONE9maG1WTE9pelVkVjc3X0ZpX2lrcXZOd0ZTdTl0dml1Xzg4bnQ2Rm4ySE04V1gydXhKa1NkaF9JRUtmeWFvYjJRV2dZNzlwcG9LUi1lb0lqSkRpeGhwS01rMy01Z1E2ZEpJVjItQ2lsNG9iNUYzcUswMnhZLWxmVFlRZVVxNzJ6RklTODRNejVEejVV?oc=5
    - text: 📰
    - paragraph: Apple Inc. $AAPL Stock Holdings Raised by Carmel Capital Partners LLC - MarketBeat
    - paragraph: Apple Inc. $AAPL Stock Holdings Raised by Carmel Capital Partners LLC&nbsp;&nbsp;MarketBeat
    - text: Google News (EN) · 4日前 EN
  - link "📰 AAPL Stock Chart | APPLE INC (NASDAQ:AAPL) - ChartMill AAPL Stock Chart | APPLE INC (NASDAQ:AAPL)&nbsp;&nbsp;ChartMill Google News (EN) · 4日前 EN":
    - /url: https://news.google.com/rss/articles/CBMiZEFVX3lxTE9GeEtzTm43RC1kMnZTdlNJOWY3T1dGTFNWNkVnY21MWmNnalJCLWpaRnl5WDZjSERBU2NZSU9iMFJhLUI5anZTUGp0NEpCQVBMamR2VDRoUmRqMTJDdXNjMDM1ZTQ?oc=5
    - text: 📰
    - paragraph: AAPL Stock Chart | APPLE INC (NASDAQ:AAPL) - ChartMill
    - paragraph: AAPL Stock Chart | APPLE INC (NASDAQ:AAPL)&nbsp;&nbsp;ChartMill
    - text: Google News (EN) · 4日前 EN
  - link "📰 Apple Stock Hits New Record Highs as AI Doubts Begin to Fade - Yahoo Finance Apple Stock Hits New Record Highs as AI Doubts Begin to Fade&nbsp;&nbsp;Yahoo Finance Google News (EN) · 4日前 EN":
    - /url: https://news.google.com/rss/articles/CBMimgFBVV95cUxOdTd4WWJ6NjU3VkFEYXZCYXNtb3FLVGl5WFRiY0JUM2laWUQtZ1czR05hRVZ1RldDV0doejJpR3pBQVBrT3hNYWd2d1NyWFJWNENKOFo0MEhDODJhdzRkT1ZBRUVyLThQc2FtVXFxRnJoUU1CX3JrekpyUUVLUklzZG9jbTAtSko2dUlDcVJSY1hqZDNHazRBSGtR?oc=5
    - text: 📰
    - paragraph: Apple Stock Hits New Record Highs as AI Doubts Begin to Fade - Yahoo Finance
    - paragraph: Apple Stock Hits New Record Highs as AI Doubts Begin to Fade&nbsp;&nbsp;Yahoo Finance
    - text: Google News (EN) · 4日前 EN
  - link "📰 Apple (AAPL) Analyst Ratings, Stock Forecast and Price Target - Moomoo Apple (AAPL) Analyst Ratings, Stock Forecast and Price Target&nbsp;&nbsp;Moomoo Google News (EN) · 4日前 EN":
    - /url: https://news.google.com/rss/articles/CBMipgJBVV95cUxQUlZQTXMxVHVCQmx1TFE1NGhKM1NGZTM1VWlTdnI5bl9WaktoSEpEWEdGQzdTeEhHdDJxQ0RDTFRpN0U0OWNlNXk0ZG1WZ0JESHV0eTlST2MxU3AtUmhSYnc0eE9NTEFXQUNsaGxjcGV1RFk3Q1RHSnBOZkl4aE9ZN3h3T1JMbW9Mb0lDWHVDdTRDQ2FJY3BzeXljU2tueV9MWmpuRXhvUXFTYW1qYjNmRmEwa2hjdURZOXg4bDF1cnBTbmdxSVVNb2JmRU9jOUNud0ZyWFhRNUtlODZrME1XM0YyTS1yeEoyckg1TGh2enhNaGVINXdaanpyRW9WRy1oTVhna1p3STFmRWNkWXl6RDVnMU1wbmN4S1Z4UzRDWFlqNTl4dmc?oc=5
    - text: 📰
    - paragraph: Apple (AAPL) Analyst Ratings, Stock Forecast and Price Target - Moomoo
    - paragraph: Apple (AAPL) Analyst Ratings, Stock Forecast and Price Target&nbsp;&nbsp;Moomoo
    - text: Google News (EN) · 4日前 EN
  - 'link "📰 Prediction: Apple Stock Will Trade at This Price in Two Years - 24/7 Wall St. Prediction: Apple Stock Will Trade at This Price in Two Years&nbsp;&nbsp;24/7 Wall St. Google News (EN) · 5日前 EN"':
    - /url: https://news.google.com/rss/articles/CBMipwFBVV95cUxQcmRqNk40ZVpkaWFkaGlDZnpmTUhhWE1GbHRISEI2ZUhtVDNLMHRZY3VKbTZyRE5UOTU3T1hWcTZEZ3JPaV9SNFpTU0g3LXYtUUp0TXUyVlo2TDI4T2ZTVGY1RnZIX1NycHpXNDMwY2dlSmxieE1UTnFlMlBkYjhpRGdJNDdFZ2NKTFV4WmxKendLLUJ0US03VkZwOXdZN1JOX09MSG1Saw?oc=5
    - text: 📰
    - paragraph: "Prediction: Apple Stock Will Trade at This Price in Two Years - 24/7 Wall St."
    - paragraph: "Prediction: Apple Stock Will Trade at This Price in Two Years&nbsp;&nbsp;24/7 Wall St."
    - text: Google News (EN) · 5日前 EN
```

# Test source

```ts
  116 |   } else {
  117 |     // RSI<=30 might not exist in current market; screener still ran
  118 |     test.info().annotations.push({ type: "note", description: "0 hits for RSI<=30 today — market not oversold" });
  119 |   }
  120 | 
  121 |   // Either way the screener ran successfully
  122 |   expect(bodyText).toMatch(/銘柄ヒット|見つかりませんでした/);
  123 | });
  124 | 
  125 | // ── 6. Portfolio analysis ────────────────────────────────────────────────────
  126 | 
  127 | test("6 - portfolio analysis streams", async ({ page }) => {
  128 |   await page.goto(`${BASE}/#portfolio`, { waitUntil: "networkidle" });
  129 |   await expect(page.locator("text=保有銘柄")).toBeVisible({ timeout: 10_000 });
  130 | 
  131 |   const tickerInputs = page.locator("input[placeholder*='銘柄コード']");
  132 |   const amtInputs    = page.locator("input[placeholder*='保有数量']");
  133 | 
  134 |   await tickerInputs.nth(0).fill("AAPL");
  135 |   await amtInputs.nth(0).fill("10");
  136 | 
  137 |   // Add second ticker
  138 |   await page.locator("text=銘柄を追加").click();
  139 |   await tickerInputs.nth(1).fill("NVDA");
  140 |   await amtInputs.nth(1).fill("5");
  141 |   await page.screenshot({ path: "e2e-screenshots/06a-portfolio-form.png" });
  142 | 
  143 |   await page.locator("button", { hasText: "AI分析を実行" }).click();
  144 | 
  145 |   await waitForStreamingText(page, ".whitespace-pre-wrap", 30, 90_000);
  146 |   await page.screenshot({ path: "e2e-screenshots/06b-portfolio-result.png" });
  147 | });
  148 | 
  149 | // ── 7. Backtest ──────────────────────────────────────────────────────────────
  150 | 
  151 | test("7 - backtest AAPL 2024-01-01 $10000", async ({ page }) => {
  152 |   await page.goto(`${BASE}/#aapl`, { waitUntil: "networkidle" });
  153 |   await expect(page.locator("text=現在値")).toBeVisible({ timeout: 30_000 });
  154 |   await expect(page.locator("text=バックテスト")).toBeVisible({ timeout: 10_000 });
  155 | 
  156 |   // Fill buy date
  157 |   const dateInputs = page.locator("input[type='date']");
  158 |   await dateInputs.first().fill("2024-01-01");
  159 | 
  160 |   // Fill amount — find the ¥/$ labelled input
  161 |   const numInputs = page.locator("input[type='number']");
  162 |   // Amount input is the first number input inside BacktestPanel
  163 |   await numInputs.first().fill("10000");
  164 |   await page.screenshot({ path: "e2e-screenshots/07a-backtest-form.png" });
  165 | 
  166 |   await page.locator("button", { hasText: "計算" }).click();
  167 | 
  168 |   await expect(page.locator("text=損益率")).toBeVisible({ timeout: 30_000 });
  169 |   await expect(page.locator("text=年率換算")).toBeVisible({ timeout: 10_000 });
  170 |   await page.screenshot({ path: "e2e-screenshots/07b-backtest-result.png" });
  171 | 
  172 |   const bodyText = await page.evaluate(() => document.body.innerText);
  173 |   expect(bodyText).toMatch(/[+-]?\d+\.\d+%/);
  174 | });
  175 | 
  176 | // ── 8. PDF download ──────────────────────────────────────────────────────────
  177 | 
  178 | test("8 - PDF report download", async ({ page, context }) => {
  179 |   await page.goto(`${BASE}/#aapl`, { waitUntil: "networkidle" });
  180 |   await expect(page.locator("text=現在値")).toBeVisible({ timeout: 30_000 });
  181 | 
  182 |   const [download] = await Promise.all([
  183 |     page.waitForEvent("download", { timeout: 30_000 }),
  184 |     page.locator("button", { hasText: "PDF出力" }).click(),
  185 |   ]);
  186 | 
  187 |   const suggestedName = download.suggestedFilename();
  188 |   expect(suggestedName).toMatch(/\.pdf$/i);
  189 |   await page.screenshot({ path: "e2e-screenshots/08-pdf-download.png" });
  190 | });
  191 | 
  192 | // ── 9. Alert panel ───────────────────────────────────────────────────────────
  193 | 
  194 | test("9 - alert panel saves condition", async ({ page }) => {
  195 |   await page.goto(`${BASE}/#aapl`, { waitUntil: "networkidle" });
  196 |   await expect(page.locator("text=現在値")).toBeVisible({ timeout: 30_000 });
  197 | 
  198 |   // Scroll to alert panel
  199 |   const alertHeading = page.locator("text=アラート設定").first();
  200 |   await alertHeading.scrollIntoViewIfNeeded();
  201 |   await expect(alertHeading).toBeVisible({ timeout: 10_000 });
  202 | 
  203 |   // Set ticker field to AAPL (may already be set)
  204 |   const tickerInput = page.locator("input[placeholder*='AAPL'], input[placeholder*='銘柄']").first();
  205 |   await tickerInput.fill("AAPL");
  206 | 
  207 |   // Set threshold value
  208 |   const thresholdInput = page.locator("input[type='number']").last();
  209 |   await thresholdInput.fill("25");
  210 | 
  211 |   await page.screenshot({ path: "e2e-screenshots/09a-alert-form.png" });
  212 | 
  213 |   await page.locator("button", { hasText: "追加" }).first().click();
  214 | 
  215 |   // Alert row should appear
> 216 |   await expect(page.locator("text=≤ 25").or(page.locator("text=≥ 25"))).toBeVisible({ timeout: 5_000 });
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  217 |   await page.screenshot({ path: "e2e-screenshots/09b-alert-saved.png" });
  218 | });
  219 | 
```