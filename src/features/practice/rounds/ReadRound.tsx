import { StyleSheet, Text } from 'react-native';

import { useTranslation } from '@/i18n/react';
import { useThemeColors, fonts, spacing, scriptureType } from '@/theme';

/**
 * Tier 0: read the full text aloud slowly, twice (docs/03 §1). The round has
 * no state of its own, so its one action ("I’ve read it twice") is the
 * practice screen's pinned footer: in the same place whatever the verse's
 * length.
 */
export function ReadRound({ text }: { text: string }) {
  const colors = useThemeColors();
  const { t } = useTranslation('practice');
  return (
    <>
      <Text style={[styles.scripture, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        {text}
      </Text>
      <Text style={[styles.hint, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {t('read.hint')}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  scripture: {
    fontSize: scriptureType.defaultSize,
    lineHeight: scriptureType.defaultLineHeight,
  },
  hint: { fontSize: 15, marginTop: spacing.lg },
});
