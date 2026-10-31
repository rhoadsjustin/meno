/**
 * One Year in the Word card (docs/10 §2, §6). The same component draws the
 * card on screen and the share images: `variant` picks the frame, and on a
 * share image every size is a multiple of the canvas unit, so the picture
 * is identical on every phone and in every Duo pose.
 *
 * Engraving style (07 §7): a double-rule border, New York numerals, no
 * gradients or imagery. Gold only where something was memorized (07 §3).
 */
import { StyleSheet, Text, View, type TextStyle } from 'react-native';

import type { RecapView } from '@/features/wrapped/recap-view';
import { locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import type { CardId } from '@/services/wrapped';
import { fonts, palette, type ColorScheme, type ThemeColors } from '@/theme';

export type CardVariant = 'screen' | 'story' | 'square';

/** Share canvases in points at unit 1; the renderer scales them to 1080px wide. */
export const CANVAS = {
  story: { width: 360, height: 640 },
  square: { width: 360, height: 450 },
} as const;

type Props = {
  view: RecapView;
  card: CardId;
  variant: CardVariant;
  scheme: ColorScheme;
  /** Points per canvas unit (share variants); the screen variant uses 1. */
  unit?: number;
};

export function RecapCard({ view, card, variant, scheme, unit = 1 }: Props) {
  const colors = palette[scheme];
  const u = unit;
  const share = variant !== 'screen';
  const canvas = share ? CANVAS[variant] : null;

  // Story images keep text out of Instagram's top and bottom chrome (docs/10 §6).
  const padding =
    variant === 'story'
      ? { paddingTop: 96 * u, paddingBottom: 170 * u, paddingHorizontal: 40 * u }
      : variant === 'square'
        ? { paddingTop: 36 * u, paddingBottom: 84 * u, paddingHorizontal: 36 * u }
        : { padding: 32 * u };

  return (
    <View
      collapsable={false}
      style={[
        styles.frame,
        { backgroundColor: colors.surface },
        canvas ? { width: canvas.width * u, height: canvas.height * u } : styles.fill,
      ]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { margin: 14 * u, borderWidth: 1.25 * u, borderColor: colors.separator, borderRadius: 6 * u },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { margin: 19 * u, borderWidth: 0.75 * u, borderColor: colors.separator, borderRadius: 3 * u },
        ]}
      />
      <View style={[styles.content, padding]}>
        {/* The 4:5 post is shorter than a story: the same card, set a size smaller. */}
        <CardBody view={view} card={card} colors={colors} u={variant === 'square' ? u * 0.8 : u} share={share} />
      </View>
      {share && (
        <View style={[styles.footer, { bottom: (variant === 'story' ? 122 : 34) * u }]}>
          <Text
            allowFontScaling={false}
            style={{
              color: colors.ink,
              fontFamily: fonts?.scripture,
              fontSize: 15 * u,
              letterSpacing: 4 * u,
              fontWeight: '600',
            }}>
            MENO
          </Text>
          <Text
            allowFontScaling={false}
            style={{ color: colors.inkFaint, fontFamily: fonts?.ui, fontSize: 10 * u, marginTop: 2 * u }}>
            meno-scripture.org
          </Text>
        </View>
      )}
    </View>
  );
}

function CardBody({
  view,
  card,
  colors,
  u,
  share,
}: {
  view: RecapView;
  card: CardId;
  colors: ThemeColors;
  u: number;
  share: boolean;
}) {
  const { t } = useTranslation('wrapped');
  const { recap } = view;
  const year = recap.year;
  const n = (value: number) => value.toLocaleString(locale());

  // Share images are fixed pictures; on screen, text follows Dynamic Type.
  const scale = share ? { allowFontScaling: false } : { maxFontSizeMultiplier: 1.6 };
  const type = {
    kicker: { color: colors.lapis, fontFamily: fonts?.ui, fontSize: 12 * u, fontWeight: '600', letterSpacing: 1.4 * u, textTransform: 'uppercase' },
    heading: { color: colors.ink, fontFamily: fonts?.scripture, fontSize: 26 * u, lineHeight: 32 * u, fontWeight: '600' },
    numeral: { color: colors.ink, fontFamily: fonts?.scripture, fontSize: 96 * u, lineHeight: 108 * u },
    label: { color: colors.inkFaint, fontFamily: fonts?.ui, fontSize: 17 * u, lineHeight: 22 * u },
    detail: { color: colors.inkFaint, fontFamily: fonts?.ui, fontSize: 15 * u, lineHeight: 21 * u },
    verse: { color: colors.ink, fontFamily: fonts?.scripture, fontSize: 18 * u, lineHeight: 27 * u, fontStyle: 'italic' },
    title: { color: colors.ink, fontFamily: fonts?.scripture, fontSize: 34 * u, lineHeight: 40 * u, fontWeight: '600' },
  } satisfies Record<string, TextStyle>;

  const kicker = (
    <Text {...scale} style={[type.kicker, { marginBottom: 20 * u }]}>
      {view.kicker}
    </Text>
  );
  const heading = (text: string) => (
    <Text {...scale} accessibilityRole="header" style={[type.heading, { marginBottom: 16 * u }]}>
      {text}
    </Text>
  );
  const numeral = (value: number, color: string = colors.ink) => (
    <Text {...scale} numberOfLines={1} adjustsFontSizeToFit style={[type.numeral, { color }]}>
      {n(value)}
    </Text>
  );
  const gap = (h: number) => <View style={{ height: h * u }} />;

  switch (card) {
    case 'cover':
      return (
        <>
          {kicker}
          <Text {...scale} accessibilityRole="header" style={type.title}>
            {t('cover', { year })}
          </Text>
          {!share && (
            <>
              {gap(24)}
              <Text {...scale} style={type.detail}>
                {t('coverHint')}
              </Text>
            </>
          )}
        </>
      );

    case 'words': {
      const words = recap.wordsMemorized;
      const lead = words ?? recap.versesMemorized;
      return (
        <>
          {kicker}
          {heading(t('cards.words.heading'))}
          {numeral(lead, colors.gold)}
          <Text {...scale} style={type.label}>
            {words !== null
              ? t('cards.words.words', { count: words })
              : t('cards.words.verses', { count: recap.versesMemorized })}
          </Text>
          {words !== null && (
            <Text {...scale} style={[type.detail, { marginTop: 4 * u }]}>
              {t('cards.words.across', { count: recap.versesMemorized, value: n(recap.versesMemorized) })}
            </Text>
          )}
          {gap(28)}
          <Text {...scale} style={type.verse}>
            {t('cards.words.echo')}
          </Text>
          <Text {...scale} style={[type.detail, { marginTop: 6 * u }]}>
            {t('cards.words.echoRef')}
          </Text>
        </>
      );
    }

    case 'passage': {
      const p = view.passage!;
      return (
        <>
          {kicker}
          {heading(t('cards.passage.heading'))}
          <Text {...scale} style={type.title}>
            {p.reference}
          </Text>
          <Text {...scale} style={[type.detail, { marginTop: 4 * u }]}>
            {p.abbrev}
          </Text>
          {p.text && (
            <>
              {gap(20)}
              <Text {...scale} style={type.verse} numberOfLines={share ? 7 : undefined}>
                {`“${p.text}”`}
              </Text>
            </>
          )}
          {gap(20)}
          <Text {...scale} style={type.detail}>
            {t('cards.passage.minutes', { count: recap.passage!.minutes, value: n(recap.passage!.minutes) })}
          </Text>
        </>
      );
    }

    case 'days':
      return (
        <>
          {kicker}
          {heading(t('cards.days.heading'))}
          {numeral(recap.activeDays)}
          <Text {...scale} style={type.label}>
            {t('cards.days.days', { count: recap.activeDays })}
          </Text>
          {gap(20)}
          <Text {...scale} style={type.detail}>
            {t('cards.days.longest', { count: recap.longestRun, value: n(recap.longestRun) })}
          </Text>
          {recap.graceDaysHonored > 0 && (
            <Text {...scale} style={[type.detail, { marginTop: 4 * u }]}>
              {t('cards.days.grace', { count: recap.graceDaysHonored, value: n(recap.graceDaysHonored) })}
            </Text>
          )}
        </>
      );

    case 'minutes':
      return (
        <>
          {kicker}
          {heading(t('cards.minutes.heading'))}
          {numeral(recap.minutes)}
          <Text {...scale} style={type.label}>
            {t('cards.minutes.minutes', { count: recap.minutes })}
          </Text>
        </>
      );

    case 'spoken':
      return (
        <>
          {kicker}
          {heading(t('cards.spoken.heading'))}
          {numeral(recap.spokenRecitations)}
          <Text {...scale} style={type.label}>
            {t('cards.spoken.times', { count: recap.spokenRecitations })}
          </Text>
        </>
      );

    case 'unlocks':
      return (
        <>
          {kicker}
          {heading(t('cards.unlocks.heading'))}
          {numeral(recap.unlocks)}
          <Text {...scale} style={type.label}>
            {t('cards.unlocks.times', { count: recap.unlocks })}
          </Text>
        </>
      );

    case 'persona': {
      const p = view.persona!;
      return (
        <>
          {kicker}
          {heading(t('cards.persona.heading'))}
          <Text {...scale} style={[type.title, { color: colors.lapis }]}>
            {p.name}
          </Text>
          {gap(12)}
          <Text {...scale} style={type.label}>
            {p.line}
          </Text>
          {gap(28)}
          {p.text && (
            <Text {...scale} style={type.verse}>
              {`“${p.text}”`}
            </Text>
          )}
          <Text {...scale} style={[type.detail, { marginTop: 6 * u }]}>
            {p.reference}
          </Text>
        </>
      );
    }

    case 'badges':
      return (
        <>
          {kicker}
          {heading(t('cards.badges.heading'))}
          {numeral(view.badgeNames.length, colors.gold)}
          <Text {...scale} style={type.label}>
            {t('cards.badges.count', { count: view.badgeNames.length })}
          </Text>
          {gap(20)}
          {view.badgeNames.map((name) => (
            <Text key={name} {...scale} style={[type.detail, { color: colors.ink }]}>
              {name}
            </Text>
          ))}
        </>
      );

    case 'summary': {
      const stats: { value: number; label: string; gold?: boolean }[] = [];
      if (recap.chunksMemorized > 0) {
        stats.push(
          recap.wordsMemorized !== null
            ? { value: recap.wordsMemorized, label: t('cards.words.words', { count: recap.wordsMemorized }), gold: true }
            : { value: recap.versesMemorized, label: t('cards.words.verses', { count: recap.versesMemorized }), gold: true },
        );
      }
      stats.push({ value: recap.activeDays, label: t('cards.days.days', { count: recap.activeDays }) });
      if (recap.minutes > 0) {
        stats.push({ value: recap.minutes, label: t('cards.minutes.minutes', { count: recap.minutes }) });
      }
      if (recap.spokenRecitations > 0) {
        stats.push({
          value: recap.spokenRecitations,
          label: t('cards.spoken.times', { count: recap.spokenRecitations }),
        });
      }
      return (
        <>
          <Text {...scale} style={[type.kicker, { marginBottom: 20 * u }]}>
            {view.kicker}
          </Text>
          {heading(t('cards.summary.heading', { year }))}
          <View style={[styles.statGrid, { rowGap: 18 * u, columnGap: 16 * u }]}>
            {stats.slice(0, 4).map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text
                  {...scale}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[type.numeral, { fontSize: 44 * u, lineHeight: 50 * u, color: s.gold ? colors.gold : colors.ink }]}>
                  {n(s.value)}
                </Text>
                <Text {...scale} style={type.detail}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
          {view.passage && (
            <>
              {gap(22)}
              <Text {...scale} style={type.detail}>
                {t('cards.passage.heading')}
              </Text>
              <Text {...scale} style={[type.heading, { fontSize: 20 * u, lineHeight: 26 * u }]}>
                {`${view.passage.reference} ${view.passage.abbrev}`.trim()}
              </Text>
            </>
          )}
          {view.persona && (
            <>
              {gap(14)}
              <Text {...scale} style={type.detail}>
                {t('cards.persona.heading')}
              </Text>
              <Text {...scale} style={[type.heading, { fontSize: 20 * u, lineHeight: 26 * u, color: colors.lapis }]}>
                {view.persona.name}
              </Text>
            </>
          )}
        </>
      );
    }
  }
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  fill: { flex: 1 },
  content: { flex: 1, justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { width: '45%' },
});
