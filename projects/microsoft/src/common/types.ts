import React from 'react';
import type {StarVariant, StarFieldProps} from './StarField';


export type ShotDef = {id: string; from: number; to: number; Comp: React.FC; layer?: 'aboveBar'};

export type BgSpec = {from: number; to: number; stars?: StarVariant | Partial<StarFieldProps>; fog?: boolean};
