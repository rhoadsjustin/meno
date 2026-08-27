/**
 * Goal wizard (docs/07 §6): Translation → Passage → Preview → Confirm,
 * presented as a native form sheet. WEB/KJV/ASV only until M6.
 */
import { Host, Picker } from '@expo/ui';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  BOOKS,
  DEFAULT_TRANSLATION_ID,
  formatRange,
  getBook,
  getChapterVerseCount,
  TRANSLATIONS,
} from '@/services/bible';
import type { RefRange } from '@/services/bible/types';
import { createGoal, previewGoal, type GoalPreview } from '@/services/db/repos/goals';
import { useThemeColors, fonts, radius, spacing } from '@/theme';

type Step = 'translation' | 'passage' | 'preview';

export function GoalWizard() {
  const colors = useThemeColors();
  const [step, setStep] = useState<Step>('translation');

  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [bookId, setBookId] = useState('John');
  const [startChapter, setStartChapter] = useState(1);
  const [startVerse, setStartVerse] = useState(1);
  const [endChapter, setEndChapter] = useState(1);
  const [endVerse, setEndVerse] = useState(1);
  const [verseCounts, setVerseCounts] = useState<Record<number, number>>({});

  const [preview, setPreview] = useState<GoalPreview | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const book = getBook(bookId);
  const range: RefRange = useMemo(
    () => ({
      start: { bookId, chapter: startChapter, verse: startVerse },
      end: { bookId, chapter: endChapter, verse: endVerse },
    }),
    [bookId, startChapter, startVerse, endChapter, endVerse]
  );

  // Load verse counts for the chapters in play; clamp selections to bounds.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const counts: Record<number, number> = {};
      for (const ch of new Set([startChapter, endChapter])) {
        counts[ch] = await getChapterVerseCount(translationId, bookId, ch);
      }
      if (cancelled) return;
      setVerseCounts(counts);
      const startMax = counts[startChapter];
      if (startMax) setStartVerse((v) => (v > startMax ? 1 : v));
      const endMax = counts[endChapter];
      if (endMax) setEndVerse((v) => (v > endMax ? endMax : v));
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [translationId, bookId, startChapter, endChapter]);

  const selectBook = useCallback((id: string) => {
    setBookId(id);
    setStartChapter(1);
    setStartVerse(1);
    setEndChapter(1);
    setEndVerse(1);
  }, []);

  const toPreview = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await previewGoal(translationId, range);
      setPreview(p);
      setTitle(formatRange(range));
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [translationId, range]);

  const confirm = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await createGoal({ translationId, range, title: title.trim() || formatRange(range) });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }, [translationId, range, title]);

  const stepIndex = step === 'translation' ? 0 : step === 'passage' ? 1 : 2;

  return (
    <View style={[styles.root, { backgroundColor: colors.surfaceRaised }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, { color: colors.ink, fontFamily: fonts?.ui }]}>
          {step === 'translation' && 'Choose a translation'}
          {step === 'passage' && 'Choose a passage'}
          {step === 'preview' && 'Your plan'}
        </Text>
        <Text style={[styles.stepLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          Step {stepIndex + 1} of 3
        </Text>

        {step === 'translation' && (
          <View style={styles.section}>
            {TRANSLATIONS.map((t) => {
              const selected = t.id === translationId;
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setTranslationId(t.id)}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: selected ? colors.lapisWash : 'transparent',
                      borderColor: selected ? colors.lapis : colors.separator,
                    },
                  ]}>
                  <Text style={[styles.optionTitle, { color: colors.ink, fontFamily: fonts?.ui }]}>
                    {t.name}
                  </Text>
                  <Text style={[styles.optionSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
                    {t.abbrev} · {t.licenseType === 'public_domain' ? 'Offline, no restrictions' : t.attribution}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {step === 'passage' && (
          <View style={styles.section}>
            <PickerRow label="Book">
              <Host matchContents>
                <Picker selectedValue={bookId} onValueChange={(v) => selectBook(String(v))}>
                  {BOOKS.map((b) => (
                    <Picker.Item key={b.id} label={b.name} value={b.id} />
                  ))}
                </Picker>
              </Host>
            </PickerRow>
            <PickerRow label="From">
              <Host matchContents>
                <Picker
                  selectedValue={startChapter}
                  onValueChange={(v) => {
                    const ch = Number(v);
                    setStartChapter(ch);
                    if (endChapter < ch) setEndChapter(ch);
                  }}>
                  {Array.from({ length: book.chapters }, (_, i) => (
                    <Picker.Item key={i + 1} label={`Chapter ${i + 1}`} value={i + 1} />
                  ))}
                </Picker>
              </Host>
              <Host matchContents>
                <Picker selectedValue={startVerse} onValueChange={(v) => setStartVerse(Number(v))}>
                  {Array.from({ length: verseCounts[startChapter] ?? 1 }, (_, i) => (
                    <Picker.Item key={i + 1} label={`Verse ${i + 1}`} value={i + 1} />
                  ))}
                </Picker>
              </Host>
            </PickerRow>
            <PickerRow label="Through">
              <Host matchContents>
                <Picker
                  selectedValue={endChapter}
                  onValueChange={(v) => {
                    const ch = Number(v);
                    setEndChapter(ch);
                    const max = verseCounts[ch];
                    if (max) setEndVerse(max);
                  }}>
                  {Array.from({ length: book.chapters - startChapter + 1 }, (_, i) => {
                    const ch = startChapter + i;
                    return <Picker.Item key={ch} label={`Chapter ${ch}`} value={ch} />;
                  })}
                </Picker>
              </Host>
              <Host matchContents>
                <Picker selectedValue={endVerse} onValueChange={(v) => setEndVerse(Number(v))}>
                  {Array.from({ length: verseCounts[endChapter] ?? 1 }, (_, i) => (
                    <Picker.Item key={i + 1} label={`Verse ${i + 1}`} value={i + 1} />
                  ))}
                </Picker>
              </Host>
            </PickerRow>
            <Text style={[styles.rangeEcho, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              {formatRange(range)}
            </Text>
          </View>
        )}

        {step === 'preview' && preview && (
          <View style={styles.section}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={formatRange(range)}
              placeholderTextColor={colors.inkFaint}
              style={[
                styles.titleInput,
                { color: colors.ink, borderColor: colors.separator, fontFamily: fonts?.ui },
              ]}
              accessibilityLabel="Goal name"
            />
            <View style={styles.statsRow}>
              <Stat label="Verses" value={String(preview.verseCount)} />
              <Stat label="Words" value={String(preview.wordCount)} />
              <Stat label="Chunks" value={String(preview.chunks.length)} />
              <Stat label="Est. days" value={`~${preview.projectedDays}`} />
            </View>
            <Text style={[styles.optionSub, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
              About one new chunk a day, with reviews to keep what you’ve hidden.
            </Text>
          </View>
        )}

        {error && (
          <Text style={[styles.error, { color: colors.error, fontFamily: fonts?.ui }]}>{error}</Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.separator }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (step === 'translation') router.back();
            else if (step === 'passage') setStep('translation');
            else setStep('passage');
          }}
          style={styles.footerSecondary}>
          <Text style={[styles.footerSecondaryText, { color: colors.lapis, fontFamily: fonts?.ui }]}>
            {step === 'translation' ? 'Cancel' : 'Back'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            if (step === 'translation') setStep('passage');
            else if (step === 'passage') void toPreview();
            else void confirm();
          }}
          style={[styles.footerPrimary, { backgroundColor: colors.lapis, opacity: busy ? 0.6 : 1 }]}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.footerPrimaryText, { fontFamily: fonts?.ui }]}>
              {step === 'preview' ? 'Start memorizing' : 'Continue'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function PickerRow({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={styles.pickerRow}>
      <Text style={[styles.pickerLabel, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
        {label}
      </Text>
      <View style={styles.pickerControls}>{children}</View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.stat}>
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
  stepLabel: { fontSize: 13, marginBottom: spacing.md },
  section: { gap: spacing.md },
  optionRow: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  optionTitle: { fontSize: 17, fontWeight: '600' },
  optionSub: { fontSize: 13, lineHeight: 18 },
  pickerRow: { gap: spacing.xs },
  pickerLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerControls: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  rangeEcho: { fontSize: 15, marginTop: spacing.sm },
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
