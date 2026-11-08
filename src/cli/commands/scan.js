import { register } from '../router.js';
import * as core from '../../core/scan.js';

register('scan', {
  description: 'Batch-scan watchlist/symbols for Displacement Precursor (or another study\'s plots)',
  options: {
    symbols: { type: 'string', short: 's', description: 'Comma-separated symbols (default: active watchlist)' },
    timeframe: { type: 'string', short: 't', description: 'Timeframe for the scan (e.g. 15, 60, 240)' },
    study: { type: 'string', description: 'Study name substring (default: Displacement Precursor)' },
    delay: { type: 'string', short: 'd', description: 'Settle delay ms after each symbol (default 1500)' },
    all: { type: 'boolean', short: 'a', description: 'Return every symbol, not just hits' },
    'no-armed': { type: 'boolean', description: 'Exclude Status=1 armed (watches only)' },
    'no-restore': { type: 'boolean', description: 'Leave chart on the last scanned symbol' },
  },
  handler: (opts) => {
    const symbols = opts.symbols
      ? String(opts.symbols).split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    return core.scanStudyValues({
      symbols,
      timeframe: opts.timeframe,
      study_filter: opts.study,
      delay_ms: opts.delay ? Number(opts.delay) : undefined,
      hits_only: !opts.all,
      include_armed: !opts['no-armed'],
      restore: !opts['no-restore'],
    });
  },
});
