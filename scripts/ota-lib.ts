/**
 * Pure helpers for scripts/ota.ts (argument parsing, fingerprint drift, EAS
 * CLI output parsing). Kept apart so vitest can run them without a shell.
 */

export type OtaOptions = {
  message: string;
  channel: string;
  environment: string;
  critical: boolean;
  /** 1–100; undefined publishes to everyone at once. */
  rollout?: number;
  yes: boolean;
  skipChecks: boolean;
  allowNativeDiff: boolean;
};

export const OTA_USAGE = `Publish an over-the-air update (EAS Update, iOS). Runbook: docs/ship/ota-updates.md

  npm run ota -- -m "Fix the review crash" [options]

Options:
  -m, --message <text>     What the update fixes (required)
  --critical               Offer users an immediate restart instead of waiting
                           for their next cold launch
  --channel <name>         Default: production
  --environment <name>     EAS environment for env vars. Default: production for
                           the production channel, preview otherwise
  --rollout <1-100>        Serve the update to this percentage of users first
  --yes                    Skip the final confirmation
  --skip-checks            Skip typecheck, lint and unit tests (emergencies only)
  --allow-native-diff      Publish even though the native fingerprint differs
                           from the target build (almost never right)
  -h, --help               Show this help`;

export function parseOtaArgs(argv: readonly string[]): OtaOptions | { error: string } | 'help' {
  let message: string | undefined;
  let channel = 'production';
  let environment: string | undefined;
  let rollout: number | undefined;
  let critical = false;
  let yes = false;
  let skipChecks = false;
  let allowNativeDiff = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) return undefined;
      i++;
      return next;
    };
    switch (arg) {
      case '-h':
      case '--help':
        return 'help';
      case '-m':
      case '--message':
        message = value();
        if (!message) return { error: `${arg} needs a value` };
        break;
      case '--channel': {
        const v = value();
        if (!v) return { error: '--channel needs a value' };
        channel = v;
        break;
      }
      case '--environment': {
        const v = value();
        if (!v) return { error: '--environment needs a value' };
        environment = v;
        break;
      }
      case '--rollout': {
        const v = value();
        const n = Number(v);
        if (!v || !Number.isInteger(n) || n < 1 || n > 100) {
          return { error: '--rollout needs a whole number from 1 to 100' };
        }
        rollout = n;
        break;
      }
      case '--critical':
        critical = true;
        break;
      case '--yes':
        yes = true;
        break;
      case '--skip-checks':
        skipChecks = true;
        break;
      case '--allow-native-diff':
        allowNativeDiff = true;
        break;
      default:
        return { error: `Unknown argument: ${arg}` };
    }
  }

  if (!message?.trim()) return { error: 'A message is required: -m "What this update fixes"' };
  return {
    message: message.trim(),
    channel,
    environment: environment ?? (channel === 'production' ? 'production' : 'preview'),
    critical,
    rollout: rollout === 100 ? undefined : rollout,
    yes,
    skipChecks,
    allowNativeDiff,
  };
}

/**
 * EAS CLI `--json` output sometimes starts with a log line on stdout (seen
 * with fingerprint:compare: "Environment variables … loaded …"). Parse from
 * the first bracket instead of trusting the whole stream.
 */
export function parseCliJson(raw: string): unknown {
  const start = raw.search(/[[{]/);
  if (start < 0) throw new Error('No JSON in EAS CLI output');
  return JSON.parse(raw.slice(start));
}

type FingerprintSource = {
  type: string;
  filePath?: string;
  id?: string;
  hash: string | null;
};
export type Fingerprint = { hash: string; sources: FingerprintSource[] };

/**
 * Generated native folders. Meno is CNG: ios/ and android/ are gitignored
 * prebuild output, present on one machine and absent on the next, so their
 * presence says nothing about the native code a build contains.
 */
const GENERATED = /^(ios|android)(\/|$)/;

function sourceKey(s: FingerprintSource): string {
  return s.filePath ?? s.id ?? `${s.type}:?`;
}

/**
 * What differs between a build's native fingerprint and the local project's,
 * ignoring generated native folders. Empty means the update's JS runs on
 * exactly the native code that build shipped.
 */
export function fingerprintDrift(build: Fingerprint, local: Fingerprint): string[] {
  const relevant = (f: Fingerprint) =>
    new Map(
      f.sources.filter((s) => !GENERATED.test(sourceKey(s))).map((s) => [sourceKey(s), s.hash]),
    );
  const before = relevant(build);
  const after = relevant(local);
  const drift: string[] = [];
  for (const [key, hash] of after) {
    if (!before.has(key)) drift.push(`added    ${key}`);
    else if (before.get(key) !== hash) drift.push(`changed  ${key}`);
  }
  for (const key of before.keys()) if (!after.has(key)) drift.push(`removed  ${key}`);
  return drift.sort((a, b) => a.slice(9).localeCompare(b.slice(9)));
}

/** fingerprint:compare --build-id prints the build as fingerprint1, the project as fingerprint2. */
export function readComparison(json: unknown): { build: Fingerprint; local: Fingerprint } {
  const j = json as { fingerprint1?: Fingerprint; fingerprint2?: Fingerprint };
  if (!j?.fingerprint1?.sources || !j?.fingerprint2?.sources) {
    throw new Error('Unexpected fingerprint:compare output');
  }
  return { build: j.fingerprint1, local: j.fingerprint2 };
}
