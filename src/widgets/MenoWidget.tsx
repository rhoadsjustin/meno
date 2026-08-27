/**
 * Meno home-screen + Lock Screen widget (docs/05 §1). Purely typographic —
 * the signature is tier-based dissolution: the verse fades from the widget
 * as it solidifies in memory. All strings are precomputed by
 * services/widgets (the widget runtime is isolated: no hooks, no imports of
 * app state, no module-scope constants).
 */
import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type MenoWidgetProps = {
  verseRef: string;
  /** Verse display text per tier: full (0–2), blanked (3–4), first letters (5), '' (memorized). */
  displayText: string;
  /** True → render displayText in monospace (first-letters cipher). */
  mono: boolean;
  /** True → memorized: show reference-only state. */
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

const MenoWidgetComponent = (props: MenoWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const lapis = '#2244AA';
  const gold = '#A8802E';
  const inkFaint = '#6E7280';
  const family = environment.widgetFamily;
  // iOS 17+ requires the containerBackground API for home screen widgets.
  const bg = environment.colorScheme === 'dark' ? '#10131A' : '#FBFAF7';
  const flame = props.streakActiveToday ? '🔥' : '·';

  if (family === 'accessoryCircular') {
    return (
      <VStack modifiers={[widgetURL('meno://'), containerBackground(bg, 'widget')]}>
        <Text modifiers={[font({ size: 20, weight: 'bold', design: 'serif' })]}>
          {String(props.streak)}
        </Text>
        <Text modifiers={[font({ size: 9 })]}>days</Text>
      </VStack>
    );
  }

  if (family === 'accessoryInline') {
    return (
      <Text modifiers={[widgetURL('meno://'), containerBackground(bg, 'widget')]}>
        {props.verseRef} · {String(props.streak)}
        {flame}
      </Text>
    );
  }

  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" modifiers={[widgetURL('meno://'), containerBackground(bg, 'widget')]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>{props.verseRef}</Text>
        <Text modifiers={[font({ size: 11, design: 'monospaced' })]}>
          {props.memorized ? 'You know this one.' : props.displayText}
        </Text>
      </VStack>
    );
  }

  if (family === 'systemSmall') {
    return (
      <VStack alignment="leading" modifiers={[widgetURL('meno://'), containerBackground(bg, 'widget')]}>
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

  // systemMedium / systemLarge: the dissolving verse.
  const verseBlock = props.memorized ? (
    <VStack alignment="leading">
      <Text modifiers={[font({ size: 20, design: 'serif' }), foregroundStyle(gold)]}>
        {props.verseRef}
      </Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(inkFaint)]}>
        You know this one.
      </Text>
    </VStack>
  ) : (
    <VStack alignment="leading">
      <Text
        modifiers={[
          font(
            props.mono
              ? { size: 13, design: 'monospaced' }
              : { size: 15, design: 'serif' }
          ),
        ]}>
        {props.displayText}
      </Text>
      <Text modifiers={[font({ size: 10 }), foregroundStyle(inkFaint)]}>
        {props.verseRef} · {props.translationAbbrev}
      </Text>
    </VStack>
  );

  if (family === 'systemMedium') {
    return (
      <VStack alignment="leading" modifiers={[widgetURL('meno://practice'), containerBackground(bg, 'widget')]}>
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
    <VStack alignment="leading" modifiers={[widgetURL('meno://'), containerBackground(bg, 'widget')]}>
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

export default createWidget<MenoWidgetProps>('MenoWidget', MenoWidgetComponent);
