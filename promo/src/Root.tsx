import React from 'react';
import { Composition } from 'remotion';

import { Promo, TOTAL_FRAMES } from './Promo';
import './theme';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Promo"
    component={Promo}
    durationInFrames={TOTAL_FRAMES}
    fps={30}
    width={1080}
    height={1350}
  />
);
