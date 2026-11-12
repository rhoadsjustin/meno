import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';

/**
 * The two shapes every cut renders in (docs/11 §5): the 4:5 feed post and the
 * 9:16 Reel / Short. Scenes never read the composition size themselves; they
 * place things with `useLayout()` and `SafeFill`, so one scene list serves both.
 */
export const FPS = 30;
export const FEED = { width: 1080, height: 1350 } as const;
export const REEL = { width: 1080, height: 1920 } as const;

/**
 * What Instagram Reels and YouTube Shorts draw over a 9:16 video: the header
 * at the top, and the caption, account and audio rows at the bottom. Text and
 * anything that must be read stays between them; backgrounds and the phone
 * frame may run underneath.
 */
export const REEL_SAFE = { top: 250, bottom: 340 } as const;

export type Layout = {
  /** True for the 9:16 shape. */
  reel: boolean;
  width: number;
  height: number;
  /** Rows at the top and bottom that the host app covers; 0 in the feed shape. */
  safe: { top: number; bottom: number };
  /** Scale for the phone frame: the taller shape has room for a larger one. */
  phoneScale: number;
  /** A feed-shape `top` moved to where it belongs in this shape. */
  y: (feedTop: number) => number;
  /**
   * A feed-shape font size for a scene that is only words. The taller shape is
   * no wider, so the type grows a little and takes more lines instead.
   */
  type: (feedSize: number) => number;
};

/** How far below the safe row the feed layout's content starts in the Reel. */
const REEL_DROP = 200;

export function useLayout(): Layout {
  const { width, height } = useVideoConfig();
  const reel = height / width > 1.5;
  return {
    reel,
    width,
    height,
    safe: reel ? REEL_SAFE : { top: 0, bottom: 0 },
    phoneScale: reel ? 1.1875 : 1,
    y: (feedTop) => (reel ? feedTop + REEL_DROP : feedTop),
    type: (feedSize) => (reel ? Math.round(feedSize * 1.15) : feedSize),
  };
}

/** Where the Reel's fade over the bottom row starts, above the covered row. */
const FOOT_LEAD = 60;
/** How far the fade takes to reach the solid colour. */
const FOOT_RAMP = 130;

/**
 * In the 9:16 shape, fades whatever runs under the host app's caption row into
 * the background colour, so a phone that bleeds off the bottom leaves no
 * half-covered app buttons behind the caption. Nothing in the 4:5 shape.
 */
export const ReelFoot: React.FC<{ color: string }> = ({ color }) => {
  const { reel, safe } = useLayout();
  if (!reel) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: safe.bottom + FOOT_LEAD,
        background: `linear-gradient(180deg, ${color}00 0px, ${color} ${FOOT_RAMP}px)`,
      }}
    />
  );
};

/** An `AbsoluteFill` that covers only the rows the host app leaves clear. */
export const SafeFill: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({
  style,
  children,
}) => {
  const { safe } = useLayout();
  return (
    <AbsoluteFill style={{ top: safe.top, bottom: safe.bottom, height: 'auto', ...style }}>
      {children}
    </AbsoluteFill>
  );
};
