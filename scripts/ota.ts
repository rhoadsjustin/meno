/**
 * Publishes an over-the-air update (EAS Update) for iOS, with the checks that
 * keep a fast fix from turning into a broken app. Runbook:
 * docs/ship/ota-updates.md.
 *
 *   npm run ota -- -m "Fix the review crash"
 *   npm run ota -- -m "Fix the review crash" --critical
 *   npm run ota -- --help
 *
 * Before publishing it:
 *   1. refuses a dirty working tree (eas update bundles the files on disk,
 *      committed or not — and other sessions leave edits in checkouts),
 *   2. runs typecheck, lint and unit tests,
 *   3. finds the finished build on the channel at this runtime version (the
 *      app version) and refuses when there is none — nobody would get it,
 *   4. compares that build's native fingerprint with this tree's and refuses
 *      on drift: JS that expects native code the build lacks crashes there,
 *   5. lists the commits going out on top of that build, and asks.
 */
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

import {
  fingerprintDrift,
  OTA_USAGE,
  parseCliJson,
  parseOtaArgs,
  readComparison,
  type OtaOptions,
} from './ota-lib';

const EAS = ['--yes', 'eas-cli@latest'];

type Build = {
  id: string;
  appVersion?: string;
  appBuildVersion?: string;
  gitCommitHash?: string;
  createdAt?: string;
};

function fail(message: string): never {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function step(message: string) {
  console.log(`\n▸ ${message}`);
}

/** Runs a command, streaming its output. */
function run(cmd: string, args: string[], options: SpawnSyncOptions = {}): number {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  return result.status ?? 1;
}

/** Runs a command and returns stdout; stderr streams through for progress. */
function capture(cmd: string, args: string[], options: SpawnSyncOptions = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  return { status: result.status ?? 1, stdout: String(result.stdout ?? '') };
}

function git(...args: string[]) {
  return capture('git', args, { stdio: ['ignore', 'pipe', 'ignore'] });
}

/** The env every EAS call sees. Never the critical flag: it changes the app config. */
function baseEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.MENO_UPDATE_PRIORITY;
  delete env.APP_VARIANT;
  return env;
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(`${question} `)).trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

function requireCleanTree() {
  step('Working tree');
  const status = git('status', '--porcelain');
  if (status.status !== 0) fail('Not a git checkout.');
  if (status.stdout.trim()) {
    console.log(status.stdout.trimEnd());
    fail(
      'Uncommitted changes. eas update bundles whatever is on disk, so they would ship.\n' +
        '  Commit them (or publish from a clean worktree) and try again.',
    );
  }
  const head = git('log', '-1', '--format=%h %s').stdout.trim();
  const onRemote = git('branch', '-r', '--contains', 'HEAD').stdout.trim();
  console.log(`  clean at ${head}`);
  if (!onRemote) console.log('  ⚠ HEAD is not on GitHub yet. Push it so the update can be traced.');
}

function readRuntimeVersion(): string {
  step('Runtime version');
  const config = capture('npx', ['expo', 'config', '--type', 'public', '--json'], {
    env: baseEnv(),
  });
  if (config.status !== 0) fail('Could not read the app config.');
  const { version, runtimeVersion } = parseCliJson(config.stdout) as {
    version?: string;
    runtimeVersion?: unknown;
  };
  const policy = (runtimeVersion as { policy?: string } | undefined)?.policy;
  if (policy !== 'appVersion' || !version) {
    fail(`Expected runtimeVersion { policy: 'appVersion' } and a version in app.config.ts.`);
  }
  console.log(`  ${version} (appVersion policy)`);
  return version;
}

function runChecks(options: OtaOptions) {
  if (options.skipChecks) {
    step('Checks skipped (--skip-checks)');
    return;
  }
  for (const script of ['typecheck', 'lint', 'test']) {
    step(`npm run ${script}`);
    if (run('npm', ['run', script]) !== 0) fail(`npm run ${script} failed.`);
  }
}

function findTargetBuild(options: OtaOptions, runtime: string): Build {
  step(`Latest finished ${options.channel} build at runtime ${runtime}`);
  const list = capture(
    'npx',
    [
      ...EAS,
      'build:list',
      '--platform',
      'ios',
      '--channel',
      options.channel,
      '--runtime-version',
      runtime,
      '--status',
      'finished',
      '--limit',
      '1',
      '--json',
      '--non-interactive',
    ],
    { env: baseEnv() },
  );
  if (list.status !== 0) fail('eas build:list failed (signed in? `npx eas-cli whoami`).');
  const builds = parseCliJson(list.stdout) as Build[];
  const build = builds[0];
  if (!build) {
    fail(
      `No finished iOS build on "${options.channel}" at runtime ${runtime}, so nobody would ` +
        'receive this update.\n  Ship a build first, or check `version` in app.config.ts.',
    );
  }
  console.log(
    `  ${build.appVersion} (${build.appBuildVersion}) · ${build.id}` +
      (build.gitCommitHash ? ` · commit ${build.gitCommitHash.slice(0, 7)}` : ''),
  );
  return build;
}

async function checkNativeFingerprint(options: OtaOptions, build: Build) {
  step('Native fingerprint against that build');
  const compare = capture(
    'npx',
    [
      ...EAS,
      'fingerprint:compare',
      '--build-id',
      build.id,
      '--environment',
      options.environment,
      '--json',
      '--non-interactive',
    ],
    { env: baseEnv() },
  );
  let drift: string[];
  try {
    if (compare.status !== 0) throw new Error(`exit ${compare.status}`);
    const { build: built, local } = readComparison(parseCliJson(compare.stdout));
    drift = fingerprintDrift(built, local);
  } catch (err) {
    console.log(`  ⚠ Could not compare fingerprints (${(err as Error).message}).`);
    if (
      !options.allowNativeDiff &&
      !(await confirm('  Publish without the native check? (yes/no)'))
    ) {
      fail('Stopped before publishing.');
    }
    return;
  }
  if (drift.length === 0) {
    console.log('  matches: this update runs on exactly the native code that build shipped');
    return;
  }
  console.log(drift.map((line) => `  ${line}`).join('\n'));
  if (options.allowNativeDiff) {
    console.log('  ⚠ Native drift accepted (--allow-native-diff).');
    return;
  }
  fail(
    'Native code or native config differs from the build users have. JS that relies on\n' +
      '  it would crash there. Bump `version` in app.config.ts and ship a build instead.\n' +
      '  (If every line above is truly not native, rerun with --allow-native-diff.)',
  );
}

function showOutgoingCommits(build: Build) {
  if (!build.gitCommitHash) return;
  step('Commits going out on top of that build');
  const base = build.gitCommitHash;
  if (git('cat-file', '-e', `${base}^{commit}`).status !== 0) {
    console.log(`  ⚠ The build's commit ${base.slice(0, 7)} isn't in this clone (git fetch?).`);
    return;
  }
  if (git('merge-base', '--is-ancestor', base, 'HEAD').status !== 0) {
    console.log(
      `  ⚠ HEAD does not contain the build's commit ${base.slice(0, 7)}. The update replaces\n` +
        "    that build's JS with this tree's: anything on the build's branch but not here goes away.",
    );
    return;
  }
  const commits = git('log', '--oneline', '--no-merges', `${base}..HEAD`).stdout.trim();
  if (!commits) {
    console.log("  none: this tree is the build's own commit");
    return;
  }
  const lines = commits.split('\n');
  console.log(
    lines
      .slice(0, 30)
      .map((l) => `  ${l}`)
      .join('\n'),
  );
  if (lines.length > 30) console.log(`  … and ${lines.length - 30} more`);
}

async function main() {
  const parsed = parseOtaArgs(process.argv.slice(2));
  if (parsed === 'help') {
    console.log(OTA_USAGE);
    return;
  }
  if ('error' in parsed) {
    console.error(`${parsed.error}\n\n${OTA_USAGE}`);
    process.exit(1);
  }
  const options = parsed;

  requireCleanTree();
  const runtime = readRuntimeVersion();
  runChecks(options);
  const build = findTargetBuild(options, runtime);
  await checkNativeFingerprint(options, build);
  showOutgoingCommits(build);

  const priority = options.critical ? 'critical' : 'normal';
  console.log(`
  channel      ${options.channel}
  environment  ${options.environment}
  platform     ios
  runtime      ${runtime}
  priority     ${priority}${options.critical ? ' (users on a tab are offered an immediate restart)' : ' (applies on next cold launch)'}
  rollout      ${options.rollout ? `${options.rollout}%` : 'everyone'}
  message      ${options.message}`);

  if (
    !options.yes &&
    !(await confirm(`\nPublish to ${options.channel}? Type "yes" to continue:`))
  ) {
    fail('Stopped before publishing.');
  }

  step('eas update');
  const args = [
    ...EAS,
    'update',
    '--channel',
    options.channel,
    '--environment',
    options.environment,
    '--platform',
    'ios',
    '--message',
    options.message,
    '--upload-source-maps',
    '--non-interactive',
  ];
  if (options.rollout) args.push('--rollout-percentage', String(options.rollout));
  const status = run('npx', args, {
    env: { ...baseEnv(), MENO_UPDATE_PRIORITY: priority },
  });
  if (status !== 0) fail('eas update failed. Nothing was published if it stopped before upload.');

  console.log(`
✔ Published. On an iPhone with that build:
  - fully close Meno and reopen it (it downloads), then once more (it applies), or
  - open Settings and tap "Restart Meno now" once the update has downloaded.
  The Settings footer then reads "Meno ${runtime}, updated <today>".

  Bad update? npx eas-cli@latest update:rollback  (see docs/ship/ota-updates.md)`);
}

main().catch((err) => fail((err as Error).stack ?? String(err)));
