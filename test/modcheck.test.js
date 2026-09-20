import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFile } from '../src/parser/index.js';
import { analyze, normSig, readModCpp, readPbo, scanSource, sigFromMethod } from '../site/app/modcheck.js';

const SOURCE = `
modded class PlayerBase
{
  override void OnJumpStart() {}
  override bool OnStoreLoad(ParamsReadContext ctx, int version) {}
  override void Take(out string name, notnull EntityAI item);
  override void Set(array<string> items = null) {}
  override protected void Hidden() {}
  // override void Commented() {}
};
class Mine extends PlayerBase
{
  override void OnJumpStart() {}
};
`;

test('override signatures match the Enforce parser', () => {
  const { model } = parseFile(SOURCE, 'player.c');
  const scanned = scanSource(SOURCE);
  const modded = scanned.find((c) => c.name === 'PlayerBase');
  const parsed = model.classes.find((c) => c.name === 'PlayerBase');
  for (const m of parsed.methods.filter((method) => method.mods?.includes('override'))) {
    const got = modded.overrides.find((o) => o.name === m.name);
    assert.ok(got, m.name);
    assert.equal(normSig(got.sig), normSig(sigFromMethod(m)), m.name);
  }
  assert.equal(scanned.find((c) => c.name === 'Mine').base, 'PlayerBase');
  assert.ok(!modded.overrides.some((o) => o.name === 'Commented'));
});

test('a changed signature, a missing method, and a removed class are the rows that matter', () => {
  const index = {
    c: {
      PlayerBase: {
        b: 'ManBase',
        d: '4_world',
        m: { OnJumpStart: 'void()', OnStoreLoad: 'bool(ParamsReadContext, int)' },
      },
      ManBase: { b: '', d: '4_world', m: { EEInit: 'void()' } },
    },
  };
  const rows = analyze([{
    path: 'MyMod/scripts/4_World/player.c',
    text: `
      modded class PlayerBase {
        override void OnJumpStart() {}
        override void OnStoreLoad(ParamsReadContext ctx, int version) {}
        override void Gone() {}
        override void EEInit() {}
      }
      modded class Deleted { override void X() {} }
    `,
  }], index);
  const by = (method) => rows.find((r) => r.method === method);
  assert.equal(by('OnJumpStart').status, 'ok');
  assert.equal(by('OnStoreLoad').status, 'sig');
  assert.equal(by('Gone').status, 'missing-method');
  assert.equal(by('EEInit').status, 'ok');
  assert.equal(by('EEInit').owner, 'ManBase');
  assert.ok(rows.some((r) => r.status === 'missing-class' && r.cls === 'Deleted'));
});

test('mod.cpp is the launcher card, not a script', () => {
  assert.deepEqual(readModCpp('name = "Hats";\nauthor = "Ada";\nversion = "1.2";\n'), {
    name: 'Hats', author: 'Ada', authorID: '', version: '1.2', overview: '', action: '', actionName: '',
  });
});

test('a PBO header yields prefix and version, and an uncompressed script', () => {
  const cstr = (s) => [...Buffer.from(s), 0];
  const u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
  const body = Buffer.from('modded class PlayerBase { override void OnJumpStart() {} };');
  const bytes = new Uint8Array([
    0, ...u32(0x56657273), ...u32(0), ...u32(0), ...u32(0), ...u32(0),
    ...cstr('prefix'), ...cstr('MyMod\\'), ...cstr('version'), ...cstr('3'), 0,
    ...cstr('scripts/4_World/player.c'), ...u32(0), ...u32(body.length), ...u32(0), ...u32(0), ...u32(body.length),
    0, ...u32(0), ...u32(0), ...u32(0), ...u32(0), ...u32(0),
    ...body,
  ]);
  const pbo = readPbo(bytes);
  assert.equal(pbo.props.prefix, 'MyMod\\');
  assert.equal(pbo.props.version, '3');
  assert.equal(pbo.files.length, 1);
  assert.equal(pbo.compressed, 0);
  assert.equal(scanSource(pbo.files[0].text)[0].name, 'PlayerBase');
});
