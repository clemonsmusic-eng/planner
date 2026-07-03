import type { AllyId } from '../types/game';

// Retro maestro portraits, generated from the concept lineup
// (docs/assets/maestros_reference.png) by scripts/make_portraits.py into
// public/portraits/. Rendering falls back to the instrument emoji whenever a
// file is missing, so shipping without (or before) the assets is safe — and
// higher-quality art can replace the files later with no code changes.
export const MAESTRO_PORTRAITS: Partial<Record<AllyId, string>> = {
  syrinx: '/portraits/syrinx.png',         // Flaura — flute
  salpinx: '/portraits/salpinx.png',       // Cornelius — trumpet
  chalumeau: '/portraits/chalumeau.png',   // Clarence — clarinet
  vela: '/portraits/vela.png',             // Adolpha — alto sax
  posaune: '/portraits/posaune.png',       // Sackbut — trombone
  cantora: '/portraits/cantora.png',       // Torbult — euphonium/tuba
  waldhorn: '/portraits/waldhorn.png',     // Waldhorn — french horn
  hautbois: '/portraits/hautbois.png',     // Hautbois — oboe
  bassanello: '/portraits/bassanello.png', // Fagotto — bassoon
  percival: '/portraits/percival.png',     // Paige — percussion
};
