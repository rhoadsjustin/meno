import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import { Headline, Scene, Theme } from './parts';
import { C, SANS, SERIF } from './theme';

/**
 * "Meno on iPhone Duo" — 1080×1350 at 30 fps, 885 frames, the same length and
 * music cue as Promo (piano phrase resolves as the outro lands).
 *
 * Captures in public/img/duo/ come straight off the iPhone Duo simulator
 * (scripts/duo-captures.sh): the cover panel at 1398×2034, the inner panel
 * turned upright at 2853×2007, in the closed, open and half-open postures.
 * public/video/duo/page-turn.mp4 is the inner panel recorded half-open while
 * two pages are turned (see promo/README.md).
 */
type SceneSpec = { id: string; frames: number; theme: Theme; render: () => React.ReactNode };

const COVER = { w: 1398, h: 2034 };
const INNER = { w: 2853, h: 2007 };

/** The closed Duo: a narrow phone showing the cover panel. */
const Cover: React.FC<{ src: string; width?: number; top?: number; zoom?: number }> = ({
  src,
  width = 520,
  top = 400,
  zoom = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const bezel = 14;
  const h = (width * COVER.h) / COVER.w;
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: top + (1 - enter) * 140,
        width: width + bezel * 2,
        height: h + bezel * 2,
        marginLeft: -(width / 2 + bezel),
        transform: `scale(${zoom})`,
        transformOrigin: '50% 0%',
        background: '#0B0C10',
        borderRadius: 70,
        padding: bezel,
        boxShadow: '0 40px 90px rgba(10, 15, 40, 0.35)',
      }}>
      <div style={{ width, height: h, borderRadius: 56, overflow: 'hidden', background: C.vellum }}>
        <Img src={staticFile(src)} style={{ width, height: h }} />
      </div>
    </div>
  );
};

/**
 * The opened Duo: the inner panel as two halves on a hinge. `angle` is the
 * hinge angle in degrees — 180 lies flat, 120 is Apple's half-open posture.
 * Each half rotates around the spine with a little perspective, so the
 * device reads as a book facing the viewer.
 */
const Inner: React.FC<{
  /** A capture, or a recording of the inner panel (.mp4). */
  src: string;
  angle: number;
  width?: number;
  top?: number;
  opacity?: number;
}> = ({ src, angle, width = 980, top = 470, opacity = 1 }) => {
  const bezel = 16;
  const h = (width * INNER.h) / INNER.w;
  const Screen: React.ElementType = src.endsWith('.mp4') ? OffthreadVideo : Img;
  const tilt = (180 - angle) / 2; // each half's rotation away from flat
  const half = width / 2;
  const panel = (side: 'left' | 'right') => (
    <div
      style={{
        position: 'absolute',
        top: 0,
        [side]: 0,
        width: half + bezel,
        height: h + bezel * 2,
        transformOrigin: side === 'left' ? '100% 50%' : '0% 50%',
        transform: `rotateY(${side === 'left' ? tilt : -tilt}deg)`,
        background: '#0B0C10',
        borderRadius: side === 'left' ? '64px 0 0 64px' : '0 64px 64px 0',
        padding: bezel,
        paddingRight: side === 'left' ? 0 : bezel,
        paddingLeft: side === 'right' ? 0 : bezel,
        boxShadow:
          side === 'left'
            ? `${-tilt * 0.6}px 40px 90px rgba(10, 15, 40, 0.32)`
            : `${tilt * 0.6}px 40px 90px rgba(10, 15, 40, 0.32)`,
        // Keep each half's shadow off the other half: lying flat, the panel
        // is one unbroken screen, with no line down the middle of the UI.
        clipPath: side === 'left' ? 'inset(-300px 0 -300px -300px)' : 'inset(-300px -300px -300px 0)',
        backfaceVisibility: 'hidden',
      }}>
      <div
        style={{
          width: half,
          height: h,
          overflow: 'hidden',
          borderRadius: side === 'left' ? '52px 0 0 52px' : '0 52px 52px 0',
          background: C.vellum,
        }}>
        <Screen
          src={staticFile(src)}
          muted
          style={{
            width,
            height: h,
            maxWidth: 'none',
            marginLeft: side === 'left' ? 0 : -half,
          }}
        />
        {/* Light falls differently on each leaf as the book closes. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              side === 'left'
                ? `linear-gradient(90deg, rgba(0,0,0,0) 60%, rgba(0,0,0,${tilt / 180}) 100%)`
                : `linear-gradient(270deg, rgba(0,0,0,0) 60%, rgba(0,0,0,${tilt / 180}) 100%)`,
          }}
        />
      </div>
    </div>
  );
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top,
        width: width + bezel * 2,
        height: h + bezel * 2,
        marginLeft: -(width / 2 + bezel),
        perspective: 2600,
        perspectiveOrigin: '50% 50%',
        opacity,
      }}>
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
        {panel('left')}
        {panel('right')}
      </div>
    </div>
  );
};

/**
 * Below this hinge angle the device counts as folded. The app clears the
 * crease as soon as UIKit reports a folding region, so a bent device always
 * shows the half-open captures; the flat layouts, which run content across
 * the middle, appear only when the panel lies flat.
 */
const FLAT = 177;

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame, fps, config: { damping: 18, mass: 0.8 } });
  const line = spring({ frame: frame - 18, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 220,
          fontWeight: 500,
          color: C.lapis,
          transform: `scale(${0.8 + mark * 0.2})`,
          opacity: mark,
        }}>
        M
      </div>
      <div
        style={{
          marginTop: 20,
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: 76,
          color: C.ink,
          textAlign: 'center',
          lineHeight: 1.1,
          whiteSpace: 'pre-line',
          opacity: line,
          transform: `translateY(${(1 - line) * 24}px)`,
        }}>
        Now on{'\n'}iPhone Duo.
      </div>
    </AbsoluteFill>
  );
};

/** The device opens: cover panel out, inner panel unfolding from 100° to flat. */
const Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const unfold = spring({ frame: frame - 10, fps, config: { damping: 26, mass: 1.4 } });
  const angle = interpolate(unfold, [0, 1], [100, 180]);
  const coverOut = interpolate(frame, [0, 14], [1, 0], { extrapolateRight: 'clamp' });
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, opacity: coverOut }}>
        <Cover src="img/duo/closed-today.png" width={440} top={470} />
      </div>
      <Inner
        src={angle < FLAT ? 'img/duo/half-today.png' : 'img/duo/open-today.png'}
        angle={angle}
        opacity={1 - coverOut}
      />
    </>
  );
};

/** Flat reader with the chapter sidebar closes to the book pose. */
const Book: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const close = spring({ frame: frame - 22, fps, config: { damping: 28, mass: 1.6 } });
  const angle = interpolate(close, [0, 1], [180, 118]);
  return (
    <Inner
      src={angle < FLAT ? 'img/duo/half-reader.png' : 'img/duo/open-reader.png'}
      angle={angle}
    />
  );
};

/** Half-open, two pages are turned: the sheet curls from where it is held. */
const Turn: React.FC = () => <Inner src="video/duo/page-turn.mp4" angle={118} />;

/** Quick cuts through the wide layouts, each sliding in a touch. */
const Screens: React.FC = () => {
  const frame = useCurrentFrame();
  const shots = [
    'img/duo/open-practice.png',
    'img/duo/open-library.png',
    'img/duo/open-settings.png',
    'img/duo/open-stats.png',
  ];
  const each = 30;
  const i = Math.min(shots.length - 1, Math.floor(frame / each));
  const local = frame - i * each;
  const slide = interpolate(local, [0, 10], [40, 0], { extrapolateRight: 'clamp' });
  const fade = interpolate(local, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', inset: 0, transform: `translateX(${slide}px)`, opacity: fade }}>
      <Inner src={shots[i]} angle={180} />
    </div>
  );
};

/** The cover panel's vertical controls, with a push toward the side strip. */
const Controls: React.FC = () => {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [15, 98], [1, 1.22], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const swap = frame >= 54;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `scale(${push})`,
        transformOrigin: '72% 22%',
      }}>
      <Cover src={swap ? 'img/duo/closed-reader.png' : 'img/duo/closed-practice.png'} width={520} top={430} />
    </div>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 200 } });
  const b = spring({ frame: frame - 12, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div style={{ fontFamily: SERIF, fontSize: 150, fontWeight: 600, color: C.white, opacity: a }}>
        Meno
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: SANS,
          fontSize: 40,
          color: C.onLapisFaint,
          textAlign: 'center',
          opacity: a,
        }}>
        Memorize Scripture. Keep it for good.
      </div>
      <div
        style={{
          marginTop: 70,
          padding: '26px 54px',
          borderRadius: 999,
          background: C.white,
          color: C.lapis,
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 40,
          opacity: b,
          transform: `scale(${0.9 + b * 0.1})`,
        }}>
        Ready for iPhone Duo
      </div>
      <div style={{ marginTop: 34, fontFamily: SANS, fontSize: 30, color: C.onLapisFaint, opacity: b }}>
        Free on the App Store · No account · No ads
      </div>
    </AbsoluteFill>
  );
};

export const DUO_SCENES: SceneSpec[] = [
  { id: 'intro', frames: 75, theme: 'vellum', render: () => <Intro /> },
  {
    id: 'closed',
    frames: 90,
    theme: 'lapis',
    render: () => (
      <>
        <Headline theme="lapis" title="Closed, it’s an iPhone." sub="Everything within reach of a thumb." />
        <Cover src="img/duo/closed-today.png" width={520} top={430} />
      </>
    ),
  },
  {
    id: 'open',
    frames: 120,
    theme: 'vellum',
    render: () => (
      <>
        <Headline theme="vellum" title="Open it, and it breathes." sub="Two panes. Nothing rearranged." />
        <Opening />
      </>
    ),
  },
  {
    id: 'book',
    frames: 105,
    theme: 'lapis',
    render: () => (
      <>
        <Headline theme="lapis" title="Half-open, it reads like a book." sub="A page each side, and the crease stays clear." />
        <Book />
      </>
    ),
  },
  {
    id: 'turn',
    frames: 180,
    theme: 'lapis',
    render: () => (
      <>
        <Headline theme="lapis" title="Turn the page like paper." sub="It curls from wherever you take hold." />
        <Turn />
      </>
    ),
  },
  {
    id: 'screens',
    frames: 120,
    theme: 'vellum',
    render: () => (
      <>
        <Headline
          theme="vellum"
          title="Every screen uses the space."
          sub="Side by side, not stretched: Practice, Library, Settings, Stats."
        />
        <Screens />
      </>
    ),
  },
  {
    id: 'controls',
    frames: 105,
    theme: 'lapis',
    render: () => (
      <>
        <Headline theme="lapis" title="Controls follow the system." sub="To the side, under the camera, in every pose." />
        <Controls />
      </>
    ),
  },
  { id: 'outro', frames: 90, theme: 'lapis', render: () => <Outro /> },
];

export const DUO_FRAMES = DUO_SCENES.reduce((n, s) => n + s.frames, 0);

export const Duo: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: C.vellum }}>
      <Audio src={staticFile('music/promo.wav')} />
      {DUO_SCENES.map((s) => {
        const from = at;
        at += s.frames;
        return (
          <Sequence key={s.id} from={from} durationInFrames={s.frames}>
            <Scene duration={s.frames} theme={s.theme}>
              {s.render()}
            </Scene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
