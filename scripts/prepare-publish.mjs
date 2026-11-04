/**
 * Deterministic allowlist publish artifact builder (cross-platform).
 * Same contract as prepare-publish.ps1. Does NOT deploy.
 *
 *   node scripts/prepare-publish.mjs
 *
 * Requires sibling-synced Flutter demo at demo/ (see Sestava tool/sync_demo_to_mmoa_web.ps1).
 */
import {
  copyFileSync,
  cpSync,
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

const ALLOWLIST_FILES = [
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

/** Whole trees copied into the artifact (built Flutter demo). */
const ALLOWLIST_TREES = ['demo'];

function walk(dir, base = dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, base, acc);
    else acc.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return acc;
}

function assertDemoTree(demoRoot) {
  if (!existsSync(path.join(demoRoot, 'index.html'))) {
    throw new Error('demo/index.html missing — sync Flutter build first');
  }
  if (!existsSync(path.join(demoRoot, 'main.dart.js'))) {
    throw new Error('demo/main.dart.js missing — sync Flutter build first');
  }
  const index = readFileSync(path.join(demoRoot, 'index.html'), 'utf8');
  if (!/base href="[^"]*demo\/"/.test(index)) {
    throw new Error('demo/index.html must use a .../demo/ base href');
  }
  const main = readFileSync(path.join(demoRoot, 'main.dart.js'), 'utf8');
  if (!main.includes('demo@sestava.local')) {
    throw new Error('demo build missing demo identity marker');
  }
  if (/https:\/\/[a-z0-9]{10,40}\.supabase\.(co|in)/.test(main)) {
    throw new Error('demo build contains live Supabase project URL');
  }
  if (/sb_secret_[A-Za-z0-9]/i.test(main)) {
    throw new Error('demo build contains sb_secret_ marker');
  }
  if (/SUPABASE_SERVICE_ROLE\s*=/i.test(main)) {
    throw new Error('demo build contains SUPABASE_SERVICE_ROLE assignment');
  }
  if (/eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}/.test(main)) {
    throw new Error('demo build contains JWT-like secret material');
  }
}

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const manifest = [...ALLOWLIST_FILES];

for (const rel of ALLOWLIST_FILES) {
  const src = path.join(root, ...rel.split('/'));
  if (!existsSync(src)) throw new Error('Allowlist source missing: ' + rel);
  const dest = path.join(out, ...rel.split('/'));
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

for (const tree of ALLOWLIST_TREES) {
  const src = path.join(root, tree);
  if (!existsSync(src)) {
    throw new Error(
      `Allowlist tree missing: ${tree}/ — run Sestava tool/sync_demo_to_mmoa_web.ps1 first`,
    );
  }
  assertDemoTree(src);
  const dest = path.join(out, tree);
  cpSync(src, dest, { recursive: true });
  for (const f of walk(dest)) {
    manifest.push(`${tree}/${f}`);
  }
}

writeFileSync(path.join(out, 'PUBLISH_MANIFEST.txt'), manifest.join('\n') + '\n', 'utf8');

const files = walk(out);
const publicFiles = files.filter((f) => f !== 'PUBLISH_MANIFEST.txt');

for (const f of publicFiles) {
  const okFile = ALLOWLIST_FILES.includes(f);
  const okTree = ALLOWLIST_TREES.some((t) => f === t || f.startsWith(`${t}/`));
  if (!okFile && !okTree) throw new Error('Unexpected: ' + f);
  if (/(^|\/)(docs|scripts|_local)(\/|$)/i.test(f)) throw new Error('Excluded: ' + f);
  if (/config\.local/i.test(f) || /mock/i.test(f) || /\.test\.mjs$/i.test(f)) {
    throw new Error('Excluded: ' + f);
  }
  if (/\.env$/i.test(f) || /\.pem$/i.test(f)) throw new Error('Excluded secret path: ' + f);

  // Text scan only for small/medium textual assets (skip canvaskit / huge binaries).
  if (!/\.(html|js|css|json|txt|md)$/i.test(f)) continue;
  const full = path.join(out, ...f.split('/'));
  if (statSync(full).size > 15 * 1024 * 1024) continue;
  if (f.endsWith('main.dart.js')) continue; // already asserted
  const text = readFileSync(full, 'utf8');
  if (/eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}/.test(text)) {
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

console.log('OK .publish (' + publicFiles.length + ' files + manifest, incl. demo/)');
console.log('NOTE: .publish alone does not change GitHub Pages source.');
