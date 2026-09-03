import { spawn } from 'node:child_process';
import { cp, mkdir } from 'node:fs/promises';

const standaloneDir = '.next/standalone';

const build = spawn('pnpm', ['build'], { stdio: 'inherit' });
const buildExitCode = await new Promise((resolve) => {
  build.on('exit', (code) => resolve(code ?? 1));
});
if (buildExitCode !== 0) {
  process.exit(buildExitCode);
}

await mkdir(`${standaloneDir}/.next`, { recursive: true });
await cp('public', `${standaloneDir}/public`, { recursive: true, force: true });
await cp('.next/static', `${standaloneDir}/.next/static`, { recursive: true, force: true });

const server = spawn(process.execPath, ['server.js'], {
  cwd: standaloneDir,
  env: {
    ...process.env,
    HOSTNAME: '127.0.0.1',
    PORT: '4174',
  },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}

server.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
