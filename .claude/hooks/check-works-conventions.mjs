#!/usr/bin/env node
// PostToolUse hook (Edit|Write): checks a works/*.html page against the repo's
// conventions after Claude edits it. Report only — never modifies any file.
//
// Exit 0 silently when the file is not a works/ page or passes every check.
// Exit 2 with one line per problem on stderr otherwise (Claude sees stderr
// only on exit 2).

import { readFileSync } from 'node:fs';
import path from 'node:path';

const REQUIRED_OG = ['og:title', 'og:description', 'og:image', 'og:url'];
const BEACON_START = '<!-- visit-beacon:start -->';
const BEACON_END = '<!-- visit-beacon:end -->';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0); // unparseable payload: nothing to check
}

const filePath = input?.tool_input?.file_path;
if (typeof filePath !== 'string' || !filePath.toLowerCase().endsWith('.html')) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const abs = path.resolve(root, filePath);
const rel = path.relative(root, abs).split(path.sep).join('/');
if (!rel.startsWith('works/')) process.exit(0);

let html;
try {
  html = readFileSync(abs, 'utf8');
} catch {
  process.exit(0); // file gone or unreadable: not a conventions problem
}

// Collect og:* meta tags regardless of attribute order, quote style, or
// property= vs name=. Commented-out tags don't count.
const live = html.replace(/<!--[\s\S]*?-->/g, '');
const og = new Map();
for (const [tag] of live.matchAll(/<meta\b[^>]*>/gi)) {
  const attr = (name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  const key = attr('property') || attr('name');
  const content = attr('content');
  if (!key) continue;
  const k = (key[1] ?? key[2]).trim().toLowerCase();
  if (!og.has(k)) og.set(k, content ? (content[1] ?? content[2]).trim() : '');
}

const problems = [];
for (const k of REQUIRED_OG) {
  if (!og.has(k)) problems.push(`missing <meta property="${k}">`);
  else if (!og.get(k)) problems.push(`<meta property="${k}"> has an empty content attribute`);
}
const img = og.get('og:image');
if (img && !/^https:\/\/\S+$/i.test(img)) {
  problems.push(`og:image must be an absolute https:// URL (got "${img}")`);
}

const start = html.indexOf(BEACON_START);
const end = html.indexOf(BEACON_END);
if (start === -1 || end === -1 || end < start) {
  problems.push(`missing visit-beacon block (${BEACON_START} … ${BEACON_END}); copy it from another works/ page to just before </body>`);
}

if (problems.length) {
  for (const p of problems) process.stderr.write(`${rel}: ${p}\n`);
  process.exit(2);
}
process.exit(0);
