// Runs Tailwind CSS watch and the dev server together.
// `npm run dev` / `pnpm dev` points here so a single Ctrl-C stops both children.

import { spawn } from 'node:child_process';

const shell = process.platform === 'win32';
const TW = ['tailwindcss', '-i', './site/styles.css', '-o', './.cache/styles.css'];
const SERVER = [
  'node',
  '--watch',
  '--watch-preserve-output',
  '--watch-path=src',
  '--watch-path=site',
  '--watch-path=data/release-notes.json',
  '--watch-path=.cache/styles.css',
  'src/dev.js',
];

const children = [];

function run(cmd, args) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell });
  children.push(child);
  child.on('exit', (code, signal) => {
    for (const c of children) {
      if (c !== child && !c.killed) c.kill(signal || 'SIGTERM');
    }
    process.exit(code ?? (signal ? 1 : 0));
  });
}

function shutdown(signal) {
  for (const c of children) {
    if (!c.killed) c.kill(signal);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

run(TW[0], [...TW.slice(1), '--watch']);
run(SERVER[0], SERVER.slice(1));
