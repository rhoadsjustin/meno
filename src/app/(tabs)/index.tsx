import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { DEFAULT_TRANSLATION_ID, formatRef, getTranslation, getVerse, type Verse } from '@/services/bible';
import { useThemeColors, fonts, spacing, scriptureType } from '@/theme';

/** Placeholder daily verse until goals exist (M2 replaces this with the
 * current chunk at its dissolution level). */
const DAILY_REF = { bookId: 'John', chapter: 3, verse: 16 };

export default function TodayScreen() {
  const colors = useThemeColors();
  const [verse, setVerse] = useState<Verse | null>(null);
  const [verseError, setVerseError] = useState<string | null>(null);

  useEffect(() => {
    getVerse(DEFAULT_TRANSLATION_ID, DAILY_REF)
      .then(setVerse)
      .catch((e: unknown) => setVerseError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <Screen title="Today">
      <Card>
        <Text style={[styles.emptyTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
          Nothing memorized yet
        </Text>
        <Text style={[styles.emptyBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          Pick a passage to begin hiding it in your heart. Goal creation arrives in the next
          milestone.
        </Text>
      </Card>

      {verse && (
        <Card>
          <Text
            accessibilityLabel={`${formatRef(DAILY_REF)}, ${verse.text}`}
            style={[styles.scripture, { color: colors.ink, fontFamily: fonts?.scripture }]}>
          {verse.text}
          </Text>
          <Text style={[styles.attribution, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {formatRef(DAILY_REF)} · {getTranslation(verse.translationId).abbrev}
          </Text>
        </Card>
      )}
      {verseError && (
        <Card>
          <Text style={[styles.emptyBody, { color: colors.error, fontFamily: fonts?.ui }]}>
            Couldn’t load Scripture: {verseError}
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: spacing.xs },
  emptyBody: { fontSize: 15, lineHeight: 20 },
  scripture: {
    fontSize: scriptureType.defaultSize,
    lineHeight: scriptureType.defaultLineHeight,
  },
  attribution: { fontSize: 13, marginTop: spacing.md },
});
