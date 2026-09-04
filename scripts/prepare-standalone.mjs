import { access, cp, mkdir } from 'node:fs/promises';

// Next standalone excludes public assets by default. Package them without .env
// files, backups, native spikes, or the rest of the source tree.
const standaloneDir = '.next/standalone';
await access(`${standaloneDir}/server.js`);
await mkdir(`${standaloneDir}/.next`, { recursive: true });
await cp('public', `${standaloneDir}/public`, { recursive: true, force: true });
await cp('.next/static', `${standaloneDir}/.next/static`, { recursive: true, force: true });
console.log('Standalone public/static assets prepared.');
