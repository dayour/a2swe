import React from 'react';

export const FOG_DEFAULT_ON = true; 
export const Fog: React.FC<{top?: number; bottom?: number; from?: string; to?: string; opacity?: number}> = ({top = 415, bottom = 687, from = '#000000', to = '#212121', opacity = 1}) => (
  
  <div style={{position: 'absolute', left: 0, top, width: 1280, height: 720 - top, background: `linear-gradient(180deg, ${from} 0%, ${to} ${(((bottom - top) / (720 - top)) * 100).toFixed(2)}%, ${to} 100%)`, opacity, pointerEvents: 'none'}} />
);
