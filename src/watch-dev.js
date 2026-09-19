// Runs Tailwind CSS watch and the dev server together.
// `npm run dev` points here so a single Ctrl-C stops both children.

import { spawn, spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const build = spawnSync(npm, ['run', 'css:build'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

const children = [];

function run(script) {
  const child = spawn(npm, ['run', script], { stdio: 'inherit' });
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

run('css:watch');
run('dev:server');
