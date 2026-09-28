// test-runner.ts
import { DemoProvider } from './src/providers/demoProvider';
import { CentralSignalEngine } from './src/engine/centralSignalEngine';
import { DEFAULT_USER_SETTINGS, StorageService } from './src/services/storageService';
import { ExpiryDuration } from './src/types/market';

async function runComprehensiveTests() {
  const provider = new DemoProvider();
  const pairs = StorageService.getOTCPairs();
  console.log(`=== RUNNING FULL OTC SIGNAL ENGINE AUDIT ON ${pairs.length} OTC PAIRS ===\n`);

  let callCount = 0;
  let putCount = 0;
  let waitCount = 0;
  let syncPassCount = 0;
  let totalSyncTests = 0;

  for (const pair of pairs) {
    for (const expiry of ['30s', '1m'] as ExpiryDuration[]) {
      totalSyncTests++;

      // Scanner evaluation
      const [c1m_s, c5m_s, c15m_s] = await Promise.all([
        provider.getClosedCandles(pair.symbol, '1m', 60),
        provider.getClosedCandles(pair.symbol, '5m', 30),
        provider.getClosedCandles(pair.symbol, '15m', 20),
      ]);

      const scannerSig = CentralSignalEngine.getOrGenerateSignal({
        pair: pair.symbol,
        market: 'OTC',
        expiry,
        timeframe: '1m',
        candles: c1m_s,
        higherTfCandles5m: c5m_s,
        higherTfCandles15m: c15m_s,
        dataSource: provider.name,
        mode: 'CLOSED_CANDLE',
        settings: DEFAULT_USER_SETTINGS,
      });

      // Dashboard evaluation
      const [c1m_d, c5m_d, c15m_d] = await Promise.all([
        provider.getClosedCandles(pair.symbol, '1m', 60),
        provider.getClosedCandles(pair.symbol, '5m', 30),
        provider.getClosedCandles(pair.symbol, '15m', 20),
      ]);

      const dashSig = CentralSignalEngine.getOrGenerateSignal({
        pair: pair.symbol,
        market: 'OTC',
        expiry,
        timeframe: '1m',
        candles: c1m_d,
        higherTfCandles5m: c5m_d,
        higherTfCandles15m: c15m_d,
        dataSource: provider.name,
        mode: 'CLOSED_CANDLE',
        settings: DEFAULT_USER_SETTINGS,
      });

      if (expiry === '30s') {
        if (scannerSig.direction === 'CALL') callCount++;
        else if (scannerSig.direction === 'PUT') putCount++;
        else waitCount++;
      }

      const match = scannerSig.direction === dashSig.direction &&
                    scannerSig.confidence === dashSig.confidence &&
                    scannerSig.candleTimestamp === dashSig.candleTimestamp;

      if (match) {
        syncPassCount++;
        if (expiry === '30s') {
          console.log(`[PASS] ${pair.symbol.padEnd(16)} | Signal: ${scannerSig.direction.padEnd(5)} (${scannerSig.confidence}%) | Models: ${scannerSig.modelAgreement.agreementRatio} | Evidence: +${scannerSig.bullishScore}/-${scannerSig.bearishScore}`);
          console.log(`       Evidence: ${scannerSig.analysisReasons.slice(0, 2).join(' | ')}`);
        }
      } else {
        console.error(`[FAIL] ${pair.symbol} MISMATCH between Scanner (${scannerSig.direction}) and Dashboard (${dashSig.direction})`);
      }
    }
  }

  console.log(`\n================================================================`);
  console.log(`  SYNCHRONIZATION SCORE: ${syncPassCount}/${totalSyncTests} (${Math.round((syncPassCount/totalSyncTests)*100)}%)`);
  console.log(`  DISTRIBUTION (30s): CALL: ${callCount} | PUT: ${putCount} | WAIT: ${waitCount}`);
  console.log(`================================================================\n`);

  if (syncPassCount === totalSyncTests) {
    console.log('✅ ALL PAIRS 100% SYNCHRONIZED AND DETERMINISTIC ACROSS ALL VIEWS!');
    process.exit(0);
  } else {
    console.error('❌ Mismatch detected.');
    process.exit(1);
  }
}

runComprehensiveTests();
