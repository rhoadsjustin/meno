import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, type ButtonVariant } from '@/components/button';
import { Card } from '@/components/card';
import { GoalMenu, type GoalMenuProps } from '@/features/goals/GoalMenu';
import { useTranslation } from '@/i18n/react';
import { getTranslation } from '@/services/bible';
import type { Chunk, Goal } from '@/services/db/repos/goals';
import type { GoalAction } from '@/services/goals/progress';
import { fonts, radius, spacing, useThemeColors, type ThemeColors } from '@/theme';

export type PassageCardProps = {
  goal: Goal;
  chunks: Chunk[];
  /** The step Today would name for this passage (services/goals/progress). */
  action: GoalAction | null;
  /** Says "Your focus" under the summary. Only worth saying once there is a choice. */
  focus?: boolean;
  /** The More menu's actions; the card supplies its label and tint. */
  menu: Omit<GoalMenuProps, 'label' | 'tint'>;
  /**
   * The action button's look. A screen has one filled button (07 §6), so a
   * card under another screen's hero passes `tinted`. @default 'primary'
   */
  actionVariant?: ButtonVariant;
  /** A second, optional step beside the action (Today's seal offer). */
  secondary?: ReactNode;
};

/**
 * A passage in progress, the same card wherever one is listed (Library's In
 * progress shelf, Today's Also practicing): its title beside a More menu,
 * translation and chunk count, the chunk heatmap, and the one step to take
 * next. A resting verse has a status in the button's place, as there is
 * nothing to open today. Everything else is in the More menu.
 */
export function PassageCard({
  goal,
  chunks,
  action,
  focus = false,
  menu,
  actionVariant = 'primary',
  secondary,
}: PassageCardProps) {
  const colors = useThemeColors();
  const { t } = useTranslation('library');
  const memorized = chunks.filter((c) => c.status === 'memorized').length;
  return (
    <Card>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>
          {goal.title}
        </Text>
        <GoalMenu
          label={t('goal.moreSpoken', { title: goal.title })}
          tint={colors.inkFaint}
          {...menu}
        />
      </View>
      <Text style={[styles.sub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {t('goal.summary', {
          translation: getTranslation(goal.translationId).abbrev,
          done: memorized,
          count: chunks.length,
        })}
      </Text>
      {focus && (
        // A status, not a control: it sits with the summary.
        <Text style={[styles.sub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          {t('goal.onWidgets')}
        </Text>
      )}
      <View
        style={styles.heatmap}
        accessible
        accessibilityLabel={t('goal.heatmap', {
          title: goal.title,
          memorized,
          learning: chunks.filter((c) => c.status === 'learning' || c.status === 'active').length,
          locked: chunks.filter((c) => c.status === 'locked').length,
        })}>
        {chunks.map((c) => (
          <View
            key={c.id}
            style={[
              styles.cell,
              c.status === 'locked'
                ? // Not started: an outline, so it differs from a started
                  // chunk by shape as well as colour.
                  { borderWidth: 1, borderColor: colors.inkFaint }
                : { backgroundColor: cellColor(c, colors) },
            ]}
          />
        ))}
      </View>
      {(action || secondary) && (
        <View style={styles.actions}>
          {action?.kind === 'resting' && (
            <Text
              accessibilityLabel={action.spoken}
              style={[styles.resting, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {action.label}
            </Text>
          )}
          {action?.kind === 'open' && (
            <Button
              variant={actionVariant}
              size="small"
              label={action.label}
              accessibilityLabel={action.spoken}
              onPress={() => router.push(action.href)}
            />
          )}
          {secondary}
        </View>
      )}
    </Card>
  );
}

/** lapisWash → lapis by tier; gold when memorized (docs/07 §6). */
function cellColor(chunk: Chunk, colors: ThemeColors): string {
  if (chunk.status === 'memorized') return colors.gold;
  if (chunk.status === 'locked') return colors.separator;
  const level = Math.min(chunk.tier, 5) / 5;
  // Blend lapisWash → lapis in 6 steps via opacity layering approximation.
  return level < 0.2 ? colors.lapisWash : level < 0.6 ? `${colors.lapis}88` : colors.lapis;
}

const styles = StyleSheet.create({
  // The title wraps beside the More button, which stays top-right.
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { flex: 1, fontSize: 17, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: spacing.xs },
  heatmap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.md,
  },
  cell: { width: 16, height: 16, borderRadius: radius.cell },
  // The card's step at the leading edge, sized to its label; a second one
  // wraps under it when the row is too narrow for both.
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.lg,
    marginTop: spacing.md,
  },
  resting: { fontSize: 15, fontWeight: '600' },
});
