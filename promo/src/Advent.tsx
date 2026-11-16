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

import { SafeFill, useLayout } from './layout';
import { Scene, Theme } from './parts';
import { C, SANS, SERIF } from './theme';

// V1 of the winter campaign (docs/11 §5): the Advent teaser. Luke 2:10–11 goes
// down the dissolution ladder (the full verse, its first letters, the reference
// alone), then the invitation and the start date. Scripture is quoted from the
// ESV (text fetched from Crossway's ESV API on 2026-11-15); the verse carries
// "(ESV)" on screen and the outro carries the full copyright notice.
type SceneSpec = { id: string; frames: number; theme: Theme; render: () => React.ReactNode };

const TEXT =
  'And the angel said to them, “Fear not, for behold, I bring you good news of great joy that will be for all the people. For unto you is born this day in the city of David a Savior, who is Christ the Lord.';
const REFERENCE = 'Luke 2:10–11';
/** "good news of great joy", the plan's name: word indexes into TEXT. */
const MARK = { from: 13, to: 17 };

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// The ladder's timing, in frames from the start of the scene.
const ARRIVE = { from: 10, perWord: 2.5, fade: 14 }; // last word lands at ~122
const LETTERS = { from: 215, perWord: 0.8, fade: 16 }; // done by ~262
const ALONE = { from: 300, fade: 22 };
const LADDER_FRAMES = 390;

const STAGES = ['Read it', 'First letters', 'From memory'];

/** The three rungs, named; the current one takes the accent. */
const Rungs: React.FC<{ stage: number }> = ({ stage }) => {
  const { type } = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 84,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 26,
        fontFamily: SANS,
        fontSize: type(28),
        opacity: enter,
      }}>
      {STAGES.map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 ? <span style={{ color: C.inkFaint, opacity: 0.5 }}>›</span> : null}
          <span
            style={{
              color: i === stage ? C.lapis : C.inkFaint,
              fontWeight: i === stage ? 700 : 500,
              opacity: i === stage ? 1 : 0.6,
            }}>
            {label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * One verse down the ladder. Words arrive, then everything but each word's
 * first letter fades where it stands (so nothing reflows), then the letters go
 * too and the reference is left alone in the middle of the frame.
 */
const Ladder: React.FC = () => {
  const { reel, type } = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = TEXT.split(' ');
  const kicker = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const refIn = interpolate(frame, [110, 130], [0, 1], clamp);
  const gone = interpolate(frame, [ALONE.from, ALONE.from + ALONE.fade], [1, 0], clamp);
  const alone = spring({ frame: frame - (ALONE.from + 8), fps, config: { damping: 200 } });
  const stage = frame < LETTERS.from ? 0 : frame < ALONE.from ? 1 : 2;
  return (
    <SafeFill style={{ justifyContent: 'center', padding: '0 84px' }}>
      <div style={{ opacity: gone }}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: type(34),
            color: C.inkFaint,
            textAlign: 'center',
            marginBottom: 44,
            opacity: kicker,
            transform: `translateY(${(1 - kicker) * 16}px)`,
          }}>
          The Christmas story, by heart.
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: type(54),
            lineHeight: 1.32,
            fontWeight: 500,
            textAlign: 'center',
            color: C.ink,
            textWrap: reel ? 'balance' : undefined,
          }}>
          {words.map((w, i) => {
            const [, lead, first, rest] = /^([^A-Za-z]*)([A-Za-z])(.*)$/.exec(w) ?? ['', '', w, ''];
            const arrive = interpolate(
              frame,
              [ARRIVE.from + i * ARRIVE.perWord, ARRIVE.from + i * ARRIVE.perWord + ARRIVE.fade],
              [0, 1],
              clamp,
            );
            const start = LETTERS.from + i * LETTERS.perWord;
            const body = interpolate(frame, [start, start + LETTERS.fade], [1, 0], clamp);
            const marked = i >= MARK.from && i <= MARK.to;
            return (
              <React.Fragment key={i}>
                <span
                  style={{
                    opacity: arrive,
                    color: marked ? C.lapis : C.ink,
                    fontWeight: marked ? 700 : 500,
                  }}>
                  <span style={{ opacity: body }}>{lead}</span>
                  {/* the letter that stays turns lapis as the rest leaves */}
                  <span style={{ color: body < 0.5 ? C.lapis : undefined }}>{first}</span>
                  <span style={{ opacity: body }}>{rest}</span>
                </span>
                {i < words.length - 1 ? ' ' : ''}
              </React.Fragment>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 44,
            fontFamily: SANS,
            fontSize: type(32),
            color: C.inkFaint,
            textAlign: 'center',
            opacity: refIn,
          }}>
          {REFERENCE} (ESV)
        </div>
      </div>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: type(104),
            fontWeight: 600,
            color: C.lapis,
            opacity: alone,
            transform: `scale(${0.9 + alone * 0.1})`,
          }}>
          {REFERENCE}
        </div>
      </AbsoluteFill>
      <Rungs stage={stage} />
    </SafeFill>
  );
};

const Invitation: React.FC = () => {
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
        Advent in Meno
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
        {'Memorize the\nChristmas story\nby Christmas.'}
      </div>
      <div
        style={{
          marginTop: 34,
          fontFamily: SANS,
          fontSize: type(36),
          lineHeight: 1.4,
          color: C.onLapisFaint,
          textAlign: 'center',
          whiteSpace: 'pre-line',
          opacity: b,
          transform: `translateY(${(1 - b) * 18}px)`,
        }}>
        {'Luke 2:1–14, a few verses a week.\nStarts Sunday, November 29.'}
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
        meno-scripture.org/advent
      </div>
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          bottom: 48,
          fontFamily: SANS,
          fontSize: type(21),
          lineHeight: 1.4,
          color: C.onLapisFaint,
          textAlign: 'center',
          opacity: c * 0.85,
        }}>
        Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), ©
        2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All
        rights reserved.
      </div>
    </SafeFill>
  );
};

export const ADVENT_SCENES: SceneSpec[] = [
  { id: 'ladder', frames: LADDER_FRAMES, theme: 'vellum', render: () => <Ladder /> },
  { id: 'invitation', frames: 180, theme: 'lapis', render: () => <Invitation /> },
];

export const ADVENT_FRAMES = ADVENT_SCENES.reduce((n, s) => n + s.frames, 0);

export const Advent: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.vellum }}>
      <Audio src={staticFile('music/advent.wav')} />
      {ADVENT_SCENES.map((s) => {
        const start = from;
        from += s.frames;
        return (
          <Sequence key={s.id} name={s.id} from={start} durationInFrames={s.frames}>
            <Scene duration={s.frames} theme={s.theme} edge={12}>
              {s.render()}
            </Scene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
