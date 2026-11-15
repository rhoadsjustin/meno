/**
 * The widget's localized copy (docs/05 §1). The widget runtime can't load
 * the i18n catalogs, so every word is rendered here in the UI language and
 * shipped as a prop. Pure, so the wording of each state is unit-tested.
 */
import { t } from '@/i18n';

import type { MenoWidgetProps } from '@/widgets/MenoWidget';

export type WidgetCopy =
  | 'streakCaption'
  | 'dueBadge'
  | 'referenceNote'
  | 'emptyPrompt'
  | 'inlineEmpty'
  | 'dueLine'
  | 'streakLabel'
  | 'weekLabel';

export type WidgetData = Omit<MenoWidgetProps, WidgetCopy>;

/** What VoiceOver says for the streak count and its flame or dot. */
function streakLabel(props: WidgetData): string {
  if (props.streak <= 0) return t('widgets:streakLabelNone');
  return props.streakActiveToday
    ? t('widgets:streakLabelActive', { count: props.streak })
    : t('widgets:streakLabelPending', { count: props.streak });
}

/** Fills in the widget's localized copy from the data fields. */
export function withCopy(props: WidgetData): MenoWidgetProps {
  const days = props.weekGrid.length;
  const practiced = props.weekGrid.split('').filter((c) => c === '1').length;
  return {
    ...props,
    streakCaption: t('widgets:streakCaption', { count: props.streak }),
    dueBadge: t('widgets:dueBadge', { count: props.dueCount }),
    referenceNote: props.memorized ? t('widgets:memorizedNote') : t('widgets:fromMemoryNote'),
    emptyPrompt: t('widgets:emptyPrompt'),
    inlineEmpty: t('widgets:inlineEmpty'),
    dueLine: props.dueRefs ? t('widgets:dueList', { refs: props.dueRefs }) : t('widgets:nothingDue'),
    streakLabel: streakLabel(props),
    weekLabel: t('widgets:weekLabel', { practiced, days }),
  };
}
