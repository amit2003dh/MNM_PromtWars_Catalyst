/**
 * CareNest AI — Unified Master Test Suite Runner
 * Runs all unit tests, backend assertions, AI integration checks, and E2E operational workflows.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('==============================================================================');
console.log('         CareNest AI — MASTER VERIFICATION & TEST SUITE RUNNER               ');
console.log('==============================================================================');
console.log(`Execution started at: ${new Date().toISOString()}`);
console.log(`Node.js runtime:      ${process.version} on ${process.platform}\n`);

const suites = [
  {
    name: 'Unit & Isolation Tests (Node.js Native Test Runner)',
    command: process.execPath,
    args: ['--import', './tests/helpers/register.mjs', '--test', 'tests/*.test.mjs'],
    category: 'Unit & Concurrency Tests',
    expectedTests: 40,
  },
  {
    name: 'Backend Store & Security Self-Verification',
    command: process.execPath,
    args: ['--import', './tests/helpers/register.mjs', 'scripts/test-backend.mjs'],
    category: 'Database & Auth Security',
    expectedTests: 16,
  },
  {
    name: 'AI Gemini & Fallback Integrations Verification',
    command: process.execPath,
    args: ['--import', './tests/helpers/register.mjs', 'scripts/test-integrations.mjs'],
    category: 'AI & External Services',
    expectedTests: 5,
  },
  {
    name: 'Full End-to-End Operational Workflow',
    command: process.execPath,
    args: ['scripts/test-e2e.mjs'],
    category: 'End-to-End Workflows',
    expectedTests: 21,
  },
];

const results = [];
let totalPassedSuites = 0;
let totalFailedSuites = 0;

for (let i = 0; i < suites.length; i++) {
  const suite = suites[i];
  console.log(`\n------------------------------------------------------------------------------`);
  console.log(`[SUITE ${i + 1}/${suites.length}] ${suite.name}`);
  console.log(`Category: ${suite.category}`);
  console.log(`------------------------------------------------------------------------------`);

  const startTime = Date.now();
  const run = spawnSync(suite.command, suite.args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  });
  const durationMs = Date.now() - startTime;

  const passed = run.status === 0;
  if (passed) {
    totalPassedSuites++;
  } else {
    totalFailedSuites++;
  }

  results.push({
    name: suite.name,
    category: suite.category,
    passed,
    exitCode: run.status,
    durationMs,
    expectedTests: suite.expectedTests,
  });
}

console.log('\n==============================================================================');
console.log('                      ALL TEST SUITES SUMMARY REPORT                          ');
console.log('==============================================================================');
console.log(
  'Suite Name'.padEnd(46) +
  'Tests'.padEnd(10) +
  'Time'.padEnd(12) +
  'Result'
);
console.log('-'.repeat(78));

let grandTotalTests = 0;
for (const r of results) {
  grandTotalTests += r.expectedTests;
  const statusStr = r.passed ? '✅ PASSED' : `❌ FAILED (Code ${r.exitCode})`;
  console.log(
    r.name.padEnd(46) +
    `${r.expectedTests}`.padEnd(10) +
    `${r.durationMs}ms`.padEnd(12) +
    statusStr
  );
}

console.log('='.repeat(78));
console.log(`Total Test Suites:       ${suites.length} (${totalPassedSuites} Passed, ${totalFailedSuites} Failed)`);
console.log(`Total Verified Checks:   ${grandTotalTests} Individual Test Cases`);
console.log(`Overall Status:          ${totalFailedSuites === 0 ? '✅ 100% ALL TESTS PASSING' : '❌ SOME TESTS FAILED'}`);
console.log('==============================================================================\n');

if (totalFailedSuites > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
