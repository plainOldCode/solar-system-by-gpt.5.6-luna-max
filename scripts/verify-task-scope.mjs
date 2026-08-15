import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = process.env.SCOPE_BASE ?? 'HEAD';
const allowedPrefixes = ['scripts/', 'tests/', 'evidence/', 'src/main.ts', 'src/ui/bootstrap.ts'];
const generatedValidationPrefixes = ['dist/', 'node_modules/'];

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function pathFromStatusLine(line) {
  let value = line.slice(3).trim();
  if (value.startsWith('"')) {
    try {
      value = JSON.parse(value);
    } catch {
      value = value.replaceAll('"', '');
    }
  }
  if (value.includes(' -> ')) {
    value = value.split(' -> ').at(-1);
  }
  return value;
}

function isAllowed(filePath) {
  return allowedPrefixes.some((prefix) => prefix.endsWith('/') ? filePath.startsWith(prefix) : filePath === prefix);
}

function isGeneratedValidationArtifact(filePath) {
  return generatedValidationPrefixes.some((prefix) => filePath.startsWith(prefix));
}

const statusLines = git(['status', '--short']).split('\n').filter(Boolean);
const statusPaths = statusLines.map(pathFromStatusLine);
const changedFromBase = git(['diff', '--name-only', base]).split('\n').filter(Boolean);
const stagedPaths = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
const allObservedPaths = [...new Set([...statusPaths, ...changedFromBase, ...stagedPaths])];
const forbiddenPaths = allObservedPaths.filter((filePath) => !isAllowed(filePath) && !isGeneratedValidationArtifact(filePath));
const generatedValidationArtifacts = allObservedPaths.filter(isGeneratedValidationArtifact);
const taskOwnedPaths = allObservedPaths.filter(isAllowed);

const report = {
  generatedAt: new Date().toISOString(),
  base,
  head: git(['rev-parse', 'HEAD']),
  statusLines,
  changedFromBase,
  stagedPaths,
  taskOwnedPaths,
  generatedValidationArtifacts,
  forbiddenPaths,
  allowedPrefixes,
  generatedValidationPrefixes,
  passed: forbiddenPaths.length === 0,
};

if (process.env.SCOPE_OUTPUT) {
  const outputPath = path.resolve(root, process.env.SCOPE_OUTPUT);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify(report, null, 2));
if (!report.passed) {
  process.exitCode = 1;
}
