/**
 * Deterministic allowlist publish artifact builder (cross-platform).
 * Same contract as prepare-publish.ps1. Does NOT deploy.
 *
 *   node scripts/prepare-publish.mjs
 */
import {
  copyFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.publish');

const ALLOWLIST = [
  'index.html',
  'mathout/privacy/index.html',
  'sestava/index.html',
  'sestava/privacy/index.html',
  'sestava/support/index.html',
  'sestava/delete-account/index.html',
  'sestava/assets/config.js',
  'sestava/assets/delete-account.js',
  'sestava/assets/sestava.css',
];

function walk(dir, base = dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, base, acc);
    else acc.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return acc;
}

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const rel of ALLOWLIST) {
  const src = path.join(root, ...rel.split('/'));
  if (!existsSync(src)) throw new Error('Allowlist source missing: ' + rel);
  const dest = path.join(out, ...rel.split('/'));
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

writeFileSync(path.join(out, 'PUBLISH_MANIFEST.txt'), ALLOWLIST.join('\n') + '\n', 'utf8');

const files = walk(out);
const publicFiles = files.filter((f) => f !== 'PUBLISH_MANIFEST.txt');
if (publicFiles.length !== ALLOWLIST.length) {
  throw new Error(`file count ${publicFiles.length} != ${ALLOWLIST.length}`);
}

for (const f of publicFiles) {
  if (!ALLOWLIST.includes(f)) throw new Error('Unexpected: ' + f);
  if (/(^|\/)(docs|scripts|_local)(\/|$)/i.test(f)) throw new Error('Excluded: ' + f);
  if (/config\.local/i.test(f) || /mock/i.test(f) || /\.test\.mjs$/i.test(f)) {
    throw new Error('Excluded: ' + f);
  }
  const text = readFileSync(path.join(out, ...f.split('/')), 'utf8');
  if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\./.test(text)) {
    throw new Error('JWT-like in ' + f);
  }
  if (/service_role\s*[:=]/i.test(text)) throw new Error('service_role in ' + f);
  if (/sb_secret|SUPABASE_SERVICE_ROLE/i.test(text)) throw new Error('privileged marker in ' + f);
}

const cfg = readFileSync(path.join(out, 'sestava', 'assets', 'config.js'), 'utf8');
if (!/deletionEnabled:\s*false/.test(cfg)) throw new Error('deletion not fail-closed');
if (!/productionEnabled:\s*false/.test(cfg)) throw new Error('production not false');
if (!/environment:\s*"disabled"/.test(cfg)) throw new Error('environment not disabled');
if (/supabaseUrl:\s*"https:\/\//.test(cfg)) throw new Error('live URL in config');

console.log('OK .publish (' + publicFiles.length + ' files + manifest)');
console.log('NOTE: .publish alone does not change GitHub Pages source.');
