/**
 * Due for review: every memorized verse whose review date has arrived, most
 * overdue first. Today's row opens this when more than one is due; a row
 * reviews that verse, the button runs the usual session (docs/03 §6).
 */
import { router, useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActionFooter } from '@/components/action-footer';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { closeModal } from '@/components/close-modal';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { FoldAwareRow } from '@/components/fold-aware-row';
import { NavRow } from '@/components/nav-row';
import { ScreenHeader } from '@/components/screen-header';
import { LoadingState, Unavailable } from '@/components/unavailable';
import { useTranslation } from '@/i18n/react';
import { formatRange, getTranslation } from '@/services/bible';
import { dueReviewList, itemHealth, type DueReview } from '@/services/db/repos/reviews';
import { useThemeColors, layout, spacing } from '@/theme';

type State = { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; due: DueReview[] };

export function DueReviews() {
  const colors = useThemeColors();
  const { t } = useTranslation(['review', 'library', 'common']);
  const { sides, foldAxis } = useContentLayout();
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async (isCancelled: () => boolean) => {
    try {
      const due = await dueReviewList();
      if (!isCancelled()) setState({ kind: 'ready', due });
    } catch {
      if (!isCancelled()) setState({ kind: 'failed' });
    }
  }, []);

  // On every return too: a verse just reviewed is no longer due.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void load(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const retry = useCallback(() => {
    setState({ kind: 'loading' });
    void load(() => false);
  }, [load]);

  const due = state.kind === 'ready' ? state.due : [];

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surface }]}>
      <ScreenHeader title={t('due.title')} />
      {/* Half-open on iPhone Duo the crease would run through every row and
          the button, so the list moves into the leading half: an empty
          second pane makes the row size the first one up to the crease.
          Flat, the row leaves its one pane at full width, in the same place
          in the tree, so folding remounts nothing. */}
      <FoldAwareRow fill>
        <View style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentColumn]}
            contentInsetAdjustmentBehavior="automatic">
            {state.kind === 'loading' && <LoadingState layout="inline" />}

            {state.kind === 'failed' && (
              <Unavailable
                kind="failed"
                title={t('loadFailedTitle')}
                message={t('loadFailedBody')}
                action={{ label: t('common:retry'), onPress: retry }}
                secondaryAction={{ label: t('common:done'), onPress: closeModal }}
              />
            )}

            {state.kind === 'ready' && due.length === 0 && (
              <Unavailable
                kind="empty"
                symbol={{ ios: 'checkmark.circle', android: 'check_circle' }}
                title={t('emptyTitle')}
                message={t('emptyBody')}
                action={{ label: t('common:done'), onPress: closeModal }}
              />
            )}

            {due.length > 0 && (
              <Card>
                {due.map(({ item, chunk, translationId }, i) => {
                  const health = itemHealth(item);
                  return (
                    <Fragment key={item.id}>
                      {i > 0 && (
                        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
                      )}
                      <NavRow
                        title={formatRange({
                          start: {
                            bookId: chunk.startBookId,
                            chapter: chunk.startChapter,
                            verse: chunk.startVerse,
                          },
                          end: {
                            bookId: chunk.endBookId,
                            chapter: chunk.endChapter,
                            verse: chunk.endVerse,
                          },
                        })}
                        detail={t('library:memorizedDetail', {
                          translation: getTranslation(translationId).abbrev,
                          health:
                            health === 'atRisk'
                              ? t('library:health.atRisk')
                              : health === 'fading'
                                ? t('library:health.fading')
                                : t('library:health.fresh'),
                        })}
                        accessibilityHint={t('due.rowHint')}
                        onPress={() =>
                          router.push({ pathname: '/review', params: { item: item.id } })
                        }
                      />
                    </Fragment>
                  );
                })}
              </Card>
            )}
          </ScrollView>
          {/* Pinned, so the way into the session stays on screen however long
          the list is (short windows most of all). */}
          {due.length > 0 && (
            <ActionFooter>
              <Button label={t('due.start')} onPress={() => router.push('/review')} />
            </ActionFooter>
          )}
        </View>
        {foldAxis === 'vertical' ? <View /> : null}
      </FoldAwareRow>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: layout.screenMargin, paddingBottom: spacing.xxxl },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
});
