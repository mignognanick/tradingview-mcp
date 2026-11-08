/**
 * Batch-scan chart study plots across symbols.
 * Reads the indicator already on the chart — does not reimplement signal rules.
 * Defaults target Displacement Precursor (Setup / Status / Level).
 */
import { setSymbol, setTimeframe, getState } from './chart.js';
import { getStudyValues } from './data.js';
import { get as getWatchlist } from './watchlist.js';

const DEFAULT_STUDY = 'Displacement Precursor';
const DEFAULT_DELAY_MS = 1500;

/** @param {unknown} raw */
export function parsePlotNumber(raw) {
  if (raw == null || raw === '' || raw === '∅') return null;
  const n = Number(String(raw).replace(/,/g, '').replace(/[^\d.eE+-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown>} values
 * @param {string} studyName
 */
export function classifyDisplacementHit(values, studyName = DEFAULT_STUDY) {
  const setup = parsePlotNumber(values?.Setup ?? values?.setup);
  const status = parsePlotNumber(values?.Status ?? values?.status);
  const level = parsePlotNumber(values?.Level ?? values?.level);

  let setup_label = 'none';
  if (setup === 1) setup_label = 'bullish_watch';
  else if (setup === -1) setup_label = 'bearish_watch';

  let status_label = 'idle';
  if (status === 1) status_label = 'armed';
  else if (status === 2) status_label = 'sweep';

  const is_watch = setup === 1 || setup === -1;
  const is_armed = status === 1;
  const is_hit = is_watch || is_armed;

  return {
    study: studyName,
    setup,
    status,
    level,
    setup_label,
    status_label,
    is_watch,
    is_armed,
    is_hit,
  };
}

function pickStudy(studies, studyFilter) {
  const needle = String(studyFilter || DEFAULT_STUDY).toLowerCase();
  return (studies || []).find((s) => String(s.name || '').toLowerCase().includes(needle)) || null;
}

async function settle(ms) {
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
}

/**
 * Scan symbols for a study's current plot values.
 *
 * @param {object} opts
 * @param {string[]} [opts.symbols] - Tickers to scan. Default: active watchlist.
 * @param {string} [opts.timeframe] - Optional resolution to apply before scanning.
 * @param {string} [opts.study_filter] - Study name substring (default Displacement Precursor).
 * @param {number} [opts.delay_ms] - Settle time after each symbol change.
 * @param {boolean} [opts.hits_only] - Only return watches / armed rows (default true).
 * @param {boolean} [opts.include_armed] - Treat Status=1 as a hit even when Setup=0 (default true).
 * @param {boolean} [opts.restore] - Restore original symbol/timeframe after scan (default true).
 */
export async function scanStudyValues({
  symbols,
  timeframe,
  study_filter,
  delay_ms,
  hits_only,
  include_armed,
  restore,
} = {}) {
  const studyFilter = study_filter || DEFAULT_STUDY;
  const delay = delay_ms ?? DEFAULT_DELAY_MS;
  const onlyHits = hits_only !== false;
  const armedCounts = include_armed !== false;
  const shouldRestore = restore !== false;

  const before = await getState();
  const originalSymbol = before.symbol;
  const originalTf = before.resolution;

  const onChart = (before.studies || []).some((s) =>
    String(s.name || '').toLowerCase().includes(studyFilter.toLowerCase()),
  );
  if (!onChart) {
    throw new Error(
      `"${studyFilter}" is not on the active chart. Add it once (studies persist across symbols), then re-run the scan.`,
    );
  }

  let list = Array.isArray(symbols) && symbols.length > 0 ? [...symbols] : null;
  let listName = null;
  if (!list) {
    const wl = await getWatchlist();
    list = (wl.symbols || []).map((row) => row.symbol).filter(Boolean);
    listName = wl.list_name || null;
    if (list.length === 0) throw new Error('No symbols to scan. Pass symbols[] or open a watchlist.');
  }

  if (timeframe && timeframe !== originalTf) {
    await setTimeframe({ timeframe });
    await settle(delay);
  }

  const results = [];
  for (const symbol of list) {
    try {
      await setSymbol({ symbol });
      await settle(delay);
      const studies = await getStudyValues();
      const study = pickStudy(studies.studies, studyFilter);
      if (!study) {
        results.push({
          symbol,
          success: false,
          error: `Study "${studyFilter}" not found after symbol change`,
        });
        continue;
      }
      const classified = classifyDisplacementHit(study.values || {}, study.name);
      results.push({
        symbol,
        success: true,
        ...classified,
        values: study.values || {},
      });
    } catch (err) {
      results.push({ symbol, success: false, error: err.message });
    }
  }

  if (shouldRestore) {
    try {
      if (originalSymbol) await setSymbol({ symbol: originalSymbol });
      if (timeframe && originalTf && timeframe !== originalTf) {
        await setTimeframe({ timeframe: originalTf });
      }
    } catch {
      /* restore best-effort */
    }
  }

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const watches = successful.filter((r) => r.is_watch);
  const armed = successful.filter((r) => r.is_armed && !r.is_watch);
  const hits = successful.filter((r) => r.is_watch || (armedCounts && r.is_armed));

  const out = {
    success: true,
    study_filter: studyFilter,
    list_name: listName,
    timeframe: timeframe || originalTf || null,
    scanned: results.length,
    successful: successful.length,
    failed: failed.length,
    watch_count: watches.length,
    armed_count: armed.length,
    hit_count: hits.length,
    hits,
    errors: failed,
  };
  // Full per-symbol rows only when asked — keeps MCP context small by default.
  if (!onlyHits) out.results = results;
  return out;
}
