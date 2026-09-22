import React from 'react';
import type {BgSpec, FootageSpec, ShotDef} from './common';
import {ProductionVideo} from './ProductionVideo';

export const Video = ProductionVideo;

// Compatibility wrapper retained for the scaffold's isolated preview compositions.
export const Stage: React.FC<{shots: ShotDef[]; bg: BgSpec[]; footage?: FootageSpec[]; audio?: boolean}> = () => (
  <ProductionVideo />
);
