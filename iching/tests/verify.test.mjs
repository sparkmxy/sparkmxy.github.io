import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCast, YARROW_MODEL } from '../core.mjs';
import { verifyReading } from '../verify.mjs';

function fixture({ rejection = false } = {}) {
  const raw = Array(128).fill(0);
  // draw #1 has bound 4; draw #2 has bound 12, where 65535 is rejected.
  if (rejection) raw[1] = 65535;
  let consumed = 0;
  let rejected = 0;
  const cast = createCast(bound => {
    const limit = 65536 - 65536 % bound;
    for (;;) {
      const word = raw[consumed++];
      if (word < limit) return word % bound;
      rejected++;
    }
  });
  return JSON.parse(JSON.stringify({
    version: 1,
    model: YARROW_MODEL,
    lines: cast.lines,
    entropy: { source: 'web-crypto', sampling: 'uint16-rejection-v1', wordBits: 16, poolSize: 128, signed: false, raw, consumed, rejected },
  }));
}

test('exported records replay all 18 changes including rejection sampling', () => {
  const result = verifyReading(fixture({ rejection: true }));
  assert.equal(result.ok, true);
  assert.equal(result.consumed, 37);
  assert.equal(result.rejected, 1);
  assert.match(result.disclaimer, /不证明随机来源/);
});

test('a changed consumed random word is detected even with unchanged metadata', () => {
  const record = fixture();
  record.entropy.raw[0] = 3;
  assert.equal(verifyReading(record).ok, false);
});

test('tampering with any of the 18 changes or line values is detected', () => {
  for (let line = 0; line < 6; line++) {
    for (let step = 0; step < 3; step++) {
      const record = fixture();
      record.lines[line].steps[step].remaining += 4;
      assert.equal(verifyReading(record).ok, false);
    }
    const record = fixture();
    record.lines[line].value = 6;
    assert.equal(verifyReading(record).ok, false);
  }
});

test('version, model, raw-word schema and counters are checked', () => {
  const mutations = [
    r => { r.version = 2; },
    r => { r.model.id = 'uniform-piles'; },
    r => { r.model.probabilities[6] = 0.25; },
    r => { r.entropy.raw.pop(); },
    r => { r.entropy.raw[0] = 65536; },
    r => { r.entropy.raw[0] = -1; },
    r => { r.entropy.raw[0] = 0.5; },
    r => { r.entropy.raw[0] = '0'; },
    r => { r.entropy.raw[0] = null; },
    r => { r.entropy.raw[0] = NaN; },
    r => { delete r.entropy.raw[0]; },
    r => { r.entropy.wordBits = 32; },
    r => { r.entropy.sampling = 'modulo'; },
    r => { r.entropy.source = 'unknown'; },
    r => { r.entropy.signed = true; },
    r => { r.entropy.poolSize = 36; },
    r => { r.entropy.consumed += 1; },
    r => { r.entropy.rejected += 1; },
    r => { r.lines.pop(); },
    r => { r.lines[0].steps.pop(); },
    r => { delete r.lines[0].steps[0].hanging; },
  ];
  for (const mutate of mutations) {
    const record = fixture();
    mutate(record);
    assert.equal(verifyReading(record).ok, false, mutate.toString());
  }
  for (const record of [null, [], 'text', {}]) assert.equal(verifyReading(record).ok, false);
});

test('unused pool words do not authenticate the source or affect the calculation', () => {
  const record = fixture();
  record.entropy.raw[127] = 65535;
  assert.equal(verifyReading(record).ok, true);
});

test('a pool that runs out during rejection sampling is rejected', () => {
  const record = fixture();
  record.entropy.raw.fill(65535, 1);
  // First residue is 1, so the next bound is 12 and all remaining words reject.
  assert.equal(verifyReading(record).ok, false);
});

test('CLI reads exported JSON and reports reliable exit codes', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'iching-verify-test-'));
  const filename = path.join(directory, 'reading.json');
  const script = fileURLToPath(new URL('../verify.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  try {
    await writeFile(filename, JSON.stringify(fixture()));
    const matching = run(filename);
    assert.equal(matching.status, 0);
    assert.match(matching.stdout, /复核一致/);
    const altered = fixture();
    altered.lines[0].value = 6;
    await writeFile(filename, JSON.stringify(altered));
    const mismatching = run(filename);
    assert.equal(mismatching.status, 1);
    assert.match(mismatching.stdout, /复核不一致/);
    await writeFile(filename, '{broken');
    assert.equal(run(filename).status, 2);
    assert.equal(run().status, 2);
  } finally {
    await unlink(filename).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await rmdir(directory);
  }
});
