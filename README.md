# Chinese Signals AI Bot 📈🤖
### AI-Powered OTC Trading Signal Analysis for Quotex OTC Markets

A production-ready quantitative trading signal analysis and market intelligence dashboard built for **Quotex OTC** style short-duration options trading.

---

## 🌟 Key Features

- **6-Layer AI Ensemble Engine:**
  - Model A: Momentum & Microstructure Engine
  - Model B: Trend & Structure Baseline
  - Model C: Mean-Reversion & S/R Bounce Engine
  - Model D: Price-Action & Candlestick Geometry
  - Model E: Volatility Regime Filter
  - Model F: ML Feature Predictor (Logistic / Decision Weights)
- **Expiry Profiles:** Distinct mathematical weighting profiles for `5s`, `10s`, `15s`, `30s`, `45s`, and `1m`.
- **Transparent Confidence Scores:** Real-time calculated confidence ($0–100\%$) based on actual indicator consensus — zero hardcoded fake accuracy.
- **OTC Market Scanner:** Real-time bulk scanning and ranking across all Quotex OTC pairs.
- **Interactive Candlestick Charts:** High-performance Canvas charts with EMA 9/21/50, Bollinger Bands, Support/Resistance lines, RSI, MACD, Stochastics, and ATR.
- **Walk-Forward Chronological Backtesting:** Non-lookahead historical bar-by-bar simulation with simulated equity curve.
- **Telegram Bot Webhook Dispatcher:** Formatted analytical alert dispatcher conforming to signal standard specifications.
- **Web Audio API Alerts:** Zero-latency synthesized audio alerts for CALL, PUT, WAIT, and WIN outcomes.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 2. Installation
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/chinese-signals-ai-bot.git
cd chinese-signals-ai-bot

# Install dependencies
npm install
```

### 3. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run preview
```

---

## 📁 Project Architecture

```
src/
├── types/          # TypeScript type definitions for market, signals, indicators, backtests
├── engine/         # Quantitative calculus, mathematical indicators, 6 AI models & ensemble
├── providers/      # MarketDataProvider interface, high-precision Demo simulator & Quotex bridge
├── services/       # Web Audio API synthesizer, Telegram dispatcher, Local storage layer
├── context/        # React Context state management (MarketContext, SignalContext, SettingsContext)
└── components/     # UI Views (Dashboard, Live Signals, OTC Scanner, Pair Analysis, Backtest, Admin)
```

---

## 🛡️ Disclaimer

AI-generated signals are algorithmic analytical outputs based on market data and model calculations. They do **not** guarantee accuracy or profit. OTC digital-option trading involves substantial financial risk.
