#!/usr/bin/env node
/**
 * Captures real API responses from the OneTouchReview Mobile Test business so the app's
 * types are built from actual data instead of guesses.
 *
 *   node scripts/capture-responses.mjs owner
 *   node scripts/capture-responses.mjs staff
 *
 * - Prompts for the test login (password input is hidden). Nothing is saved except responses.
 * - Read-only: only GET requests, plus sign-in, one refresh and sign-out.
 * - Every value whose key contains "token" is redacted before writing.
 * - Output: .api-captures/<label>/*.json  (gitignored — never commit it).
 * - Signs out at the end, so no session is left behind.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import readline from 'node:readline';

const BASE = 'https://api.onetouchreview.com/api/v1';
const TEST_LOCATIONS = [1497, 1498]; // Austin, Dallas (build guide "Test account")
const label = (process.argv[2] || 'owner').replace(/[^a-z0-9_-]/gi, '');
const outDir = join(process.cwd(), '.api-captures', label);

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else rl.output.write('*');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        /token/i.test(k) && typeof v === 'string' ? `<redacted:${v.length} chars>` : redact(v),
      ]),
    );
  }
  return value;
}

/** Finds the first value of `key` anywhere in the body (script-side exploration only). */
function findKey(body, key) {
  if (!body || typeof body !== 'object') return undefined;
  if (key in body) return body[key];
  for (const v of Object.values(body)) {
    const found = findKey(v, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** First array of objects with numeric ids anywhere in the body. */
function firstIdList(body) {
  if (Array.isArray(body) && body.length && typeof body[0]?.id === 'number') return body;
  if (body && typeof body === 'object') {
    for (const v of Object.values(body)) {
      const found = firstIdList(v);
      if (found) return found;
    }
  }
  return undefined;
}

let token = null;
let n = 0;

async function call(name, method, path, { body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _non_json_body: text.slice(0, 500) };
  }
  const keepHeaders = ['retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'content-type'];
  const record = {
    request: { method, path: path, body: body ? redact({ ...body, password: body.password ? '<redacted>' : undefined }) : undefined },
    status: res.status,
    headers: Object.fromEntries(keepHeaders.filter((h) => res.headers.has(h)).map((h) => [h, res.headers.get(h)])),
    body: redact(json),
  };
  n += 1;
  const file = `${String(n).padStart(2, '0')}-${name}.json`;
  await writeFile(join(outDir, file), JSON.stringify(record, null, 2));
  console.log(`${String(res.status).padEnd(4)} ${method.padEnd(6)} ${path}  → ${file}`);
  return { status: res.status, json };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  console.log(`Capturing as "${label}" into ${outDir}`);
  console.log('Use ONLY the OneTouchReview Mobile Test logins.\n');

  const email = await ask('Test login email: ');
  const password = await ask('Test login password: ', { hidden: true });

  await call('app-config', 'GET', '/app-config', { auth: false });
  await call('me-without-token', 'GET', '/auth/me', { auth: false });

  const login = await call('login', 'POST', '/auth/login', {
    auth: false,
    body: { email, password, device_name: 'OTR capture script', platform: 'android' },
  });
  if (login.status !== 200 || typeof login.json?.token !== 'string') {
    console.error('\nSign-in failed; see the login capture. Nothing else was called.');
    return;
  }
  token = login.json.token;

  const me = await call('me', 'GET', '/auth/me');
  if (me.json?.user?.role) console.log(`   role: ${me.json.user.role}`);
  await call('locations', 'GET', '/locations');

  await call('dashboard', 'GET', '/business/dashboard');
  await call('dashboard-all', 'GET', '/business/dashboard?location_id=all');
  for (const id of TEST_LOCATIONS) await call(`dashboard-${id}`, 'GET', `/business/dashboard?location_id=${id}`);
  await call('usage', 'GET', '/analytics/usage');

  const customers = await call('customers', 'GET', '/customers');
  await call('customers-all', 'GET', '/customers?location_id=all');
  for (const id of TEST_LOCATIONS) await call(`customers-${id}`, 'GET', `/customers?location_id=${id}`);
  await call('customers-not-sent', 'GET', '/customers?not_sent=1');
  await call('customers-search', 'GET', '/customers?search=a');

  const cursor = findKey(customers.json, 'next_cursor');
  if (typeof cursor === 'string' && cursor) {
    await call('customers-page-2', 'GET', `/customers?cursor=${encodeURIComponent(cursor)}`);
  }

  const first = firstIdList(customers.json)?.[0];
  if (first) {
    await call('customer', 'GET', `/customers/${first.id}`);
    await call('customer-history', 'GET', `/review-requests?customer_id=${first.id}&include_follow_ups=1`);
    await call('customer-send-attempts', 'GET', `/customers/${first.id}/send-attempts`);
  }
  await call('customer-missing', 'GET', '/customers/999999999');

  const refreshed = await call('refresh', 'POST', '/auth/refresh');
  const newToken = findKey(refreshed.json, 'token');
  if (typeof newToken === 'string' && newToken) token = newToken;

  await call('logout', 'POST', '/auth/logout');
  await call('me-after-logout', 'GET', '/auth/me');
  token = null;

  console.log(`\nDone. ${n} responses in ${outDir}. Tokens are redacted; this folder is gitignored.`);
}

main().catch((error) => {
  console.error('Capture failed:', error.message);
  process.exitCode = 1;
});
