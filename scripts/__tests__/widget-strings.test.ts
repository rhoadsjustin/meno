/**
 * The widget's gallery and Edit Widget strings are written in English in
 * app.config (expo-widgets) and translated in locales/widget/<lang>.json,
 * keyed by the English text (plugins/withWidgetLocalizations). A string edited
 * on one side and not the other silently falls back to English on device.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import config from '../../app.config';

type Param = { title: string; type: string; values?: { name: string }[] };
type Widget = {
  displayName: string;
  description: string;
  ios?: { configuration?: { title?: string; description?: string; parameters?: Record<string, Param> } };
};

const plugins = (config.plugins ?? []).map((p) => (Array.isArray(p) ? p : [p]));
const pluginIndex = (name: string) => plugins.findIndex(([n]) => n === name);
const widgets: Widget[] = plugins[pluginIndex('expo-widgets')][1].widgets;

/** Every user-facing string expo-widgets turns into a localizable Swift literal. */
function sourceStrings(): string[] {
  return widgets.flatMap((w) => {
    const c = w.ios?.configuration;
    if (!c) return [w.description];
    return [
      w.description,
      `${c.title ?? w.displayName} Configuration`,
      ...(c.description ? [c.description] : []),
      ...Object.values(c.parameters ?? {}).flatMap((p) => [p.title, ...(p.values ?? []).map((v) => v.name)]),
    ];
  });
}

const dir = join(__dirname, '..', '..', 'locales', 'widget');
const languages = readdirSync(dir).map((f) => f.replace(/\.json$/, ''));

describe('widget extension strings', () => {
  it('are localized by a plugin listed before expo-widgets', () => {
    const i = pluginIndex('./plugins/withWidgetLocalizations');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(pluginIndex('expo-widgets'));
    expect(plugins[i][1].languages.sort()).toEqual(languages.sort());
  });

  it.each(languages)('%s translates exactly the strings app.config passes to expo-widgets', (lang) => {
    const catalog: Record<string, string> = JSON.parse(readFileSync(join(dir, `${lang}.json`), 'utf8'));
    expect(Object.keys(catalog).sort()).toEqual([...new Set(sourceStrings())].sort());
    for (const value of Object.values(catalog)) expect(value.trim()).not.toBe('');
  });
});
