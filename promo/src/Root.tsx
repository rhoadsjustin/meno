import React from 'react';
import { Composition } from 'remotion';

import { Abide, ABIDE_FRAMES } from './Abide';
import { Duo, DUO_FRAMES } from './Duo';
import { FEED, FPS, REEL } from './layout';
import { Promo, TOTAL_FRAMES } from './Promo';
import './theme';

// Each cut that is built on the shared layout is registered twice: under its
// own name at 4:5, and as `<name>-9x16` for Reels and Shorts. Duo is laid out
// by hand for 4:5 and stays in that shape.
const CUTS: { id: string; component: React.FC; frames: number; reel: boolean }[] = [
  { id: 'Promo', component: Promo, frames: TOTAL_FRAMES, reel: true },
  { id: 'Duo', component: Duo, frames: DUO_FRAMES, reel: false },
  { id: 'Abide', component: Abide, frames: ABIDE_FRAMES, reel: true },
];

export const RemotionRoot: React.FC = () => (
  <>
    {CUTS.map((cut) => (
      <React.Fragment key={cut.id}>
        <Composition
          id={cut.id}
          component={cut.component}
          durationInFrames={cut.frames}
          fps={FPS}
          {...FEED}
        />
        {cut.reel ? (
          <Composition
            id={`${cut.id}-9x16`}
            component={cut.component}
            durationInFrames={cut.frames}
            fps={FPS}
            {...REEL}
          />
        ) : null}
      </React.Fragment>
    ))}
  </>
);
