// test-runner.ts
import { DemoProvider } from './src/providers/demoProvider';
import { SignalPipeline } from './src/engine/signalPipeline';
import { DEFAULT_USER_SETTINGS } from './src/services/storageService';

async function runTest() {
  const provider = new DemoProvider();
  const pairs = await provider.getAvailablePairs();
  console.log(`=== TESTING SIGNAL PIPELINE ON ${pairs.length} OTC PAIRS ===\n`);

  let callCount = 0;
  let putCount = 0;
  let waitCount = 0;

  for (const pair of pairs) {
    const candles = await provider.getCandles(pair.symbol, '1m', 60);
    const sig = SignalPipeline.generateSignal({
      symbol: pair.symbol,
      candles,
      expiry: '30s',
      settings: DEFAULT_USER_SETTINGS,
    });

    if (sig.direction === 'CALL') callCount++;
    else if (sig.direction === 'PUT') putCount++;
    else waitCount++;

    console.log(`[${pair.symbol.padEnd(16)}] Direction: ${sig.direction.padEnd(5)} | Confidence: ${String(sig.confidence).padStart(2)}% | Agreement: ${sig.modelAgreement.agreementRatio} | Regime: ${sig.marketRegime}`);
    console.log(`  └─ Reasons: ${sig.analysisReasons.slice(0, 2).join(' | ')}`);
  }

  console.log(`\n=== SUMMARY: CALL: ${callCount} | PUT: ${putCount} | WAIT: ${waitCount} ===`);
  process.exit(0);
}

runTest();
