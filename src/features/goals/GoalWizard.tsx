/**
 * Goal wizard (docs/07 §6): Passage → Plan, presented as a native form
 * sheet. Translation rides along as a menu on the passage step.
 *
 * The route takes an optional verse to open on (`bookId`, `chapter`, `verse`,
 * and a `translation` id), which is how the reader's "Memorize this…" lands
 * here; without one it opens on John 1:1.
 */
import { useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { closeModal } from '@/components/close-modal';
import { contentColumn, useContentLayout } from '@/components/content-layout';
import { announce } from '@/components/screen-reader';
import { PassageStep } from '@/features/goals/PassageStep';
import { WizardExitButton } from '@/features/goals/WizardExitButton';
import { Button } from '@/components/button';
import { locale } from '@/i18n';
import { useTranslation } from '@/i18n/react';
import {
  BOOKS,
  DEFAULT_TRANSLATION_ID,
  availableTranslations,
  formatRange,
  loadFailureMessage,
  getTranslation,
  translationHasBook,
} from '@/services/bible';
import {
  defaultSelection,
  sameSelection,
  selectionFromParams,
  selectionToRange,
  type PassageSelection,
} from '@/services/bible/selection';
import { createGoal, previewGoal, type GoalPreview } from '@/services/db/repos/goals';
import { lastTranslationId, rememberTranslation } from '@/services/db/repos/wizardPrefs';
import { useThemeColors, fonts, radius, spacing, textStyle } from '@/theme';

type Step = 'passage' | 'plan';

const DEFAULT_BOOK_ID = 'John';

/** The pinned Cancel/Continue bar is chrome, like the selection bar above it
 * (PassageStep's BAR_MAX_SCALE): it grows with Dynamic Type, but not so far
 * that a short window (iPhone Duo opened in landscape) loses the verse list. */
const FOOTER_MAX_SCALE = 1.6;

/** A route param as one string; a repeated param is not a value. */
function oneParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * The translation to open with: the one the link asked for, else the one
 * chosen last time, if it can still be used and has the opening book; else
 * the default, which has every book.
 */
async function initialTranslationId(asked: string | undefined, bookId: string): Promise<string> {
  const usable = (id: string | null | undefined): id is string => {
    const found = id ? availableTranslations().find((t) => t.id === id) : undefined;
    return found !== undefined && translationHasBook(found, bookId);
  };
  if (usable(asked)) return asked;
  try {
    const last = await lastTranslationId();
    if (usable(last)) return last;
  } catch {
    // An unreadable preference is not worth blocking the wizard over.
  }
  return DEFAULT_TRANSLATION_ID;
}

export function GoalWizard() {
  const colors = useThemeColors();
  const { t } = useTranslation(['goals', 'common']);
  // Insets are the sheet's own (the route wraps this in ModalSafeArea). The
  // sides matter on iPhone Duo's cover panel, where the status bar and camera
  // sit in one corner; the bottom keeps the buttons off the home indicator.
  const { sides, insets } = useContentLayout();
  const [step, setStep] = useState<Step>('passage');

  // Params can come from a link, so they are parsed and checked against the
  // canon (services/bible) and only read once: the sheet does not jump if
  // they change under it.
  const params = useLocalSearchParams<{
    bookId?: string | string[];
    chapter?: string | string[];
    verse?: string | string[];
    translation?: string | string[];
  }>();
  // Starts on a real verse so the sheet can be continued without choosing.
  const [opening] = useState<PassageSelection>(
    () => selectionFromParams(params) ?? defaultSelection(DEFAULT_BOOK_ID),
  );
  const [initialTranslation] = useState(() =>
    initialTranslationId(oneParam(params.translation), opening.bookId),
  );
  const [translationId, setTranslationId] = useState<string | null>(null);
  const [bookId, setBookId] = useState(opening.bookId);
  const [chapter, setChapter] = useState(opening.start.chapter);
  const [selection, setSelection] = useState<PassageSelection | null>(opening);

  const [preview, setPreview] = useState<GoalPreview | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The chapter on screen has loaded. While it has not (still loading, or a
  // licensed translation with no connection) Continue would only fail.
  const [chapterReady, setChapterReady] = useState(false);

  // Something would be lost by closing: verses other than the ones the sheet
  // opened on, or a name typed on the plan step.
  const range = selection ? selectionToRange(selection) : null;
  const dirty =
    (selection !== null && !sameSelection(selection, opening)) ||
    (step === 'plan' && range !== null && title.trim() !== '' && title !== formatRange(range));
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // Set once the sheet is meant to close (goal created, or Discard tapped).
  const [leaving, setLeaving] = useState(false);
  const repeatRemoval = useRef<(() => void) | null>(null);
  // Covers Cancel, the swipe down and Android's back alike: each is the same
  // removal as far as the navigator is concerned. While a goal is being
  // previewed or created the sheet simply stays, so the work cannot finish
  // against a sheet that has gone.
  const allowRemoval = usePreventRemove((dirty || busy) && !leaving, ({ repeat }) => {
    if (busy) return;
    repeatRemoval.current = repeat;
    setConfirmingDiscard(true);
  });
  const discard = useCallback(() => {
    setConfirmingDiscard(false);
    setLeaving(true);
    const repeat = repeatRemoval.current;
    repeatRemoval.current = null;
    if (repeat) repeat();
    else {
      allowRemoval();
      closeModal();
    }
  }, [allowRemoval]);

  useEffect(() => {
    let cancelled = false;
    void initialTranslation.then((id) => {
      if (!cancelled) setTranslationId((current) => current ?? id);
    });
    return () => {
      cancelled = true;
    };
  }, [initialTranslation]);

  const selectBook = useCallback((id: string) => {
    setError(null);
    setBookId(id);
    setChapter(1);
    setSelection(defaultSelection(id));
  }, []);

  const selectTranslation = useCallback(
    (id: string) => {
      setError(null);
      setTranslationId(id);
      void rememberTranslation(id).catch(() => {});
      // A New Testament, or a few books: open on the first book it has.
      const tr = getTranslation(id);
      if (!translationHasBook(tr, bookId)) {
        const first = BOOKS.find((b) => translationHasBook(tr, b.id));
        if (first) selectBook(first.id);
      }
    },
    [bookId, selectBook],
  );

  const toPlan = useCallback(async () => {
    if (!selection) return;
    const range = selectionToRange(selection);
    setBusy(true);
    setError(null);
    // Continue can land before the remembered translation has been read.
    const id = translationId ?? (await initialTranslation);
    try {
      const p = await previewGoal(id, range);
      setPreview(p);
      setTitle(formatRange(range));
      setStep('plan');
    } catch {
      const message = loadFailureMessage(id, formatRange(range));
      setError(message);
      // The message replaces a hint out of VoiceOver's focus: say it.
      announce(message);
    } finally {
      setBusy(false);
    }
  }, [selection, translationId, initialTranslation]);

  const confirm = useCallback(async () => {
    if (!selection || !translationId) return;
    const range = selectionToRange(selection);
    setBusy(true);
    setError(null);
    try {
      await createGoal({ translationId, range, title: title.trim() || formatRange(range) });
      setConfirmingDiscard(false);
      setLeaving(true);
      allowRemoval();
      closeModal();
    } catch {
      const message = loadFailureMessage(translationId, formatRange(range));
      setError(message);
      announce(message);
      setBusy(false);
    }
  }, [translationId, selection, title, allowRemoval]);

  const canAdvance = !busy && (step === 'plan' || (selection !== null && chapterReady));

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surfaceRaised }]}>
      <View style={styles.steps}>
        {/* Stays mounted under the plan, so Back returns to the same chapter
            at the same scroll position with nothing loaded again. It keeps
            its layout (the plan covers it) rather than collapsing, which
            would cost the list its place. */}
        <View
          style={styles.step}
          pointerEvents={step === 'passage' ? 'auto' : 'none'}
          accessibilityElementsHidden={step !== 'passage'}
          importantForAccessibility={step === 'passage' ? 'auto' : 'no-hide-descendants'}>
          <PassageStep
            heading={<StepHeading title={t('wizard.choosePassage')} step={1} />}
            translationId={translationId}
            onTranslationChange={selectTranslation}
            bookId={bookId}
            onBookChange={selectBook}
            chapter={chapter}
            onChapterChange={setChapter}
            selection={selection}
            setSelection={setSelection}
            initialVerse={opening.start.verse}
            error={error}
            onReadyChange={setChapterReady}
          />
        </View>

        {step === 'plan' && (
          <ScrollView
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceRaised }]}
            contentContainerStyle={[styles.content, contentColumn]}
            keyboardShouldPersistTaps="handled">
            <StepHeading title={t('wizard.yourPlan')} step={2} />
            {preview && selection && (
              <View style={styles.section}>
                <View style={styles.field}>
                  {/* Says what the box is for; the input carries the same
                    words as its spoken label, so this is not read twice. */}
                  <Text
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    style={[styles.fieldLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                    {t('wizard.passageName')}
                  </Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder={formatRange(selectionToRange(selection))}
                    placeholderTextColor={colors.inkFaint}
                    clearButtonMode="while-editing"
                    returnKeyType="done"
                    style={[
                      styles.titleInput,
                      { color: colors.ink, borderColor: colors.separator, fontFamily: fonts?.ui },
                    ]}
                    accessibilityLabel={t('wizard.passageName')}
                  />
                </View>
                <View style={styles.statsRow}>
                  <Stat label={t('stats.verses')} value={String(preview.verseCount)} />
                  <Stat label={t('stats.words')} value={String(preview.wordCount)} />
                  <Stat label={t('stats.chunks')} value={String(preview.chunks.length)} />
                  <Stat label={t('stats.estDays')} value={`~${preview.projectedDays}`} />
                </View>
                <Text style={[styles.planNote, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                  {t('wizard.planNote')}
                </Text>
                {/* The estimated completion date (03 §5). */}
                <Text style={[styles.planNote, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                  {t('wizard.finishAround', { date: finishDate(preview.projectedDays) })}
                </Text>
              </View>
            )}
            {error && (
              <Text
                accessibilityRole="alert"
                style={[styles.error, { color: colors.error, fontFamily: fonts?.ui }]}>
                {error}
              </Text>
            )}
          </ScrollView>
        )}
      </View>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.separator,
            paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.sm),
          },
        ]}>
        <WizardExitButton
          label={step === 'passage' ? t('common:cancel') : t('common:back')}
          maxFontSizeMultiplier={FOOTER_MAX_SCALE}
          // Not while a plan is being worked out or a goal created: the
          // sheet would close, or step back, under work that then finishes.
          disabled={busy}
          onPress={() => {
            setError(null);
            // With a passage chosen this is held back and asks first (above).
            if (step === 'passage') closeModal();
            else setStep('passage');
          }}
          confirming={confirmingDiscard}
          onConfirmingChange={setConfirmingDiscard}
          prompt={{
            title: t('wizard.discardTitle'),
            message: t('wizard.discardMessage'),
            confirm: t('wizard.discard'),
            keep: t('wizard.keepEditing'),
          }}
          onDiscard={discard}
          tint={colors.lapis}
          style={styles.footerSecondary}
        />
        <Button
          label={step === 'plan' ? t('wizard.startMemorizing') : t('common:continue')}
          maxFontSizeMultiplier={FOOTER_MAX_SCALE}
          disabled={!canAdvance}
          busy={busy}
          onPress={() => {
            if (step === 'passage') void toPlan();
            else void confirm();
          }}
          style={styles.footerPrimary}
        />
      </View>
    </View>
  );
}

function StepHeading({ title, step }: { title: string; step: number }) {
  const colors = useThemeColors();
  const { t } = useTranslation('goals');
  return (
    <View>
      <Text
        accessibilityRole="header"
        style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {title}
      </Text>
      <Text style={[styles.stepLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {t('wizard.stepOf', { step, total: 2 })}
      </Text>
    </View>
  );
}

/** Today plus the plan's days, e.g. "November 25" (with the year once it changes). */
function finishDate(days: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return date.toLocaleDateString(locale(), {
    month: 'long',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  const { t } = useTranslation('goals');
  return (
    <View accessible accessibilityLabel={t('stats.a11y', { value, label })} style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.ink, fontFamily: fonts?.scripture }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  steps: { flex: 1 },
  step: { flex: 1 },
  field: { gap: spacing.xs },
  fieldLabel: textStyle.footnote,
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.sm },
  heading: { fontSize: 22, fontWeight: '700', marginTop: spacing.sm },
  stepLabel: { fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.xs },
  section: { gap: spacing.md, marginTop: spacing.sm },
  planNote: textStyle.footnote,
  titleInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.md,
    fontSize: 17,
  },
  // Wraps: at accessibility sizes four stats are wider than the sheet.
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xl,
    rowGap: spacing.md,
    marginVertical: spacing.md,
  },
  stat: { alignItems: 'flex-start' },
  statValue: { fontSize: 28 },
  statLabel: { fontSize: 13 },
  error: { fontSize: 15, marginTop: spacing.md },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerSecondary: { paddingHorizontal: spacing.sm },
  footerPrimary: { paddingHorizontal: spacing.xxl, minWidth: 160 },
});
