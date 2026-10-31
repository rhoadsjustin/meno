import { closeModal } from '@/components/close-modal';
import type { LanguageSummary, Translation } from '@/services/bible';

/** A row of the translation picker's lists. */
export type PickerItem =
  | { kind: 'translation'; translation: Translation; languageTitle?: string }
  | { kind: 'language'; language: LanguageSummary };

export type PickerSection = { key: string; title: string; data: PickerItem[] };

type ParentNavigation = { canGoBack(): boolean; goBack(): void };

/**
 * Closes the whole picker from either of its screens. The picker is a stack
 * of its own inside the modal, so a plain back would only pop to its first
 * screen; the parent stack is the one that dismisses the modal.
 */
export function closePicker(navigation: { getParent(): ParentNavigation | undefined }) {
  const parent = navigation.getParent();
  if (parent?.canGoBack()) parent.goBack();
  else closeModal();
}
