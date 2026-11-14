/**
 * The quick start: well-known verses as a row of swipeable cards, each with
 * one button that starts practicing it straight away. Shown on Today until
 * the user has a passage of their own.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Card } from '@/components/card';
import { useContentLayout } from '@/components/content-layout';
import { Button } from '@/components/button';
import { LoadingState } from '@/components/unavailable';
import { useTranslation } from '@/i18n/react';
import {
  formatRange,
  getTranslation,
  trimUnbalancedQuotes,
  type StarterPassage,
} from '@/services/bible';
import { useThemeColors, fonts, layout, spacing, scriptureType } from '@/theme';

/** Share of the row one card takes, so the next card peeks in as the cue to swipe. */
const CARD_SHARE = 0.86;
/**
 * Dynamic Type scale from which the cards stack instead of sitting in a
 * swipeable row (the accessibility sizes). A row is as tall as its longest
 * verse, which at these sizes is several screens of mostly empty cards.
 */
export const STARTER_STACK_TEXT_SCALE = 1.4;
/** Past this a verse stops reading as a card and becomes a banner. */
const MAX_CARD_WIDTH = 420;

export function StarterDeck({
  passages,
  startingId,
  onStart,
}: {
  passages: StarterPassage[];
  /** The starter being set up, if any; every button is disabled meanwhile. */
  startingId: string | null;
  onStart: (passage: StarterPassage) => void;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation('goals');
  const { width: windowWidth, isWide } = useContentLayout();
  // The row's real width once laid out (it is half the window in the wide
  // two-pane layout); until then, the single-column width is a fair guess.
  const [rowWidth, setRowWidth] = useState<number | null>(null);
  const available = rowWidth ?? windowWidth - layout.screenMargin * 2;
  const cardWidth = Math.round(Math.min(available * CARD_SHARE, MAX_CARD_WIDTH));
  // In a single column the cards run to the screen edges; inside a pane they
  // stay within it, clear of the gutter (and of iPhone Duo's fold).
  const bleed = isWide ? 0 : layout.screenMargin;
  const translation = passages[0] ? getTranslation(passages[0].translationId) : null;
  // Cards normally sit in a row, stretched to the tallest so the buttons
  // line up. At accessibility text sizes they stack, each at its own height.
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= STARTER_STACK_TEXT_SCALE;

  const cards = passages.map((passage) => {
    const reference = formatRange(passage.starter.range);
    const starting = startingId === passage.starter.id;
    return (
      <Card
        key={passage.starter.id}
        style={stacked ? styles.card : { ...styles.card, width: cardWidth }}>
        <View>
          <Text
            accessibilityRole="header"
            style={[styles.reference, { color: colors.ink, fontFamily: fonts?.ui }]}>
            {reference}
          </Text>
          <Text style={[styles.scripture, { color: colors.ink, fontFamily: fonts?.scripture }]}>
            {trimUnbalancedQuotes(passage.verses.map((v) => v.text).join(' '))}
          </Text>
          <Text
            accessibilityLabel={getTranslation(passage.translationId).name}
            style={[styles.abbrev, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
            {getTranslation(passage.translationId).abbrev}
          </Text>
        </View>
        <Button
          label={t('starter.practiceThisVerse')}
          accessibilityLabel={t('starter.practiceReference', { reference })}
          // The tapped card's button shows a spinner; the others only dim.
          busy={starting}
          disabled={startingId !== null && !starting}
          onPress={() => onStart(passage)}
          style={styles.button}
        />
      </Card>
    );
  });

  return (
    <View onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)} style={styles.root}>
      {stacked ? (
        <View style={styles.stack}>{cards}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardWidth + spacing.md}
          snapToAlignment="start"
          style={{ marginHorizontal: -bleed }}
          contentContainerStyle={[styles.row, { paddingHorizontal: bleed }]}>
          {cards}
        </ScrollView>
      )}
      {translation && (
        <Text style={[styles.attribution, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {translation.attribution}
        </Text>
      )}
    </View>
  );
}

/**
 * Holds the deck's place while the starter verses load (ESV can take a
 * moment), so the empty state is not a headline over nothing and the page
 * does not jump when the cards arrive.
 */
export function StarterDeckPlaceholder() {
  return (
    <Card style={styles.placeholder}>
      <LoadingState layout="inline" />
    </Card>
  );
}

const styles = StyleSheet.create({
  // About one card of a short verse at the default text size.
  placeholder: { minHeight: 260, justifyContent: 'center' },
  root: { gap: spacing.md },
  row: { gap: spacing.md },
  stack: { gap: spacing.md },
  // Cards stretch to the tallest in the row; the button sits at the bottom
  // of each so the row of buttons lines up.
  card: { justifyContent: 'space-between' },
  reference: { fontSize: 17, fontWeight: '600', marginBottom: spacing.sm },
  scripture: {
    fontSize: scriptureType.defaultSize,
    lineHeight: scriptureType.defaultLineHeight,
  },
  abbrev: { fontSize: 13, marginTop: spacing.md },
  button: { marginTop: spacing.lg },
  attribution: { fontSize: 12, lineHeight: 17, paddingHorizontal: spacing.xs },
});
