/**
 * Goal wizard (docs/07 §6): Passage → Plan, presented as a native form
 * sheet. Translation rides along as a menu on the passage step.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { contentColumn, useContentLayout } from '@/components/content-layout';
import { loadFailureMessage, PassageStep } from '@/features/goals/PassageStep';
import { DEFAULT_TRANSLATION_ID, availableTranslations, formatRange } from '@/services/bible';
import {
  defaultSelection,
  selectionToRange,
  type PassageSelection,
} from '@/services/bible/selection';
import { createGoal, previewGoal, type GoalPreview } from '@/services/db/repos/goals';
import { lastTranslationId, rememberTranslation } from '@/services/db/repos/wizardPrefs';
import { useThemeColors, fonts, radius, spacing } from '@/theme';

type Step = 'passage' | 'plan';

const DEFAULT_BOOK_ID = 'John';

/** The translation chosen last time, if it can still be used; else the default. */
async function initialTranslationId(): Promise<string> {
  try {
    const last = await lastTranslationId();
    if (last && availableTranslations().some((t) => t.id === last)) return last;
  } catch {
    // An unreadable preference is not worth blocking the wizard over.
  }
  return DEFAULT_TRANSLATION_ID;
}

export function GoalWizard() {
  const colors = useThemeColors();
  // The side insets matter on iPhone Duo, where the status bar and camera
  // sit in one corner of the cover panel.
  const { sides } = useContentLayout();
  const [step, setStep] = useState<Step>('passage');

  const [initialTranslation] = useState(initialTranslationId);
  const [translationId, setTranslationId] = useState<string | null>(null);
  const [bookId, setBookId] = useState(DEFAULT_BOOK_ID);
  const [chapter, setChapter] = useState(1);
  // Starts on a real verse so the sheet can be continued without choosing.
  const [selection, setSelection] = useState<PassageSelection | null>(() =>
    defaultSelection(DEFAULT_BOOK_ID)
  );

  const [preview, setPreview] = useState<GoalPreview | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The chapter on screen has loaded. While it has not (still loading, or a
  // licensed translation with no connection) Continue would only fail.
  const [chapterReady, setChapterReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void initialTranslation.then((id) => {
      if (!cancelled) setTranslationId((current) => current ?? id);
    });
    return () => {
      cancelled = true;
    };
  }, [initialTranslation]);

  const selectTranslation = useCallback((id: string) => {
    setError(null);
    setTranslationId(id);
    void rememberTranslation(id).catch(() => {});
  }, []);

  const selectBook = useCallback((id: string) => {
    setError(null);
    setBookId(id);
    setChapter(1);
    setSelection(defaultSelection(id));
  }, []);

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
      setError(loadFailureMessage(id, formatRange(range)));
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
      // Opened by a link with nothing beneath it, there is nowhere to go back
      // to and the sheet would sit on its spinner.
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }, [translationId, selection, title]);

  const canAdvance = !busy && (step === 'plan' || (selection !== null && chapterReady));

  return (
    <View style={[styles.root, sides, { backgroundColor: colors.surfaceRaised }]}>
      {step === 'passage' && (
        <PassageStep
          heading={<StepHeading title="Choose a passage" step={1} />}
          translationId={translationId}
          onTranslationChange={selectTranslation}
          bookId={bookId}
          onBookChange={selectBook}
          chapter={chapter}
          onChapterChange={setChapter}
          selection={selection}
          setSelection={setSelection}
          error={error}
          onReadyChange={setChapterReady}
        />
      )}

      {step === 'plan' && (
        <ScrollView
          contentContainerStyle={[styles.content, contentColumn]}
          keyboardShouldPersistTaps="handled">
          <StepHeading title="Your plan" step={2} />
          {preview && selection && (
            <View style={styles.section}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={formatRange(selectionToRange(selection))}
                placeholderTextColor={colors.inkFaint}
                style={[
                  styles.titleInput,
                  { color: colors.ink, borderColor: colors.separator, fontFamily: fonts?.ui },
                ]}
                accessibilityLabel="Passage name"
              />
              <View style={styles.statsRow}>
                <Stat label="Verses" value={String(preview.verseCount)} />
                <Stat label="Words" value={String(preview.wordCount)} />
                <Stat label="Chunks" value={String(preview.chunks.length)} />
                <Stat label="Est. days" value={`~${preview.projectedDays}`} />
              </View>
              <Text style={[styles.planNote, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                About one new chunk a day, with reviews to keep what you’ve hidden.
              </Text>
            </View>
          )}
          {error && (
            <Text style={[styles.error, { color: colors.error, fontFamily: fonts?.ui }]}>
              {error}
            </Text>
          )}
        </ScrollView>
      )}

      <View style={[styles.footer, { borderTopColor: colors.separator }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setError(null);
            if (step === 'passage') router.back();
            else setStep('passage');
          }}
          style={styles.footerSecondary}>
          <Text style={[styles.footerSecondaryText, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {step === 'passage' ? 'Cancel' : 'Back'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAdvance, busy }}
          disabled={!canAdvance}
          onPress={() => {
            if (step === 'passage') void toPlan();
            else void confirm();
          }}
          style={[
            styles.footerPrimary,
            { backgroundColor: colors.lapis, opacity: canAdvance ? 1 : 0.6 },
          ]}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.footerPrimaryText, { fontFamily: fonts?.ui }]}>
              {step === 'plan' ? 'Start memorizing' : 'Continue'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function StepHeading({ title, step }: { title: string; step: number }) {
  const colors = useThemeColors();
  return (
    <View>
      <Text
        accessibilityRole="header"
        style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
        {title}
      </Text>
      <Text style={[styles.stepLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        Step {step} of 2
      </Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View accessible accessibilityLabel={`${value} ${label}`} style={styles.stat}>
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
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.sm },
  heading: { fontSize: 22, fontWeight: '700', marginTop: spacing.sm },
  stepLabel: { fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.xs },
  section: { gap: spacing.md, marginTop: spacing.sm },
  planNote: { fontSize: 13, lineHeight: 18 },
  titleInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.md,
    fontSize: 17,
  },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginVertical: spacing.md },
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
  footerSecondary: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  footerSecondaryText: { fontSize: 17 },
  footerPrimary: {
    borderRadius: 999,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    minWidth: 160,
    alignItems: 'center',
  },
  footerPrimaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
