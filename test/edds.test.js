import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { decodeEdds } from '../site/app/edds.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => fs.readFileSync(path.join(dir, 'fixtures', name));

test('EDDS R8 largest mip decodes to RGBA', () => {
  const img = decodeEdds(fixture('logo-r8.edds'));
  assert.ok(img);
  assert.equal(img.width, 256);
  assert.equal(img.height, 256);
  assert.equal(img.rgba.length, 256 * 256 * 4);
  assert.equal(img.rgba[0], 255);
  assert.equal(img.rgba[3], 255);
});

test('EDDS DXT5 largest mip decodes to RGBA', () => {
  const img = decodeEdds(fixture('logo-dxt5.edds'));
  assert.ok(img);
  assert.equal(img.width, 256);
  assert.equal(img.height, 256);
  assert.equal(img.rgba.length, 256 * 256 * 4);
  assert.ok(img.rgba.some((v, i) => i % 4 !== 3 && v > 0));
});

test('non-EDDS bytes return null', () => {
  assert.equal(decodeEdds(new Uint8Array([1, 2, 3, 4])), null);
});
