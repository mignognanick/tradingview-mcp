/**
 * Unit tests for Displacement Precursor scan helpers (no CDP required).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlotNumber, classifyDisplacementHit } from '../src/core/scan.js';

describe('parsePlotNumber', () => {
  it('parses plain and padded decimals', () => {
    assert.equal(parsePlotNumber('1.0000'), 1);
    assert.equal(parsePlotNumber('-1.0000'), -1);
    assert.equal(parsePlotNumber('0.0000'), 0);
  });

  it('returns null for empty / missing', () => {
    assert.equal(parsePlotNumber(null), null);
    assert.equal(parsePlotNumber('∅'), null);
    assert.equal(parsePlotNumber(''), null);
  });
});

describe('classifyDisplacementHit', () => {
  it('labels bullish watch', () => {
    const hit = classifyDisplacementHit({ Setup: '1.0000', Status: '2.0000', Level: '100.5' });
    assert.equal(hit.setup_label, 'bullish_watch');
    assert.equal(hit.status_label, 'sweep');
    assert.equal(hit.level, 100.5);
    assert.equal(hit.is_watch, true);
    assert.equal(hit.is_hit, true);
  });

  it('labels bearish watch', () => {
    const hit = classifyDisplacementHit({ Setup: '-1', Status: '0' });
    assert.equal(hit.setup_label, 'bearish_watch');
    assert.equal(hit.is_watch, true);
  });

  it('labels armed-only as hit without watch', () => {
    const hit = classifyDisplacementHit({ Setup: '0', Status: '1.0000' });
    assert.equal(hit.setup_label, 'none');
    assert.equal(hit.status_label, 'armed');
    assert.equal(hit.is_watch, false);
    assert.equal(hit.is_armed, true);
    assert.equal(hit.is_hit, true);
  });

  it('idle when both zero', () => {
    const hit = classifyDisplacementHit({ Setup: '0.0000', Status: '0.0000' });
    assert.equal(hit.is_hit, false);
    assert.equal(hit.status_label, 'idle');
  });
});
