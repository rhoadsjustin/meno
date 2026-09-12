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
 * no hooks, no app state, no module-scope constants.
 */
import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { WidgetPracticeMode, WidgetTextVariants } from '@/services/widgets/modes';

/** Set by the user in the iOS Edit Widget sheet (app.config.ts generates it). */
export type MenoWidgetConfiguration = {
  mode: WidgetPracticeMode;
};

export type MenoWidgetProps = WidgetTextVariants & {
  verseRef: string;
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
};

const MenoWidgetComponent = (
  props: MenoWidgetProps,
  environment: WidgetEnvironment<MenoWidgetConfiguration>
) => {
  'widget';
  const lapis = '#2244AA';
  const gold = '#A8802E';
  const inkFaint = '#6E7280';
  const family = environment.widgetFamily;
  // iOS 17+ requires the containerBackground API for home screen widgets.
  const bg = environment.colorScheme === 'dark' ? '#10131A' : '#FBFAF7';
  const flame = props.streakActiveToday ? '🔥' : '·';

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

  if (family === 'accessoryCircular') {
    return (
      <VStack modifiers={[widgetURL('meno:///'), containerBackground(bg, 'widget')]}>
        <Text modifiers={[font({ size: 20, weight: 'bold', design: 'serif' })]}>
          {String(props.streak)}
        </Text>
        <Text modifiers={[font({ size: 9 })]}>days</Text>
      </VStack>
    );
  }

  if (family === 'accessoryInline') {
    return (
      <Text modifiers={[widgetURL('meno:///'), containerBackground(bg, 'widget')]}>
        {props.verseRef} · {String(props.streak)}
        {flame}
      </Text>
    );
  }

  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" modifiers={[widgetURL('meno:///'), containerBackground(bg, 'widget')]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>{props.verseRef}</Text>
        <Text modifiers={[font({ size: 11, design: mono ? 'monospaced' : 'default' })]}>
          {referenceOnly ? (props.memorized ? 'You know this one.' : 'From memory.') : verseText}
        </Text>
      </VStack>
    );
  }

  if (family === 'systemSmall') {
    return (
      <VStack alignment="leading" modifiers={[widgetURL('meno:///'), containerBackground(bg, 'widget')]}>
        <HStack>
          <Text modifiers={[font({ size: 26, weight: 'bold', design: 'serif' })]}>
            {String(props.streak)}
          </Text>
          <Text modifiers={[font({ size: 15 })]}>{flame}</Text>
          <Spacer />
        </HStack>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(inkFaint)]}>day streak</Text>
        <Spacer />
        {props.dueCount > 0 ? (
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(lapis)]}>
            {String(props.dueCount)} due
          </Text>
        ) : (
          <Text modifiers={[font({ size: 12 }), foregroundStyle(inkFaint)]}> </Text>
        )}
        <Text modifiers={[font({ size: 13, weight: 'medium' })]}>{props.verseRef}</Text>
      </VStack>
    );
  }

  // systemMedium / systemLarge: the verse, at the chosen level of exposure.
  const verseBlock = referenceOnly ? (
    <VStack alignment="leading">
      <Text modifiers={[font({ size: 20, design: 'serif' }), foregroundStyle(gold)]}>
        {props.verseRef}
      </Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(inkFaint)]}>
        {props.memorized ? 'You know this one.' : 'From memory.'}
      </Text>
    </VStack>
  ) : (
    <VStack alignment="leading">
      <Text
        modifiers={[
          font(mono ? { size: 13, design: 'monospaced' } : { size: 15, design: 'serif' }),
        ]}>
        {verseText}
      </Text>
      <Text modifiers={[font({ size: 10 }), foregroundStyle(inkFaint)]}>
        {props.verseRef} · {props.translationAbbrev}
      </Text>
    </VStack>
  );

  if (family === 'systemMedium') {
    return (
      <VStack alignment="leading" modifiers={[widgetURL('meno:///'), containerBackground(bg, 'widget')]}>
        <HStack>
          <Spacer />
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(lapis)]}>
            {String(props.streak)}
            {flame}
          </Text>
        </HStack>
        {props.hasGoal ? verseBlock : (
          <Text modifiers={[font({ size: 14 }), foregroundStyle(inkFaint)]}>
            Pick a passage to begin.
          </Text>
        )}
      </VStack>
    );
  }

  // systemLarge
  const gridRow = props.weekGrid
    .split('')
    .map((c) => (c === '1' ? '■' : '□'))
    .join(' ');
  return (
    <VStack alignment="leading" modifiers={[widgetURL('meno:///'), containerBackground(bg, 'widget')]}>
      <HStack>
        <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>Meno</Text>
        <Spacer />
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(lapis)]}>
          {String(props.streak)}
          {flame}
        </Text>
      </HStack>
      <Spacer />
      {props.hasGoal ? verseBlock : (
        <Text modifiers={[font({ size: 14 }), foregroundStyle(inkFaint)]}>
          Pick a passage to begin.
        </Text>
      )}
      <Spacer />
      <Text modifiers={[font({ size: 12 }), foregroundStyle(lapis)]}>{gridRow}</Text>
      {props.dueRefs.length > 0 ? (
        <Text modifiers={[font({ size: 11 }), foregroundStyle(inkFaint)]}>
          Due: {props.dueRefs}
        </Text>
      ) : (
        <Text modifiers={[font({ size: 11 }), foregroundStyle(inkFaint)]}>
          Nothing due — well kept.
        </Text>
      )}
    </VStack>
  );
};

export default createWidget<MenoWidgetProps, MenoWidgetConfiguration>(
  'MenoWidget',
  MenoWidgetComponent
);
