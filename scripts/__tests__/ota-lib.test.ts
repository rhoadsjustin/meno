import { describe, expect, it } from 'vitest';

import {
  fingerprintDrift,
  parseCliJson,
  parseOtaArgs,
  readComparison,
  type Fingerprint,
} from '../ota-lib';

describe('parseOtaArgs', () => {
  it('defaults to a normal production update for everyone', () => {
    expect(parseOtaArgs(['-m', 'Fix the review crash'])).toEqual({
      message: 'Fix the review crash',
      channel: 'production',
      environment: 'production',
      critical: false,
      rollout: undefined,
      yes: false,
      skipChecks: false,
      allowNativeDiff: false,
    });
  });

  it('reads every flag', () => {
    expect(
      parseOtaArgs([
        '--message',
        'Hotfix',
        '--critical',
        '--channel',
        'e2e-test',
        '--environment',
        'development',
        '--rollout',
        '25',
        '--yes',
        '--skip-checks',
        '--allow-native-diff',
      ]),
    ).toEqual({
      message: 'Hotfix',
      channel: 'e2e-test',
      environment: 'development',
      critical: true,
      rollout: 25,
      yes: true,
      skipChecks: true,
      allowNativeDiff: true,
    });
  });

  it('uses the preview environment off the production channel', () => {
    const parsed = parseOtaArgs(['-m', 'x', '--channel', 'e2e-test']);
    expect(parsed).toMatchObject({ environment: 'preview' });
  });

  it('treats a 100% rollout as no rollout', () => {
    expect(parseOtaArgs(['-m', 'x', '--rollout', '100'])).toMatchObject({ rollout: undefined });
  });

  it('requires a message', () => {
    expect(parseOtaArgs([])).toEqual({ error: expect.stringContaining('message is required') });
    expect(parseOtaArgs(['-m', '   '])).toEqual({
      error: expect.stringContaining('message is required'),
    });
    expect(parseOtaArgs(['-m', '--critical'])).toEqual({ error: '-m needs a value' });
  });

  it('rejects bad values and unknown flags', () => {
    expect(parseOtaArgs(['-m', 'x', '--rollout', '0'])).toHaveProperty('error');
    expect(parseOtaArgs(['-m', 'x', '--rollout', '12.5'])).toHaveProperty('error');
    expect(parseOtaArgs(['-m', 'x', '--rollout'])).toHaveProperty('error');
    expect(parseOtaArgs(['-m', 'x', '--branch', 'main'])).toEqual({
      error: 'Unknown argument: --branch',
    });
  });

  it('answers help', () => {
    expect(parseOtaArgs(['--help'])).toBe('help');
    expect(parseOtaArgs(['-m', 'x', '-h'])).toBe('help');
  });
});

describe('parseCliJson', () => {
  it('skips a log line ahead of the JSON', () => {
    const raw = 'Environment variables … loaded from the "production" environment.\n\n{"a":1}';
    expect(parseCliJson(raw)).toEqual({ a: 1 });
    expect(parseCliJson('[{"id":"b"}]')).toEqual([{ id: 'b' }]);
  });

  it('throws when there is no JSON', () => {
    expect(() => parseCliJson('nothing here')).toThrow();
  });
});

describe('fingerprintDrift', () => {
  const fp = (sources: Fingerprint['sources']): Fingerprint => ({ hash: 'h', sources });
  const build = fp([
    { type: 'dir', filePath: 'node_modules/expo-widgets/ios', hash: 'w1' },
    { type: 'contents', id: 'expoConfig', hash: 'c1' },
    { type: 'dir', filePath: 'ios', hash: 'generated' },
    { type: 'file', filePath: 'eas.json', hash: 'e1' },
  ]);

  it('is empty when only generated native folders differ', () => {
    const local = fp([
      { type: 'dir', filePath: 'node_modules/expo-widgets/ios', hash: 'w1' },
      { type: 'contents', id: 'expoConfig', hash: 'c1' },
      { type: 'file', filePath: 'eas.json', hash: 'e1' },
      { type: 'file', filePath: 'android/app/build.gradle', hash: 'g' },
    ]);
    expect(fingerprintDrift(build, local)).toEqual([]);
  });

  it('reports added, changed and removed native sources', () => {
    const local = fp([
      { type: 'dir', filePath: 'node_modules/expo-updates/ios', hash: 'u1' },
      { type: 'contents', id: 'expoConfig', hash: 'c2' },
      { type: 'file', filePath: 'eas.json', hash: 'e1' },
    ]);
    expect(fingerprintDrift(build, local)).toEqual([
      'changed  expoConfig',
      'added    node_modules/expo-updates/ios',
      'removed  node_modules/expo-widgets/ios',
    ]);
  });
});

describe('readComparison', () => {
  it('maps fingerprint1 to the build and fingerprint2 to the project', () => {
    const one = { hash: '1', sources: [] };
    const two = { hash: '2', sources: [] };
    expect(readComparison({ fingerprint1: one, fingerprint2: two })).toEqual({
      build: one,
      local: two,
    });
  });

  it('throws on an unexpected shape', () => {
    expect(() => readComparison({ hash: 'x' })).toThrow();
  });
});
