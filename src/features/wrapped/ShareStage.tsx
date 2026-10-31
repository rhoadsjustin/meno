/**
 * Turns a recap card into a share image (docs/10 §6). The card is drawn
 * off-screen at a fixed canvas, captured with react-native-view-shot, and
 * handed to the system share sheet. Nothing is uploaded or kept: the image
 * goes wherever the user sends it, and the temp file is the OS's to clear.
 *
 * The canvas is sized in points so the capture comes out exactly 1080px
 * wide at the device's pixel ratio, whatever the window or Duo pose.
 */
import * as Sharing from 'expo-sharing';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { PixelRatio, StyleSheet, View, type ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { CANVAS, RecapCard } from '@/features/wrapped/RecapCard';
import type { RecapView } from '@/features/wrapped/recap-view';
import { t } from '@/i18n';
import type { CardId } from '@/services/wrapped';
import type { ColorScheme } from '@/theme';

export type ShareFormat = 'story' | 'square';

export type ShareStageHandle = {
  /** Renders, captures and shares one card. Resolves when the sheet closes. */
  share(card: CardId, format: ShareFormat): Promise<void>;
};

const OUTPUT_WIDTH = 1080;

/** `id` remounts the canvas for every share, so its layout event always fires. */
type Job = { card: CardId; format: ShareFormat; id: number };

export const ShareStage = forwardRef<ShareStageHandle, { view: RecapView; scheme: ColorScheme }>(
  function ShareStage({ view, scheme }, ref) {
    const target = useRef<ViewInstance>(null);
    const year = view.recap.year;
    const [job, setJob] = useState<Job | null>(null);
    const ready = useRef<(() => void) | null>(null);
    const jobs = useRef(0);

    useImperativeHandle(ref, () => ({
      async share(card, format) {
        // Mount the card, then wait for it to lay out before capturing.
        // A timeout backs the layout event up: a share must never hang.
        const laidOut = new Promise<void>((resolve) => {
          ready.current = resolve;
          setTimeout(resolve, 1500);
        });
        jobs.current += 1;
        setJob({ card, format, id: jobs.current });
        await laidOut;
        await nextFrame();
        try {
          // view-shot's width/height are points, multiplied by the pixel ratio.
          const canvas = CANVAS[format];
          const ratio = PixelRatio.get();
          const uri = await captureRef(target.current, {
            format: 'png',
            result: 'tmpfile',
            fileName: `meno-${year}-${card}`,
            width: OUTPUT_WIDTH / ratio,
            height: (OUTPUT_WIDTH * canvas.height) / canvas.width / ratio,
          });
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            UTI: 'public.png',
            dialogTitle: t('wrapped:share.dialogTitle'),
          });
        } finally {
          setJob(null);
        }
      },
    }));

    if (!job) return null;
    const unit = OUTPUT_WIDTH / PixelRatio.get() / CANVAS[job.format].width;
    return (
      // Far off-screen, not hidden: a transparent or zero-opacity view would
      // capture as transparent too.
      <View pointerEvents="none" style={styles.offscreen} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View
          key={job.id}
          ref={target}
          collapsable={false}
          onLayout={() => {
            ready.current?.();
            ready.current = null;
          }}>
          <RecapCard view={view} card={job.card} variant={job.format} scheme={scheme} unit={unit} />
        </View>
      </View>
    );
  },
);

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', top: 0, left: -10_000 },
});
