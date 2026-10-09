import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import { Clip, Headline, Phone, Scene, Theme, Widgets } from './parts';
import { C, SANS, SERIF } from './theme';

// "Why Meno?" — a cut about the name. μένω (menō) is John's word for staying:
// remain, abide, dwell, stand firm. Scripture is quoted from the ESV (text
// fetched from Crossway's ESV API on 2026-10-04); the outro carries the
// copyright notice Crossway requires wherever ESV text is displayed.
type SceneSpec = { id: string; frames: number; theme: Theme; render: () => React.ReactNode };

const norm = (w: string) => w.toLowerCase().replace(/[^a-z]/g, '');

/** Frames between successive words arriving. */
const PER_WORD = 3;

/** Verse text in New York, arriving a word at a time; `mark` words take the accent. */
const Verse: React.FC<{
  theme: Theme;
  text: string;
  mark?: string[];
  size?: number;
  delay?: number;
}> = ({ theme, text, mark = [], size = 66, delay = 8 }) => {
  const frame = useCurrentFrame();
  // "\n" forces a line break; word timing runs continuously across lines.
  const lines = text.split('\n').map((l) => l.split(' '));
  const total = lines.reduce((n, l) => n + l.length, 0);
  const marks = new Set(mark.map(norm));
  const base = theme === 'vellum' ? C.ink : C.onLapisFaint;
  const accent = theme === 'vellum' ? C.lapis : C.white;
  let index = 0;
  return (
    <div
      style={{
        fontFamily: SERIF,
        fontSize: size,
        lineHeight: 1.3,
        textAlign: 'center',
        fontWeight: 500,
        color: base,
      }}>
      {lines.map((words, li) => (
        <React.Fragment key={li}>
          {words.map((w, wi) => {
            const i = index++;
            const o = interpolate(
              frame,
              [delay + i * PER_WORD, delay + i * PER_WORD + 14],
              [0, 1],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              },
            );
            const hit = marks.has(norm(w));
            return (
              <span
                key={wi}
                style={{ opacity: o, color: hit ? accent : base, fontWeight: hit ? 700 : 500 }}>
                {w}
                {i < total - 1 && wi < words.length - 1 ? ' ' : ''}
              </span>
            );
          })}
          {li < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </div>
  );
};

/** A centered Scripture card: sans kicker, serif verse, sans reference. */
const Passage: React.FC<{
  theme: Theme;
  kicker?: string;
  text: string;
  mark?: string[];
  reference: string;
  size?: number;
}> = ({ theme, kicker, text, mark, reference, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const faint = theme === 'vellum' ? C.inkFaint : C.onLapisFaint;
  const k = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const wordCount = text.split(/\s+/).length;
  const r = spring({ frame: frame - (12 + wordCount * PER_WORD), fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 88px' }}>
      {kicker ? (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 36,
            color: faint,
            textAlign: 'center',
            marginBottom: 48,
            opacity: k,
            transform: `translateY(${(1 - k) * 16}px)`,
          }}>
          {kicker}
        </div>
      ) : null}
      <Verse theme={theme} text={text} mark={mark} size={size} />
      <div
        style={{
          marginTop: 48,
          fontFamily: SANS,
          fontSize: 32,
          color: faint,
          textAlign: 'center',
          opacity: r,
        }}>
        {reference}
      </div>
    </AbsoluteFill>
  );
};

/** The Greek word itself, then how to say it. */
const GreekWord: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 18, mass: 0.8 } });
  const b = spring({ frame: frame - 26, fps, config: { damping: 200 } });
  const c = spring({ frame: frame - 42, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 260,
          fontWeight: 500,
          lineHeight: 1,
          color: C.lapis,
          opacity: a,
          transform: `scale(${0.85 + a * 0.15})`,
        }}>
        μένω
      </div>
      <div
        style={{
          marginTop: 36,
          fontFamily: SANS,
          fontSize: 46,
          color: C.ink,
          opacity: b,
          transform: `translateY(${(1 - b) * 20}px)`,
        }}>
        Meno &nbsp;·&nbsp; “MEN-oh”
      </div>
      <div style={{ marginTop: 16, fontFamily: SANS, fontSize: 32, color: C.inkFaint, opacity: c }}>
        Greek, verb
      </div>
    </AbsoluteFill>
  );
};

const SENSES = ['to remain', 'to abide', 'to live, to dwell', 'to stand steadfast'];

/** A lexicon entry: the senses, numbered, rising one after another. */
const Lexicon: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'absolute',
          top: 120,
          fontFamily: SERIF,
          fontSize: 64,
          color: C.white,
          opacity: head,
        }}>
        μένω
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
        {SENSES.map((s, i) => {
          const t = spring({ frame: frame - (16 + i * 24), fps, config: { damping: 200 } });
          return (
            <div
              key={s}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 34,
                opacity: t,
                transform: `translateY(${(1 - t) * 28}px)`,
              }}>
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: 36,
                  color: C.onLapisFaint,
                  width: 44,
                  textAlign: 'right',
                }}>
                {i + 1}
              </span>
              <span
                style={{
                  fontFamily: SERIF,
                  fontSize: 88,
                  fontWeight: 500,
                  color: C.white,
                  lineHeight: 1.1,
                }}>
                {s}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 200 } });
  const b = spring({ frame: frame - 22, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div
        style={{ fontFamily: SERIF, fontSize: 150, fontWeight: 600, color: C.white, opacity: a }}>
        Meno
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: SANS,
          fontSize: 38,
          color: C.onLapisFaint,
          opacity: a,
        }}>
        μένω &nbsp;·&nbsp; to remain
      </div>
      <div
        style={{
          marginTop: 54,
          fontFamily: SERIF,
          fontSize: 56,
          fontWeight: 500,
          color: C.white,
          textAlign: 'center',
          lineHeight: 1.15,
          opacity: b,
          transform: `translateY(${(1 - b) * 16}px)`,
        }}>
        Let the Word remain in you.
      </div>
      <div
        style={{
          marginTop: 64,
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
        Free on iPhone
      </div>
      <div
        style={{
          marginTop: 34,
          fontFamily: SANS,
          fontSize: 30,
          color: C.onLapisFaint,
          opacity: b,
        }}>
        No account · No ads · No tracking
      </div>
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          bottom: 56,
          fontFamily: SANS,
          fontSize: 21,
          lineHeight: 1.4,
          color: C.onLapisFaint,
          textAlign: 'center',
          opacity: b * 0.85,
        }}>
        Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), ©
        2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All
        rights reserved.
      </div>
    </AbsoluteFill>
  );
};

export const ABIDE_SCENES: SceneSpec[] = [
  { id: 'word', frames: 105, theme: 'vellum', render: () => <GreekWord /> },
  { id: 'senses', frames: 150, theme: 'lapis', render: () => <Lexicon /> },
  {
    id: 'staying',
    frames: 140,
    theme: 'vellum',
    render: () => (
      <Passage
        theme="vellum"
        kicker="An everyday word, first."
        text="“Rabbi, where are you staying?” … So they came and saw where he was staying, and they stayed with him that day."
        mark={['staying', 'stayed']}
        reference="John 1:38–39 · ESV"
        size={62}
      />
    ),
  },
  {
    id: 'vine',
    frames: 110,
    theme: 'lapis',
    render: () => (
      <Passage
        theme="lapis"
        kicker="Then Jesus makes it everything."
        text={'Abide in me,\nand I in you.'}
        mark={['abide']}
        reference="John 15:4 · ESV"
        size={96}
      />
    ),
  },
  {
    id: 'words',
    frames: 170,
    theme: 'vellum',
    render: () => (
      <Passage
        theme="vellum"
        kicker="He says it ten times in seven verses."
        text="If you abide in me, and my words abide in you, ask whatever you wish, and it will be done for you."
        mark={['abide']}
        reference="John 15:7 · ESV"
      />
    ),
  },
  {
    id: 'steadfast',
    frames: 140,
    theme: 'lapis',
    render: () => (
      <Passage
        theme="lapis"
        kicker="What remains, holds."
        text="The grass withers, the flower fades, but the word of our God will stand forever."
        mark={['stand', 'forever']}
        reference="Isaiah 40:8 · ESV"
      />
    ),
  },
  {
    id: 'thesis',
    frames: 130,
    theme: 'vellum',
    render: () => (
      <>
        <Headline theme="vellum" title={'A verse known by heart\nis a verse that remains.'} />
        <Phone top={400} zoom={1.25}>
          {/* the dissolve: text leaves the screen because it now lives in you */}
          <Clip src="clips/arrange.mp4" startFrom={11.35} rate={0.5} holdFrom={80} />
        </Phone>
      </>
    ),
  },
  {
    id: 'widgets',
    frames: 105,
    theme: 'lapis',
    render: () => (
      <>
        <Headline
          theme="lapis"
          title="Keep it in front of you."
          sub="Home and Lock Screen widgets."
        />
        <Widgets />
      </>
    ),
  },
  {
    id: 'promise',
    frames: 215,
    theme: 'vellum',
    render: () => (
      <Passage
        theme="vellum"
        kicker="The promise inside the name."
        text="Let what you heard from the beginning abide in you. If what you heard from the beginning abides in you, then you too will abide in the Son and in the Father."
        mark={['abide', 'abides']}
        reference="1 John 2:24 · ESV"
        size={58}
      />
    ),
  },
  { id: 'outro', frames: 120, theme: 'lapis', render: () => <Outro /> },
];

export const ABIDE_FRAMES = ABIDE_SCENES.reduce((n, s) => n + s.frames, 0);

export const Abide: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.vellum }}>
      <Audio src={staticFile('music/abide.wav')} />
      {ABIDE_SCENES.map((s) => {
        const start = from;
        from += s.frames;
        return (
          <Sequence key={s.id} name={s.id} from={start} durationInFrames={s.frames}>
            <Scene duration={s.frames} theme={s.theme} edge={14}>
              {s.render()}
            </Scene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
