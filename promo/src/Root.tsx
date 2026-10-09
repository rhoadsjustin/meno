import React from 'react';
import { Composition } from 'remotion';

import { Abide, ABIDE_FRAMES } from './Abide';
import { Promo, TOTAL_FRAMES } from './Promo';
import './theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1080}
      height={1350}
    />
    <Composition
      id="Abide"
      component={Abide}
      durationInFrames={ABIDE_FRAMES}
      fps={30}
      width={1080}
      height={1350}
    />
  </>
);
