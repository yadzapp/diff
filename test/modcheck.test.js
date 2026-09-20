import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFile } from '../src/parser/index.js';
import { analyze, actionLinkLabel, normSig, readCfgMods, readModCpp, readPbo, readStringtable, resolveStr, scanSource, sigFromMethod, workshopFromUrl } from '../site/app/modcheck.js';

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

test('generic class base is the template name, not the type argument', () => {
  const scanned = scanSource('class TypeConversionObject: TypeConversionTemplate<Object> {\n  override void SetObject(Object value) {}\n};');
  assert.equal(scanned[0].base, 'TypeConversionTemplate');
});

test('ifdef fork of an override is ok when any branch matches', () => {
  const index = {
    c: {
      GesturesMenu: {
        b: '',
        d: '5_mission',
        m: { GetGestureItems: 'void(out array<ref GestureMenuItem>, GestureCategories)' },
      },
    },
  };
  const rows = analyze([{
    path: 'Dabs/5_Mission/GesturesMenu.c',
    text: `
      modded class GesturesMenu {
#ifndef DAYZ_1_26
        override void GetGestureItems(out array<ref GestureMenuItem> gesture_items, GestureCategories category) {}
#else
        override void GetGestureItems(out ref array<ref GestureMenuItem> gesture_items, GestureCategories category) {}
#endif
      }
    `,
  }], index);
  assert.equal(rows.filter((r) => r.method === 'GetGestureItems').length, 1);
  assert.equal(rows.find((r) => r.method === 'GetGestureItems').status, 'ok');
});

test('mod template subclass does not compare SetObject to IEntity', () => {
  const index = {
    c: {
      Object: { b: 'IEntity', d: '1_core', m: {} },
      IEntity: { b: 'Managed', d: '1_core', m: { SetObject: 'void(vobject, string)' } },
      Managed: { b: '', d: '1_core', m: {} },
    },
  };
  const rows = analyze([
    {
      path: 'Dabs/3_Game/TypeConverter.c',
      text: 'class TypeConversionTemplate<Class T>: TypeConverter { override void SetParam(Param value) {} };',
    },
    {
      path: 'Dabs/3_Game/TypeConversionObject.c',
      text: `
        class TypeConversionObject: TypeConversionTemplate<Object> {
          override void SetObject(Object value) {}
        };
      `,
    },
  ], index);
  assert.ok(!rows.some((r) => r.method === 'SetObject'));
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
  const prior = {
    c: {
      PlayerBase: {
        b: 'ManBase',
        d: '4_world',
        m: { OnJumpStart: 'void()', OnStoreLoad: 'bool(ParamsReadContext, int)', Gone: 'void()' },
      },
      ManBase: { b: '', d: '4_world', m: { EEInit: 'void()' } },
      Deleted: { b: '', d: '4_world', m: { X: 'void()' } },
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
  }], index, prior);
  const by = (method) => rows.find((r) => r.method === method);
  assert.equal(by('OnJumpStart').status, 'ok');
  assert.equal(by('OnStoreLoad').status, 'sig');
  assert.equal(by('Gone').status, 'missing-method');
  assert.equal(by('EEInit').status, 'ok');
  assert.equal(by('EEInit').owner, 'ManBase');
  assert.ok(rows.some((r) => r.status === 'missing-class' && r.cls === 'Deleted'));
});

test('a new mod class is not wrong-folder just because its base lives elsewhere', () => {
  const index = {
    c: {
      ScriptedWidgetEventHandler: {
        b: 'Managed',
        d: '1_core',
        m: { OnClick: 'bool(Widget, int, int, int)' },
      },
    },
  };
  const rows = analyze([{
    path: 'VPP/5_Mission/GUI/Hud.c',
    text: `
      class VPPAdminHud extends ScriptedWidgetEventHandler {
        override bool OnClick(Widget w, int x, int y, int button) {}
      }
    `,
  }], index);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'ok');
  assert.equal(rows[0].folder, null);
});

test('modded vanilla class in the wrong script module is wrong-folder', () => {
  const index = {
    c: {
      ScriptedWidgetEventHandler: {
        b: 'Managed',
        d: '1_core',
        m: { OnClick: 'bool(Widget, int, int, int)' },
      },
    },
  };
  const rows = analyze([{
    path: 'MyMod/5_Mission/widgets.c',
    text: `
      modded class ScriptedWidgetEventHandler {
        override bool OnClick(Widget w, int x, int y, int button) {}
      }
    `,
  }], index);
  assert.equal(rows[0].status, 'module');
  assert.deepEqual(rows[0].folder, { from: '5_Mission', to: '1_Core' });
});

test('a new mod class does not report method-gone for its own API', () => {
  const index = {
    c: {
      Managed: { b: '', d: '1_core', m: {} },
    },
  };
  const rows = analyze([{
    path: 'CF/1_Core/CF_Base16Stream.c',
    text: `
      class CF_Base16Stream extends Managed {
        override void Append(string data) {}
      }
    `,
  }], index);
  assert.deepEqual(rows, []);
});

test('a new mod class still checks signatures of real vanilla overrides', () => {
  const index = {
    c: {
      ScriptedWidgetEventHandler: {
        b: 'Managed',
        d: '1_core',
        m: { OnClick: 'bool(Widget, int, int, int)' },
      },
    },
  };
  const rows = analyze([{
    path: 'VPP/5_Mission/GUI/Hud.c',
    text: `
      class VPPAdminHud extends ScriptedWidgetEventHandler {
        override bool OnClick(Widget w, int x, int y) {}
      }
    `,
  }], index);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'sig');
  assert.equal(rows[0].cls, 'VPPAdminHud');
});

test('mod overload sharing a vanilla method name is not params-changed', () => {
  const index = {
    c: {
      ScriptedWidgetEventHandler: {
        b: 'Managed',
        d: '1_core',
        m: { OnUpdate: 'bool(Widget)', OnClick: 'bool(Widget, int, int, int)' },
      },
    },
  };
  const rows = analyze([
    {
      path: 'VPP/AdminHudSubMenu.c',
      text: `
        class AdminHudSubMenu extends ScriptedWidgetEventHandler {
          override bool OnUpdate(Widget w) {}
          override bool OnClick(Widget w, int x, int y, int button) {}
        }
      `,
    },
    {
      path: 'VPP/Example.c',
      text: `
        class CustomSubMenu extends AdminHudSubMenu {
          override void OnUpdate(float timeslice) {}
          override bool OnClick(Widget w, int x, int y, int button) {}
        }
      `,
    },
  ], index);
  assert.ok(!rows.some((r) => r.method === 'OnUpdate' && r.status === 'sig'));
  assert.equal(rows.find((r) => r.cls === 'CustomSubMenu' && r.method === 'OnClick')?.status, 'ok');
});

test('modded class declared in the same mod is not class-gone', () => {
  const index = { c: { Managed: { b: '', d: '1_core', m: {} } } };
  const rows = analyze([
    {
      path: 'VPP/5_Mission/Hud.c',
      text: 'class VPPAdminHud extends Managed { void Init() {} };',
    },
    {
      path: 'VPP/5_Mission/HudMod.c',
      text: 'modded class VPPAdminHud { override void Init() {} };',
    },
  ], index, { c: {} });
  assert.ok(!rows.some((r) => r.status === 'missing-class'));
});

test('modded class that never existed in DayZ is not class-gone when prior is known', () => {
  const index = { c: { Managed: { b: '', d: '1_core', m: {} } } };
  const prior = { c: { Managed: { b: '', d: '1_core', m: {} } } };
  const rows = analyze([{
    path: 'VPP/Hud.c',
    text: 'modded class VPPAdminHud { override void Init() {} };',
  }], index, prior);
  assert.ok(!rows.some((r) => r.status === 'missing-class' && r.cls === 'VPPAdminHud'));
});

test('class-gone needs the older build to still have the class', () => {
  const index = { c: { Managed: { b: '', d: '1_core', m: {} } } };
  const withoutPrior = analyze([{
    path: 'VPP/Hud.c',
    text: 'modded class VPPAdminHud { override void Init() {} };',
  }], index, null);
  assert.ok(!withoutPrior.some((r) => r.status === 'missing-class'));

  const newerOnly = analyze([{
    path: 'M/x.c',
    text: 'modded class NewInExp { override void X() {} };',
  }], index, { c: { NewInExp: { b: '', d: '4_world', m: { X: 'void()' } } } });
  // prior has it + index lacks it → gone (caller must pass an older prior)
  assert.ok(newerOnly.some((r) => r.status === 'missing-class' && r.cls === 'NewInExp'));
});

test('mod-prefixed methods on vanilla classes are not method-gone', () => {
  const index = {
    c: { MissionGameplay: { b: '', d: '5_mission', m: { OnInit: 'void()' } } },
  };
  const prior = {
    c: { MissionGameplay: { b: '', d: '5_mission', m: { OnInit: 'void()' } } },
  };
  const rows = analyze([{
    path: 'VPP/mission.c',
    text: 'modded class MissionGameplay { override void VPPAT_AdminToolsToggled() {} };',
  }], index, prior);
  assert.deepEqual(rows, []);
});

test('methods that exist only in a newer build are not method-gone without an older prior', () => {
  const launched = {
    c: { PlayerBase: { b: '', d: '4_world', m: { OnJumpStart: 'void()' } } },
  };
  const experimental = {
    c: { PlayerBase: { b: '', d: '4_world', m: { OnJumpStart: 'void()', StopAllMovement: 'void()' } } },
  };
  // Comparing Latest: no older baseline → stay quiet on experimental-only APIs.
  const vsLaunched = analyze([{
    path: 'M/4_World/p.c',
    text: 'modded class PlayerBase { override void StopAllMovement() {} };',
  }], launched, null);
  assert.deepEqual(vsLaunched, []);

  // Comparing Experimental with Latest as prior: still not gone (method is new).
  const vsExp = analyze([{
    path: 'M/4_World/p.c',
    text: 'modded class PlayerBase { override void StopAllMovement() {} };',
  }], experimental, launched);
  assert.equal(vsExp[0].status, 'ok');
});

test('mod.cpp is the launcher card, not a script', () => {
  assert.deepEqual(readModCpp('name = "Hats";\nauthor = "Ada";\nversion = "1.2";\ntooltip = "Warm hats";\n'), {
    name: 'Hats', author: 'Ada', authorID: '', version: '1.2', overview: '', tooltip: 'Warm hats',
    action: '', actionName: '',
  });
});

test('stringtable.csv resolves #STR_ and $STR_ card fields', () => {
  const table = readStringtable(`"Language","original","english","german"
"STR_VPPAT_NAME","VPP Admin Tools","VPP Admin Tools","VPP Admin-Werkzeuge"
"STR_VPPAT_DESC","Tools for admins","Tools for admins","Werkzeuge"
`);
  assert.equal(resolveStr('#STR_VPPAT_NAME', table), 'VPP Admin Tools');
  assert.equal(resolveStr('$STR_VPPAT_DESC', table), 'Tools for admins');
  assert.equal(resolveStr('Plain name', table), 'Plain name');
  assert.equal(resolveStr('#STR_MISSING', table), '#STR_MISSING');
});

test('config.cpp yields credits and inputs for the card', () => {
  assert.deepEqual(readCfgMods('credits = "Ada, Bea";\ninputs = "Hats/data/Inputs.xml";\nauthor = "Ada";\n'), {
    name: '', author: 'Ada', authorID: '', version: '', overview: '', action: '',
    credits: 'Ada, Bea', inputs: 'Hats/data/Inputs.xml',
  });
});

test('action URL labels and workshop ids match real mods', () => {
  assert.equal(actionLinkLabel('https://github.com/Arkensor/DayZ-CommunityFramework', ''), 'GitHub');
  assert.equal(actionLinkLabel('https://discord.gg/redcedar', ''), 'Discord');
  assert.equal(actionLinkLabel('https://discord.dayzvpp.com', 'Discord'), 'Discord');
  assert.equal(actionLinkLabel('https://example.com', ''), 'Website');
  assert.equal(workshopFromUrl('https://steamcommunity.com/sharedfiles/filedetails/?id=2095880869'), '2095880869');
  assert.equal(workshopFromUrl('https://github.com/x'), '');
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
