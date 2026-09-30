import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
await mkdir(dist, { recursive: true });
const archive = join(dist, 'iching-appwrite-probe.tar.gz');
const stage = join(dist, 'package');
await mkdir(join(stage, 'src'), { recursive: true });
// Explicit allowlist: never archive .env, local credentials, tests or deployment tooling.
const files = ['package.json', 'src/main.js', 'src/interpret.mjs', 'src/ai-prompt.mjs', 'src/hexagrams.mjs'];
await copyFile(join(root, 'package.json'), join(stage, 'package.json'));
await copyFile(join(root, 'src/main.js'), join(stage, 'src/main.js'));
const interpreter = await readFile(join(root, 'src/interpret.mjs'), 'utf8');
if (!interpreter.includes("'../../../iching/ai-prompt.mjs'")) throw new Error('Unexpected shared prompt import');
await writeFile(join(stage, 'src/interpret.mjs'), interpreter.replace("'../../../iching/ai-prompt.mjs'", "'./ai-prompt.mjs'"));
for (const name of ['ai-prompt.mjs', 'hexagrams.mjs']) {
  await copyFile(fileURLToPath(new URL(`../../../iching/${name}`, import.meta.url)), join(stage, 'src', name));
}
const packed = spawnSync('tar', ['-czf', archive, '-C', stage, ...files], { encoding: 'utf8', windowsHide: true });
if (packed.status !== 0) throw new Error(packed.stderr || packed.error?.message || 'Packaging failed');
const listed = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8', windowsHide: true });
if (listed.status !== 0 || listed.stdout.trim().split(/\r?\n/).sort().join('\n') !== files.sort().join('\n')) {
  throw new Error('Unexpected archive contents');
}
const contents = await readFile(archive);
console.log(JSON.stringify({ archive, bytes: contents.length, files,
  sha256: createHash('sha256').update(contents).digest('hex') }, null, 2));
