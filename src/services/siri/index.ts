/**
 * Publishes the Siri context: Documents/siri-context.json, read by the
 * native "Look Up a Verse" App Intent (native/siri, compiled into the app
 * by plugins/withSiriIntents). See `context.ts` for what is in it and why
 * the intent can't ask the app at the time.
 *
 * Call at launch and when the app goes to the background, like the widget
 * snapshot: Siri can only be asked once the app is no longer in front, and
 * by then the context reflects whatever changed.
 */
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  BUNDLED_DB_NAME,
  DEFAULT_TRANSLATION_ID,
  ensureBundledText,
  getTranslation,
  TRANSLATIONS,
  type Translation,
} from '@/services/bible';
import { APP_DB_NAME } from '@/services/db';
import { activeGoal } from '@/services/db/repos/goals';
import { lastTranslationId } from '@/services/db/repos/wizardPrefs';
import { buildSiriContext } from '@/services/siri/context';

const CONTEXT_FILE = 'siri-context.json';

/**
 * The translation the user is memorizing in: the focus goal's (the passage
 * on the widgets), else the one last chosen in the goal wizard, else the
 * default.
 */
async function memorizingTranslation(): Promise<Translation> {
  const id = (await activeGoal())?.translationId ?? (await lastTranslationId());
  try {
    return getTranslation(id ?? DEFAULT_TRANSLATION_ID);
  } catch {
    // An id from a version this build no longer knows.
    return getTranslation(DEFAULT_TRANSLATION_ID);
  }
}

/** Best-effort, like the widget snapshot: Siri keeps the last context. */
export async function publishSiriContext(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    // The intent reads the bundled database where expo-sqlite imported it,
    // so make sure a first launch has done that before Siri is asked.
    await ensureBundledText();
    const context = buildSiriContext({
      translation: await memorizingTranslation(),
      bundled: TRANSLATIONS.filter((tr) => tr.source === 'bundled'),
      defaultTranslationId: DEFAULT_TRANSLATION_ID,
      bundledDb: BUNDLED_DB_NAME,
      appDb: APP_DB_NAME,
    });
    const json = JSON.stringify(context);
    const file = new File(Paths.document, CONTEXT_FILE);
    if (file.exists && file.textSync() === json) return;
    if (!file.exists) file.create();
    file.write(json);
  } catch {
    // Missing module in an old dev build, a full disk: nothing to tell the user.
  }
}
