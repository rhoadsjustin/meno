/**
 * Meno home-screen + Lock Screen widget (docs/05 §1). Purely typographic —
 * the signature is dissolution: the verse fades from the widget as it
 * solidifies in memory.
 *
 * Each placed instance is configurable (iOS 17+): long-press → Edit Widget →
 * "Show verse as" picks full text, blanks at 25/50/75%, first letters, or
 * reference only. `Match my progress` (the default) follows the tier ladder.
 * WidgetKit owns that choice, so services/widgets ships every rendering
 * precomputed and this layout selects one — the widget runtime is isolated:
 * no hooks, no app state, no module-scope constants. That includes i18n: every
 * word of copy arrives as a prop, rendered in the UI language by
 * services/widgets (only the 'Meno' wordmark is literal).
 */
import { AccessoryWidgetBackground, HStack, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityLabel,
  containerBackground,
  dynamicTypeSize,
  font,
  foregroundStyle,
  lineLimit,
  minimumScaleFactor,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { WidgetPracticeMode, WidgetTextVariants } from '@/services/widgets/modes';

/** Set by the user in the iOS Edit Widget sheet (app.config.ts generates it). */
export type MenoWidgetConfiguration = {
  mode: WidgetPracticeMode;
};

export type MenoWidgetProps = WidgetTextVariants & {
  verseRef: string;
  /** The reference with the book abbreviated ('Phil 4:6'), for the inline slot. */
  verseRefShort: string;
  /** The mode `auto` resolves to for this chunk's tier. */
  autoMode: WidgetPracticeMode;
  /** True → nothing left to learn in this goal. */
  memorized: boolean;
  streak: number;
  streakActiveToday: boolean;
  dueCount: number;
  translationAbbrev: string;
  /** Last 7 days as '1'/'0' chars, oldest first. */
  weekGrid: string;
  /** Up to 3 due review references, '·'-joined ('' when none). */
  dueRefs: string;
  hasGoal: boolean;
  // Localized copy, rendered by services/widgets with `t`.
  /** Under the streak count on the small widget ('day streak'). */
  streakCaption: string;
  /** '3 due' — shown only when dueCount > 0. */
  dueBadge: string;
  /** Reference-only note: 'You know this one.' or 'From memory.' */
  referenceNote: string;
  /** No goal yet: 'Pick a passage to begin.' */
  emptyPrompt: string;
  /** No goal yet, in the one-line inline slot: 'Pick a passage'. */
  inlineEmpty: string;
  /** Large widget footer: 'Due: …' or 'Nothing due — well kept.' */
  dueLine: string;
  /** VoiceOver, for the streak: '12-day streak, practiced today'. */
  streakLabel: string;
  /** VoiceOver, for the week grid: 'Practiced 5 of the last 7 days'. */
  weekLabel: string;
};

const MenoWidgetComponent = (
  props: MenoWidgetProps,
  environment: WidgetEnvironment<MenoWidgetConfiguration>
) => {
  'widget';
  // The theme's light and dark values (src/theme/palette.ts), inline because
  // the widget runtime sees no module-scope constants. The light accents on
  // the dark background were 2.2:1 to 3.9:1; these pass 4.5:1.
  const dark = environment.colorScheme === 'dark';
  const lapis = dark ? '#5B7FE8' : '#2244AA';
  const gold = dark ? '#D4AF37' : '#8F6C1F';
  const inkFaint = dark ? '#8B8F9C' : '#6E7280';
  // Tinted and clear Home Screen widgets ('accented') and the Lock Screen
  // ('vibrant') flatten fixed colours, so captions there step down with the
  // system's secondary level instead. Full colour keeps the 4.5:1 token.
  const fullColor = (environment.widgetRenderingMode ?? 'fullColor') === 'fullColor';
  const faint = fullColor ? inkFaint : ({ type: 'hierarchical', style: 'secondary' } as const);
  const family = environment.widgetFamily;
  // iOS 17+ requires the containerBackground API for home screen widgets.
  const bg = dark ? '#10131A' : '#FBFAF7';
  const flame = props.streakActiveToday ? '🔥' : '·';
  // A timeline published before these props existed lasts until the app is
  // next opened; fall back to what it does carry.
  const streakSpoken = props.streakLabel || String(props.streak);
  // Text follows Dynamic Type (text styles, not fixed sizes) up to a ceiling:
  // a widget's box is fixed, so past it the layout would only truncate.
  const homeType = dynamicTypeSize({ max: 'xxLarge' });
  const lockType = dynamicTypeSize({ max: 'xLarge' });

  // Resolve the user's choice against the tier ladder, then pick the text.
  // An unset configuration (a widget placed before this shipped) reads as 'auto'.
  const chosen = environment.configuration?.mode ?? 'auto';
  const mode = chosen === 'auto' ? props.autoMode : chosen;
  const verseText =
    mode === 'full'
      ? props.textFull
      : mode === 'blanks25'
        ? props.textBlanks25
        : mode === 'blanks50'
          ? props.textBlanks50
          : mode === 'blanks75'
            ? props.textBlanks75
            : mode === 'firstLetters'
              ? props.textFirstLetters
              : '';
  const mono = mode === 'firstLetters';
  // Reference-only whenever there is no text to show: the mode asked for it,
  // the goal is finished, or the translation's license forbids persisting text.
  const referenceOnly = verseText.length === 0;
  // Underscores and lone letters are noise read aloud. VoiceOver reads the
  // reference beside them and, in their place, the note ('From memory.').
  const verseSpoken = mode === 'full' && !referenceOnly ? verseText : props.referenceNote;

  if (family === 'accessoryCircular') {
    // The count over the practiced-today mark; the unit ('days') was 9pt, under
    // the 11pt floor for widget text, so VoiceOver carries it instead.
    return (
      <ZStack
        modifiers={[
          widgetURL('meno:///'),
          containerBackground(bg, 'widget'),
          lockType,
          accessibilityElement('ignore'),
          accessibilityLabel(streakSpoken),
        ]}>
        <AccessoryWidgetBackground />
        <VStack spacing={0}>
          <Text
            modifiers={[
              font({ textStyle: 'title3', weight: 'bold', design: 'serif' }),
              lineLimit(1),
              minimumScaleFactor(0.6),
            ]}>
            {String(props.streak)}
          </Text>
          <Text modifiers={[font({ textStyle: 'caption2' })]}>{flame}</Text>
        </VStack>
      </ZStack>
    );
  }

  if (family === 'accessoryInline') {
    return props.hasGoal ? (
      <Text
        modifiers={[
          widgetURL('meno:///'),
          containerBackground(bg, 'widget'),
          accessibilityLabel(props.verseRef + ', ' + streakSpoken),
        ]}>
        {props.verseRefShort || props.verseRef} · {String(props.streak)}
        {flame}
      </Text>
    ) : (
      <Text modifiers={[widgetURL('meno:///'), containerBackground(bg, 'widget')]}>
        {props.inlineEmpty || props.emptyPrompt}
      </Text>
    );
  }

  if (family === 'accessoryRectangular') {
    if (!props.hasGoal) {
      return (
        <VStack
          spacing={0}
          alignment="leading"
          modifiers={[widgetURL('meno:///'), containerBackground(bg, 'widget'), lockType]}>
          <Text modifiers={[font({ textStyle: 'footnote', weight: 'semibold' }), lineLimit(3)]}>
            {props.emptyPrompt}
          </Text>
        </VStack>
      );
    }
    return (
      <VStack spacing={0} alignment="leading" modifiers={[widgetURL('meno:///'), containerBackground(bg, 'widget'), lockType]}>
        <Text
          modifiers={[
            font({ textStyle: 'footnote', weight: 'semibold' }),
            lineLimit(1),
            minimumScaleFactor(0.8),
          ]}>
          {props.verseRef}
        </Text>
        <Text
          modifiers={[
            font({ textStyle: 'caption2', design: mono ? 'monospaced' : 'default' }),
            lineLimit(2),
            minimumScaleFactor(0.8),
            accessibilityLabel(verseSpoken),
          ]}>
          {referenceOnly ? props.referenceNote : verseText}
        </Text>
      </VStack>
    );
  }

  if (family === 'systemSmall') {
    return (
      <VStack spacing={0} alignment="leading" modifiers={[widgetURL('meno:///'), containerBackground(bg, 'widget'), homeType]}>
        <VStack
          spacing={0}
          alignment="leading"
          modifiers={[accessibilityElement('ignore'), accessibilityLabel(streakSpoken)]}>
          <HStack spacing={0}>
            <Text
              modifiers={[
                font({ textStyle: 'title', weight: 'bold', design: 'serif' }),
                lineLimit(1),
                minimumScaleFactor(0.8),
              ]}>
              {String(props.streak)}
            </Text>
            <Text modifiers={[font({ textStyle: 'subheadline' })]}>{flame}</Text>
            <Spacer />
          </HStack>
          <Text modifiers={[font({ textStyle: 'caption2' }), foregroundStyle(faint), lineLimit(1)]}>
            {props.streakCaption}
          </Text>
        </VStack>
        <Spacer />
        {props.dueCount > 0 ? (
          <Text
            modifiers={[
              font({ textStyle: 'caption', weight: 'semibold' }),
              foregroundStyle(lapis),
              lineLimit(1),
            ]}>
            {props.dueBadge}
          </Text>
        ) : null}
        {props.hasGoal ? (
          <Text
            modifiers={[
              font({ textStyle: 'footnote', weight: 'medium' }),
              lineLimit(2),
              minimumScaleFactor(0.8),
            ]}>
            {props.verseRef}
          </Text>
        ) : (
          <Text modifiers={[font({ textStyle: 'footnote' }), foregroundStyle(faint), lineLimit(2)]}>
            {props.emptyPrompt}
          </Text>
        )}
      </VStack>
    );
  }

  // systemMedium / systemLarge: the verse, at the chosen level of exposure.
  // The line limits are what each box holds beside its other rows; past them
  // the text first shrinks a little, then truncates with an ellipsis.
  const verseLines = family === 'systemLarge' ? 10 : 4;
  const verseBlock = referenceOnly ? (
    <VStack spacing={0} alignment="leading">
      <Text
        modifiers={[
          font({ textStyle: 'title3', design: 'serif' }),
          foregroundStyle(gold),
          lineLimit(2),
          minimumScaleFactor(0.8),
        ]}>
        {props.verseRef}
      </Text>
      <Text modifiers={[font({ textStyle: 'caption' }), foregroundStyle(faint), lineLimit(1)]}>
        {props.referenceNote}
      </Text>
    </VStack>
  ) : (
    <VStack spacing={0} alignment="leading">
      <Text
        modifiers={[
          font(
            mono
              ? { textStyle: 'footnote', design: 'monospaced' }
              : { textStyle: 'subheadline', design: 'serif' }
          ),
          lineLimit(verseLines),
          minimumScaleFactor(0.8),
          accessibilityLabel(verseSpoken),
        ]}>
        {verseText}
      </Text>
      <Text modifiers={[font({ textStyle: 'caption2' }), foregroundStyle(faint), lineLimit(1)]}>
        {props.verseRef} · {props.translationAbbrev}
      </Text>
    </VStack>
  );
  const emptyBlock = (
    <Text modifiers={[font({ textStyle: 'subheadline' }), foregroundStyle(faint), lineLimit(2)]}>
      {props.emptyPrompt}
    </Text>
  );
  const streakBadge = (
    <Text
      modifiers={[
        font({ textStyle: 'caption', weight: 'semibold' }),
        foregroundStyle(lapis),
        lineLimit(1),
        accessibilityLabel(streakSpoken),
      ]}>
      {String(props.streak)}
      {flame}
    </Text>
  );

  if (family === 'systemMedium') {
    // The one family that opens the practice session (docs/05 §1): `/practice`
    // resolves to the focus goal, the passage this widget shows, and to Today
    // when there is none.
    return (
      <VStack spacing={0} alignment="leading" modifiers={[widgetURL('meno:///practice'), containerBackground(bg, 'widget'), homeType]}>
        <HStack spacing={0}>
          <Spacer />
          {streakBadge}
        </HStack>
        <Spacer />
        {props.hasGoal ? verseBlock : emptyBlock}
        <Spacer />
      </VStack>
    );
  }

  // systemLarge
  const gridRow = props.weekGrid
    .split('')
    .map((c) => (c === '1' ? '■' : '□'))
    .join(' ');
  return (
    <VStack spacing={0} alignment="leading" modifiers={[widgetURL('meno:///'), containerBackground(bg, 'widget'), homeType]}>
      <HStack spacing={0}>
        <Text modifiers={[font({ textStyle: 'footnote', weight: 'semibold' })]}>Meno</Text>
        <Spacer />
        {streakBadge}
      </HStack>
      <Spacer />
      {props.hasGoal ? verseBlock : emptyBlock}
      <Spacer />
      <Text
        modifiers={[
          font({ textStyle: 'caption' }),
          foregroundStyle(lapis),
          lineLimit(1),
          accessibilityLabel(props.weekLabel || gridRow),
        ]}>
        {gridRow}
      </Text>
      <Text modifiers={[font({ textStyle: 'caption2' }), foregroundStyle(faint), lineLimit(2)]}>
        {props.dueLine}
      </Text>
    </VStack>
  );
};

export default createWidget<MenoWidgetProps, MenoWidgetConfiguration>(
  'MenoWidget',
  MenoWidgetComponent
);
