import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import { Clip, Headline, Phone, Scene, Theme } from './parts';
import { C, SANS, SERIF } from './theme';

// Footage timings are seconds into public/clips/*.mp4 (see README for how
// they were recorded): arrange.mp4 = Today → Arrange → 100% + dissolve;
// review.mp4 = typed recitation → 96% → fill-in-the-blanks.
type SceneSpec = { id: string; frames: number; theme: Theme; render: () => React.ReactNode };

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
        }}
      >
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
        }}
      >
        Let the Word{'\n'}remain in you.
      </div>
    </AbsoluteFill>
  );
};

/** The shield screenshot with a slow push-in. */
const Shield: React.FC = () => {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [0, 105], [1, 1.06]);
  return (
    <Img
      src={staticFile('img/shield.png')}
      style={{ width: '100%', transform: `scale(${push})`, transformOrigin: '50% 30%' }}
    />
  );
};

/** The real widget captures, dealt in like cards. */
const Widgets: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = (src: string, delay: number, angle: number, top: number) => {
    const t = spring({ frame: frame - delay, fps, config: { damping: 16, mass: 0.9 } });
    return (
      <Img
        src={staticFile(src)}
        style={{
          position: 'absolute',
          left: 140,
          top: top + (1 - t) * 260,
          width: 800,
          borderRadius: 48,
          opacity: Math.min(1, t * 1.4),
          transform: `rotate(${angle * t}deg)`,
          boxShadow: '0 30px 70px rgba(10, 15, 40, 0.28)',
        }}
      />
    );
  };
  return (
    <>
      {card('img/lock-screen.png', 6, 2.5, 420)}
      {card('img/widget-home-light.png', 16, -2.5, 910)}
    </>
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
        }}
      >
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
        }}
      >
        Free beta on iPhone
      </div>
      <div style={{ marginTop: 34, fontFamily: SANS, fontSize: 30, color: C.onLapisFaint, opacity: b }}>
        No account · No ads · No tracking
      </div>
    </AbsoluteFill>
  );
};

export const SCENES: SceneSpec[] = [
  { id: 'intro', frames: 75, theme: 'vellum', render: () => <Intro /> },
  {
    id: 'practice',
    // ends at ~11.2s of footage, just before the result screen the next scene opens on
    frames: 145,
    theme: 'lapis',
    render: () => (
      <>
        <Headline theme="lapis" title="Six ways to practice." sub="From reading it to reciting it." />
        <Phone>
          <Clip src="clips/arrange.mp4" startFrom={1.4} rate={2} />
        </Phone>
      </>
    ),
  },
  {
    id: 'dissolve',
    frames: 110,
    theme: 'vellum',
    render: () => (
      <>
        <Headline theme="vellum" title={'Watch it fade\nas it takes root.'} />
        <Phone top={400} zoom={1.25}>
          {/* the dissolve lasts ~1s in the app; half speed lets it read */}
          <Clip src="clips/arrange.mp4" startFrom={11.35} rate={0.5} holdFrom={76} />
        </Phone>
      </>
    ),
  },
  {
    id: 'checked',
    frames: 150,
    theme: 'lapis',
    render: () => (
      <>
        <Headline theme="lapis" title="Checked word by word." sub="Speak or type it from memory." />
        <Phone>
          <Clip src="clips/review.mp4" startFrom={7} rate={3} holdFrom={128} />
        </Phone>
      </>
    ),
  },
  {
    id: 'blanks',
    frames: 105,
    theme: 'vellum',
    render: () => (
      <>
        <Headline theme="vellum" title="Fill in what fades." sub="Reviews arrive right before you’d forget." />
        <Phone>
          <Clip src="clips/review.mp4" startFrom={20} rate={1.5} />
        </Phone>
      </>
    ),
  },
  {
    id: 'shield',
    frames: 105,
    theme: 'lapis',
    render: () => (
      <>
        <Headline theme="lapis" title="Recite before you scroll." sub="The override always works." />
        <Phone cleanStatusBar={false}>
          <Shield />
        </Phone>
      </>
    ),
  },
  {
    id: 'widgets',
    frames: 105,
    theme: 'vellum',
    render: () => (
      <>
        <Headline theme="vellum" title={'Keep it in\nfront of you.'} />
        <Widgets />
      </>
    ),
  },
  { id: 'outro', frames: 90, theme: 'lapis', render: () => <Outro /> },
];

export const TOTAL_FRAMES = SCENES.reduce((n, s) => n + s.frames, 0);

export const Promo: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.vellum }}>
      {SCENES.map((s) => {
        const start = from;
        from += s.frames;
        return (
          <Sequence key={s.id} name={s.id} from={start} durationInFrames={s.frames}>
            <Scene duration={s.frames} theme={s.theme}>
              {s.render()}
            </Scene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
