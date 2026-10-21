import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAhead } from '../src/util.js';
import { stableUpdateNames } from '../src/generate/render/shared.js';

describe('isAhead', () => {
  it('is true when experimental is a newer minor', () => {
    assert.equal(isAhead('1.30.164014', '1.29.163709'), true);
  });

  it('is true when experimental is a newer patch of the same minor', () => {
    // Dec 1 2025: experimental hotfix ahead of then-live 1.28.
    assert.equal(isAhead('1.28.161423', '1.28.160420'), true);
  });

  it('is false when builds are equal', () => {
    assert.equal(isAhead('1.29.163047', '1.29.163047'), false);
  });

  it('is false when experimental is behind', () => {
    assert.equal(isAhead('1.29.163401', '1.29.163451'), false);
    assert.equal(isAhead('1.28.161423', '1.29.163709'), false);
  });
});

describe('experimental channel naming', () => {
  const live = { version: '1.29', build: '1.29.163709', rev: 1, date: '2026-08-12' };
  const older = { version: '1.29', build: '1.29.163451', rev: 1, date: '2026-07-15' };
  const experimental = {
    version: '1.30',
    build: '1.30.164014',
    rev: 126965,
    date: '2026-09-16',
    channel: 'experimental',
  };

  it('stableUpdateNames ignores channel entries', () => {
    const names = stableUpdateNames([experimental, live, older]);
    assert.equal(names.has(experimental.build), false);
    assert.equal(names.get(live.build), '1.29 Road to Badlands Update 2');
  });

  it('counts official-repo builds as stable before notes arrive', () => {
    const pending = { version: '1.30', build: '1.30.164200', rev: 127662, date: '2026-10-21' };
    const named = { version: '1.30', build: '1.30.164078', rev: 127250, date: '2026-10-16' };
    const names = stableUpdateNames([experimental, pending, named]);
    assert.equal(names.has(experimental.build), false);
    assert.equal(names.get(pending.build), '1.30 Update 2');
    assert.equal(names.get(named.build), '1.30 Update 1');
  });
});
