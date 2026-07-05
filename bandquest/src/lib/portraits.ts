import type { AllyId } from '../types/game';

// Retro character portraits in public/portraits/. Originally generated from
// the concept lineup (docs/assets/maestros_reference.png) by
// scripts/make_portraits.py; newer per-character art drops go through
// scripts/make_character_portraits.py (docs/assets/characters/) and overwrite
// these files as they arrive. Rendering falls back to the instrument emoji
// whenever a file is missing, so shipping without (or before) the assets is
// safe — and higher-quality art can replace the files with no code changes.
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

// Student classmate portraits (lib/students.ts ids), same pipeline and same
// emoji fallback — students without art yet simply keep their instrument tile.
export const STUDENT_PORTRAITS: Partial<Record<string, string>> = {
  benny: '/portraits/benny.png',           // Benny — clarinet
};
