import React from 'react';
import {
  AbsoluteFill,
  Freeze,
  Img,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import { C, SANS, SERIF } from './theme';

export type Theme = 'vellum' | 'lapis';

/** Gradient background; lapis scenes deepen toward the bottom. */
export const Background: React.FC<{ theme: Theme }> = ({ theme }) => (
  <AbsoluteFill
    style={{
      background:
        theme === 'vellum'
          ? `linear-gradient(180deg, ${C.vellum} 0%, ${C.lapisWash} 100%)`
          : `linear-gradient(180deg, ${C.lapis} 0%, ${C.lapisDeep} 100%)`,
    }}
  />
);

/** Fades a whole scene in and out over `edge` frames. */
export const Scene: React.FC<{ duration: number; theme: Theme; children: React.ReactNode }> = ({
  duration,
  theme,
  children,
}) => {
  const frame = useCurrentFrame();
  const edge = 8;
  const opacity = interpolate(frame, [0, edge, duration - edge, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      <Background theme={theme} />
      {children}
    </AbsoluteFill>
  );
};

/** Serif headline that rises in, with a sans subhead a beat later. */
export const Headline: React.FC<{ theme: Theme; title: string; sub?: string; top?: number }> = ({
  theme,
  title,
  sub,
  top = 96,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const t = rise(4);
  const s = rise(12);
  return (
    <div style={{ position: 'absolute', top, left: 60, right: 60, textAlign: 'center' }}>
      <div
        style={{
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: 84,
          lineHeight: 1.08,
          letterSpacing: -0.5,
          color: theme === 'vellum' ? C.ink : C.white,
          whiteSpace: 'pre-line',
          opacity: t,
          transform: `translateY(${(1 - t) * 30}px)`,
        }}
      >
        {title}
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 22,
            fontFamily: SANS,
            fontSize: 36,
            lineHeight: 1.35,
            color: theme === 'vellum' ? C.inkFaint : C.onLapisFaint,
            whiteSpace: 'pre-line',
            opacity: s,
            transform: `translateY(${(1 - s) * 20}px)`,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

const SCREEN_W = 1320;
const SCREEN_H = 2868;

/**
 * A phone that slides up and bleeds off the bottom of the frame. The bottom of
 * the screen stays out of view, which also hides the recorder's corner mark.
 * `zoom` scales the whole phone from its top edge (used to push into a detail).
 */
export const Phone: React.FC<{
  width?: number;
  top?: number;
  zoom?: number;
  cleanStatusBar?: boolean;
  children: React.ReactNode;
}> = ({ width = 640, top = 420, zoom = 1, cleanStatusBar = true, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const bezel = 14;
  const screenH = (width * SCREEN_H) / SCREEN_W;
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: top + (1 - enter) * 160,
        width: width + bezel * 2,
        height: screenH + bezel * 2,
        marginLeft: -(width / 2 + bezel),
        transform: `scale(${zoom})`,
        transformOrigin: '50% 0%',
        background: '#0B0C10',
        borderRadius: 78,
        padding: bezel,
        boxShadow: '0 40px 90px rgba(10, 15, 40, 0.35)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width,
          height: screenH,
          borderRadius: 64,
          overflow: 'hidden',
          background: C.vellum,
        }}
      >
        {children}
        {cleanStatusBar ? (
          <Img
            src={staticFile('img/statusbar.png')}
            style={{ position: 'absolute', top: 0, left: 0, width }}
          />
        ) : null}
      </div>
    </div>
  );
};

/** A screen recording that fills the phone screen; `holdFrom` freezes it there. */
export const Clip: React.FC<{
  src: string;
  startFrom: number; // seconds into the recording
  rate?: number;
  holdFrom?: number; // scene frame from which the picture freezes
}> = ({ src, startFrom, rate = 1, holdFrom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const video = (
    <OffthreadVideo
      src={staticFile(src)}
      startFrom={Math.round(startFrom * fps)}
      playbackRate={rate}
      muted
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
  if (holdFrom !== undefined && frame >= holdFrom) {
    return <Freeze frame={holdFrom}>{video}</Freeze>;
  }
  return video;
};
