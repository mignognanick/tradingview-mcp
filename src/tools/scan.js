import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as core from '../core/scan.js';

export function registerScanTools(server) {
  server.tool(
    'scan_study_values',
    'Batch-scan symbols for a chart study\'s current plot values. Defaults to Displacement Precursor on the active watchlist: Setup 1=bullish watch, -1=bearish watch; Status 1=armed near level, 2=sweep. The study must already be on the chart. Does not reimplement signal rules — reads plots only.',
    {
      symbols: z.array(z.string()).optional().describe('Symbols to scan. Default: active watchlist (e.g. OrbFavs).'),
      timeframe: z.string().optional().describe('Optional timeframe to apply for the scan (e.g. "15", "60", "240"). Restored afterward when restore=true.'),
      study_filter: z.string().optional().describe('Study name substring (default: "Displacement Precursor").'),
      delay_ms: z.coerce.number().optional().describe('Settle delay after each symbol change in ms (default 1500).'),
      hits_only: z.coerce.boolean().optional().describe('Return only watches/armed hits (default true).'),
      include_armed: z.coerce.boolean().optional().describe('Count Status=1 (armed) as a hit even when Setup=0 (default true).'),
      restore: z.coerce.boolean().optional().describe('Restore original symbol/timeframe after scan (default true).'),
    },
    async (args) => {
      try {
        return jsonResult(await core.scanStudyValues(args));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}
