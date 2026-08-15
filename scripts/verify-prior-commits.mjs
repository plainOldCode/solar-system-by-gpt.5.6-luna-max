import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const commits = [
  {
    task: 'task-01 scaffold/data/scales',
    hash: 'df2d1c79408a290f173f520abf6d92b058f07349',
    evidence: 'evidence/task-01-scaffold-validation.md',
    allowed: ['README.md', 'docs/', 'evidence/task-01-scaffold-validation.md', 'index.html', 'package.json', 'package-lock.json', 'src/data/', 'src/scales/', 'src/types/', 'tsconfig.json', 'vite.config.ts'],
  },
  {
    task: 'task-02 scene/core',
    hash: 'fc30167cbd03a92b1fc6ad7973293b16c5ae1cdc',
    evidence: 'evidence/task-02-scene-validation.md',
    allowed: ['evidence/task-02-scene-validation.md', 'src/main.ts', 'src/rendering/', 'src/scene/', 'src/simulation/'],
  },
  {
    task: 'task-03 UI integration history',
    hash: '27306450721479e171350d00ab423be14e34484f',
    evidence: 'evidence/task-03-ui-validation.md',
    allowed: ['src/ui/'],
  },
  {
    task: 'task-03 UI hardening',
    hash: '7a48262bb58577f72e9e03aa7bc178c21cac1d1c',
    evidence: 'evidence/task-03-ui-validation.md',
    allowed: ['evidence/task-03-ui-validation.md', 'src/styles/', 'src/ui/'],
  },
  {
    task: 'task-03 UI validation evidence',
    hash: '91e919908cf19e319108304ad36dcb75c053f95d',
    evidence: 'evidence/task-03-ui-validation.md',
    allowed: ['evidence/task-03-ui-validation.md', 'src/styles/', 'src/ui/'],
  },
  {
    task: 'task-03 UI live state',
    hash: '5290eb15098817f7b9811ca46ff06551a44c784a',
    evidence: 'evidence/task-03-ui-validation.md',
    allowed: ['src/styles/', 'src/ui/'],
  },
  {
    task: 'task-03 browser entry/evidence',
    hash: 'c24ce1155486d42d10d5579c9e1cd0507a2207e8',
    evidence: 'evidence/task-03-ui-validation.md',
    allowed: ['evidence/task-03-ui-validation.md', 'index.html'],
  },
  {
    task: 'task-03 final browser-noise fix',
    hash: 'be82344da0b133b666da9ed049c1027b09f82b20',
    evidence: 'evidence/task-03-ui-validation.md',
    allowed: ['evidence/task-03-ui-validation.md', 'index.html'],
  },
];

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function isAllowed(filePath, allowed) {
  return allowed.some((prefix) => prefix.endsWith('/') ? filePath.startsWith(prefix) : filePath === prefix);
}

const results = commits.map((commit) => {
  let type = '';
  let reachable = false;
  let header = [];
  let paths = [];
  let error = undefined;
  try {
    type = git(['cat-file', '-t', commit.hash]);
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', commit.hash, 'HEAD'], { cwd: root, stdio: 'ignore' });
      reachable = true;
    } catch {
      reachable = false;
    }
    header = git(['show', '-s', '--format=%H%n%P%n%an%n%ad%n%s', '--date=iso-strict', commit.hash]).split('\n');
    paths = git(['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', commit.hash]).split('\n').filter(Boolean);
  } catch (cause) {
    error = String(cause);
  }
  const forbiddenPaths = paths.filter((filePath) => !isAllowed(filePath, commit.allowed));
  const evidencePath = path.join(root, commit.evidence);
  const evidencePresent = fs.existsSync(evidencePath);
  const evidenceMentionsScope = evidencePresent && /forbidden[- ]path check/i.test(fs.readFileSync(evidencePath, 'utf8'));
  return {
    task: commit.task,
    expectedHash: commit.hash,
    resolvedHash: header[0] ?? null,
    parent: header[1] ?? null,
    subject: header[4] ?? null,
    type,
    reachableFromHead: reachable,
    changedPaths: paths,
    allowedPaths: commit.allowed,
    forbiddenPaths,
    evidence: { path: commit.evidence, present: evidencePresent, mentionsForbiddenPathCheck: evidenceMentionsScope },
    passed: !error && type === 'commit' && header[0] === commit.hash && reachable && forbiddenPaths.length === 0 && evidencePresent && evidenceMentionsScope,
    ...(error === undefined ? {} : { error }),
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  head: git(['rev-parse', 'HEAD']),
  commits: results,
  passed: results.filter((item) => item.passed).length,
  failed: results.filter((item) => !item.passed).length,
};

if (process.env.PRIOR_COMMITS_OUTPUT) {
  const outputPath = path.resolve(root, process.env.PRIOR_COMMITS_OUTPUT);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify(report, null, 2));
if (report.failed > 0) {
  process.exitCode = 1;
}
