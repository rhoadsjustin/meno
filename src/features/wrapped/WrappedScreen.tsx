/**
 * The Year in the Word pager (docs/10 §5.3): full-screen cards, swiped or
 * tapped through like Stories, each shareable as an image. Close and Share
 * live in the native bar so they follow the system bar on iPhone Duo.
 */
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import { useBarIcon } from '@/components/bar-icon';
import { closeModal } from '@/components/close-modal';
import { useContentLayout } from '@/components/content-layout';
import { ScreenHeader } from '@/components/screen-header';
import { RecapCard } from '@/features/wrapped/RecapCard';
import { loadRecapView, type RecapView } from '@/features/wrapped/recap-view';
import { ShareStage, type ShareFormat, type ShareStageHandle } from '@/features/wrapped/ShareStage';
import { useTranslation } from '@/i18n/react';
import { shareGoalChallenge } from '@/services/challenges';
import { getGoal } from '@/services/db/repos/goals';
import type { CardId } from '@/services/wrapped';
import { fonts, layout, radius, spacing, useThemeColors } from '@/theme';

/** Card content never spreads wider than this, even on the Duo's inner panel. */
const CARD_MAX_WIDTH = 520;

export function WrappedScreen({ year }: { year: number }) {
  const colors = useThemeColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { t } = useTranslation(['wrapped', 'common']);
  const { width } = useWindowDimensions();
  const { sides } = useContentLayout();
  const { bottom } = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const closeIcon = useBarIcon('xmark', 'close');
  const shareIcon = useBarIcon('square.and.arrow.up', 'share');

  const [view, setView] = useState<RecapView | null>(null);
  const [index, setIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const list = useRef<FlatList<CardId>>(null);
  const stage = useRef<ShareStageHandle>(null);

  useEffect(() => {
    let live = true;
    loadRecapView(year)
      .then((v) => live && setView(v))
      .catch(() => live && setView(null));
    return () => {
      live = false;
    };
  }, [year]);

  const cards = useMemo(() => view?.recap.cards ?? [], [view]);
  const current = cards[index];

  // Keep the page under the finger after a rotation or fold changes the width.
  useEffect(() => {
    list.current?.scrollToIndex({ index, animated: false });
    // Only the width changes this; index changes scroll on their own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  // A swipe settles on a page: that page is the current card.
  const onSettle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / width);
      if (page >= 0 && page < cards.length) setIndex(page);
    },
    [width, cards.length],
  );

  // A light tick per card; a success when the summary arrives (07 §8).
  const lastIndex = useRef(0);
  useEffect(() => {
    if (!view || index === lastIndex.current) return;
    lastIndex.current = index;
    if (cards[index] === 'summary') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.selectionAsync();
    AccessibilityInfo.announceForAccessibility(t('screen.position', { index: index + 1, total: cards.length }));
  }, [index, view, cards, t]);

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= cards.length) return;
      list.current?.scrollToIndex({ index: to, animated: !reduceMotion });
      setIndex(to);
    },
    [cards.length, reduceMotion],
  );

  const share = useCallback(
    async (format: ShareFormat) => {
      if (!current || sharing) return;
      setSharing(true);
      try {
        await stage.current?.share(current, format);
      } catch {
        AccessibilityInfo.announceForAccessibility(t('screen.shareFailed'));
      } finally {
        setSharing(false);
      }
    },
    [current, sharing, t],
  );

  const invite = useCallback(async () => {
    const goal = view?.recap.passage && (await getGoal(view.recap.passage.id));
    if (goal) await shareGoalChallenge(goal);
  }, [view]);

  const header = (
    <ScreenHeader backHidden title="">
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon={closeIcon} accessibilityLabel={t('screen.close')} onPress={closeModal}>
          {t('screen.close')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      {view?.recap.eligible && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu icon={shareIcon} accessibilityLabel={t('screen.shareLabel')} disabled={sharing}>
            <Stack.Toolbar.MenuAction icon="rectangle.portrait" onPress={() => void share('story')}>
              {t('screen.storyFormat')}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="square" onPress={() => void share('square')}>
              {t('screen.postFormat')}
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      )}
    </ScreenHeader>
  );

  if (!view) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        {header}
        <ActivityIndicator color={colors.inkFaint} />
      </View>
    );
  }

  if (!view.recap.eligible) {
    return (
      <View style={[styles.center, sides, { backgroundColor: colors.surface }]}>
        {header}
        <Text accessibilityRole="header" style={[styles.notYetTitle, { color: colors.ink, fontFamily: fonts?.scripture }]}>
          {t('screen.notYetTitle')}
        </Text>
        <Text style={[styles.notYetBody, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>{t('notYet')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      {header}
      <View style={[styles.ticks, sides]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {cards.map((c, i) => (
          <View
            key={c}
            style={[styles.tick, { backgroundColor: i <= index ? colors.lapis : colors.separator }]}
          />
        ))}
      </View>
      <FlatList
        ref={list}
        data={cards}
        keyExtractor={(c) => c}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSettle}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => (
          <View style={[{ width }, sides]}>
            <ScrollView
              contentContainerStyle={[styles.page, { paddingBottom: Math.max(bottom, spacing.xl) }]}
              showsVerticalScrollIndicator={false}>
              <View
                style={styles.cardColumn}
                accessible
                accessibilityHint={t('screen.position', { index: i + 1, total: cards.length })}
                accessibilityActions={[
                  { name: 'increment', label: t('screen.next') },
                  { name: 'decrement', label: t('screen.previous') },
                ]}
                onAccessibilityAction={(e) => go(e.nativeEvent.actionName === 'increment' ? i + 1 : i - 1)}
                accessibilityRole="adjustable">
                {i === index ? (
                  <Animated.View
                    key={`on-${i}`}
                    style={styles.fill}
                    entering={(reduceMotion ? FadeIn.duration(200) : FadeInDown.duration(400)).reduceMotion(
                      ReduceMotion.Never,
                    )}>
                    <RecapCard view={view} card={item} variant="screen" scheme={scheme} />
                  </Animated.View>
                ) : (
                  <RecapCard view={view} card={item} variant="screen" scheme={scheme} />
                )}
                {/* Stories-style taps: left third back, the rest forward. */}
                <Pressable
                  style={[styles.tapZone, styles.tapBack]}
                  onPress={() => go(i - 1)}
                  accessible={false}
                />
                <Pressable
                  style={[styles.tapZone, styles.tapForward]}
                  onPress={() => go(i + 1)}
                  accessible={false}
                />
              </View>
              {item === 'summary' && view.passage && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void invite()}
                  style={[styles.invite, { backgroundColor: colors.lapis }]}>
                  <Text style={[styles.inviteText, { fontFamily: fonts?.ui }]}>
                    {t('cards.summary.invite', { next: year + 1 })}
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}
      />
      <ShareStage ref={stage} view={view} scheme={scheme} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: layout.screenMargin },
  notYetTitle: { fontSize: 26, fontWeight: '600', marginBottom: spacing.sm, textAlign: 'center' },
  notYetBody: { fontSize: 17, lineHeight: 24, textAlign: 'center', maxWidth: 360 },
  ticks: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: layout.screenMargin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    width: '100%',
    maxWidth: CARD_MAX_WIDTH + layout.screenMargin * 2,
    alignSelf: 'center',
  },
  tick: { flex: 1, height: 3, borderRadius: 2 },
  page: {
    flexGrow: 1,
    paddingHorizontal: layout.screenMargin,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  cardColumn: {
    flexGrow: 1,
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    minHeight: 420,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  tapZone: { position: 'absolute', top: 0, bottom: 0 },
  tapBack: { left: 0, width: '33%' },
  tapForward: { right: 0, width: '67%' },
  invite: {
    marginTop: spacing.lg,
    borderRadius: radius.capsule,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
  },
  inviteText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
