import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import { SafeFill, useLayout } from './layout';
import { Background, Headline, Phone, Scene, Theme } from './parts';
import { C, SANS, SERIF } from './theme';

// What's new in Meno 1.9: four screens from the release, one line each, then
// the update line. The screens are captures of the 1.9 build on the iPhone 17
// Pro simulator after `scripts/seed-screenshots.py` (public/img/v19, 1206×2622,
// status bar pinned at capture time). The seed's passages are in the World
// English Bible, which is public domain, so no translation notice is needed.
//
// The cut is 19 seconds with the update line landing at 13 seconds, the same
// shape as the Advent teaser, so it plays over the same four-bar cue
// (`advent.wav`).
type SceneSpec = { id: string; frames: number; theme: Theme; render: () => React.ReactNode };

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** A capture that fills the phone screen. */
const Shot: React.FC<{ name: string }> = ({ name }) => (
  <Img
    src={staticFile(`img/v19/${name}.png`)}
    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%' }}
  />
);

/** A headline over one screen, with a slow push toward the phone. */
const Feature: React.FC<{
  theme: Theme;
  title: string;
  sub: string;
  shot: string;
  frames: number;
}> = ({ theme, title, sub, shot, frames }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, frames], [1, 1.04], clamp);
  return (
    <>
      <Headline theme={theme} title={title} sub={sub} />
      <Phone zoom={zoom} cleanStatusBar={false}>
        <Shot name={shot} />
      </Phone>
    </>
  );
};

const Intro: React.FC = () => {
  const { type } = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const a = rise(2);
  const b = rise(10);
  return (
    <SafeFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 70px' }}>
      <div
        style={{
          fontFamily: SANS,
          fontSize: type(32),
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: C.lapis,
          opacity: a,
        }}>
        New in Meno
      </div>
      <div
        style={{
          marginTop: 26,
          fontFamily: SERIF,
          fontSize: type(128),
          fontWeight: 600,
          letterSpacing: -1,
          color: C.ink,
          opacity: a,
          transform: `translateY(${(1 - a) * 26}px)`,
        }}>
        Version 1.9
      </div>
      <div
        style={{
          marginTop: 22,
          fontFamily: SANS,
          fontSize: type(38),
          color: C.inkFaint,
          textAlign: 'center',
          opacity: b,
          transform: `translateY(${(1 - b) * 18}px)`,
        }}>
        Every screen, gone over.
      </div>
    </SafeFill>
  );
};

const Outro: React.FC = () => {
  const { type } = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const a = rise(2);
  const b = rise(14);
  const c = rise(28);
  return (
    <SafeFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 70px' }}>
      <div
        style={{
          fontFamily: SANS,
          fontSize: type(32),
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: C.onLapisFaint,
          opacity: a,
        }}>
        Meno 1.9
      </div>
      <div
        style={{
          marginTop: 30,
          fontFamily: SERIF,
          fontSize: type(84),
          fontWeight: 600,
          lineHeight: 1.08,
          letterSpacing: -0.5,
          color: C.white,
          textAlign: 'center',
          whiteSpace: 'pre-line',
          opacity: a,
          transform: `translateY(${(1 - a) * 26}px)`,
        }}>
        {'Memorize Scripture.\nKeep it.'}
      </div>
      <div
        style={{
          marginTop: 34,
          fontFamily: SANS,
          fontSize: type(36),
          lineHeight: 1.4,
          color: C.onLapisFaint,
          textAlign: 'center',
          opacity: b,
          transform: `translateY(${(1 - b) * 18}px)`,
        }}>
        Update on the App Store.
      </div>
      <div
        style={{
          marginTop: 52,
          padding: '24px 52px',
          borderRadius: 999,
          background: C.white,
          color: C.lapis,
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: type(38),
          opacity: c,
          transform: `scale(${0.9 + c * 0.1})`,
        }}>
        Free on iPhone
      </div>
      <div
        style={{
          marginTop: 26,
          fontFamily: SANS,
          fontSize: type(30),
          color: C.onLapisFaint,
          opacity: c,
        }}>
        meno-scripture.org
      </div>
    </SafeFill>
  );
};

const FEATURES: { id: string; theme: Theme; title: string; sub: string; shot: string }[] = [
  {
    id: 'today',
    theme: 'lapis',
    title: 'A clearer Today',
    sub: 'Your focus first, with one button.',
    shot: 'today',
  },
  {
    id: 'reader',
    theme: 'vellum',
    title: 'A better reader',
    sub: 'Pick your text size.\nTouch and hold a verse to memorize it.',
    shot: 'reader',
  },
  {
    id: 'practice',
    theme: 'lapis',
    title: 'Calmer practice',
    sub: 'Tap a placed phrase to take it back.',
    shot: 'arrange',
  },
  {
    id: 'stats',
    theme: 'vellum',
    title: 'Stats, week by week',
    sub: 'With lifetime totals underneath.',
    shot: 'stats',
  },
];

const INTRO_FRAMES = 60;
const FEATURE_FRAMES = [84, 82, 82, 82];
const OUTRO_FRAMES = 180;

export const WHATS_NEW_SCENES: SceneSpec[] = [
  { id: 'intro', frames: INTRO_FRAMES, theme: 'vellum', render: () => <Intro /> },
  ...FEATURES.map((f, i) => ({
    id: f.id,
    frames: FEATURE_FRAMES[i],
    theme: f.theme,
    render: () => <Feature {...f} frames={FEATURE_FRAMES[i]} />,
  })),
  { id: 'outro', frames: OUTRO_FRAMES, theme: 'lapis', render: () => <Outro /> },
];

export const WHATS_NEW_FRAMES = WHATS_NEW_SCENES.reduce((n, s) => n + s.frames, 0);

export const WhatsNew: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.vellum }}>
      <Audio src={staticFile('music/advent.wav')} />
      {WHATS_NEW_SCENES.map((s) => {
        const start = from;
        from += s.frames;
        return (
          <Sequence key={s.id} name={s.id} from={start} durationInFrames={s.frames}>
            <Scene duration={s.frames} theme={s.theme} edge={10}>
              {s.render()}
            </Scene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** Frames the card runs for; render the last one as the still. */
export const WHATS_NEW_CARD_FRAMES = 40;

const CARD_LINES = ['A clearer Today.', 'A better reader.', 'Calmer practice.'];

/**
 * The still for a feed post (4:5) and a Story (9:16): the release in three
 * lines over the new Today screen. It is a composition so it shares the fonts,
 * the phone frame and the Reel safe rows; render its last frame with
 * `remotion still`.
 */
export const WhatsNewCard: React.FC = () => {
  const { y, type } = useLayout();
  return (
    <AbsoluteFill>
      <Background theme="vellum" />
      <div style={{ position: 'absolute', top: y(84), left: 60, right: 60, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: type(30),
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: C.lapis,
          }}>
          New in Meno 1.9
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: SERIF,
            fontSize: 76,
            fontWeight: 600,
            lineHeight: 1.12,
            letterSpacing: -0.5,
            color: C.ink,
            whiteSpace: 'pre-line',
          }}>
          {CARD_LINES.join('\n')}
        </div>
      </div>
      <Phone top={500} cleanStatusBar={false}>
        <Shot name="today" />
      </Phone>
    </AbsoluteFill>
  );
};
