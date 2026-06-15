// ── Instrument / Class ──────────────────────────────────────────────────────

export type InstrumentId =
  | 'flute'
  | 'clarinet'
  | 'alto_sax'
  | 'trumpet'
  | 'trombone'
  | 'euphonium'
  | 'percussion'
  | 'french_horn'
  | 'tuba'
  | 'oboe'
  | 'bassoon';

export type InstrumentFamily = 'woodwind' | 'brass' | 'percussion';

export interface InstrumentDef {
  id: InstrumentId;
  name: string;
  className: string;        // Fantasy class name
  family: InstrumentFamily;
  archetype: string;
  baseStats: StatBlock;
  statGrowth: StatGrowth;
  available: boolean;       // Teacher can unlock optional instruments
  optional: boolean;
}

// ── Stats ────────────────────────────────────────────────────────────────────

export interface StatBlock {
  power: number;
  accuracy: number;
  technique: number;
  endurance: number;
}

export interface StatGrowth {
  power: number;
  accuracy: number;
  technique: number;
  endurance: number;
}

// ── Rating ───────────────────────────────────────────────────────────────────

export type Rating = 'superior' | 'excellent' | 'good' | 'fair' | 'poor';

export const RATING_XP_MULTIPLIERS: Record<Rating, number> = {
  superior: 1.0,
  excellent: 0.8,
  good: 0.6,
  fair: 0.3,
  poor: 0.1,
};

export const RATING_RP_AWARD: Record<Rating, number> = {
  superior: 20,
  excellent: 15,
  good: 10,
  fair: 5,
  poor: 0,
};

// ── Challenge Types ──────────────────────────────────────────────────────────

export type ChallengeType =
  | 'prepared_performance'
  | 'sight_reading'
  | 'rhythm_performance'
  | 'technique_scale'
  | 'aural_pitch_spy'
  | 'aural_rhythm_echo'
  | 'aural_melody_mapper'
  | 'aural_interval_quest'
  | 'aural_chord_oracle'
  | 'aural_progression_master';

export type InputMethod = 'microphone' | 'tap' | 'button';

export interface ChallengeResult {
  challengeId: string;
  rating: Rating;
  score: number;           // 0–100 raw score
  xpAwarded: number;
  rpAwarded: number;
  timestamp: string;
  overrideRating?: Rating; // Set by teacher
  overrideNote?: string;
}

// ── Zone / Area ───────────────────────────────────────────────────────────────

export type ZoneId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type ActId = 1 | 2 | 3;

export interface Zone {
  id: ZoneId;
  act: ActId;
  name: string;
  quarter: number;
  description: string;
  uilGrade: string;
  palette: 'warm' | 'pastoral' | 'cold' | 'epic' | 'bleak';
}

// ── Gear ─────────────────────────────────────────────────────────────────────

export type GearTier = 1 | 2 | 3 | 4 | 5;
export type GearSlot =
  | 'instrument'
  | 'mouthpiece'   // instrument-specific material accessory (mouthpiece / reed / headjoint / sticks)
  | 'accessory'    // general accessory: metronome, tuner, stand (winds/brass) OR accessory instrument (percussion)
  | 'attire'
  | 'case';

export interface GearItem {
  id: string;
  slot: GearSlot;
  tier: GearTier;
  name: string;
  fantasyName: string;
  statBonus: Partial<StatBlock>;
  unlocks?: string[];      // Challenge types or abilities unlocked
  passive?: string;        // Description of passive effect
  instrumentSpecific?: InstrumentId;
  loreEntry?: string;      // Real-world reference text
  tierLabel?: string;      // Overrides the default tier label (e.g. instrument rarity, percussion family)
}

// ── Enemy ─────────────────────────────────────────────────────────────────────

export type EnemyTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface Enemy {
  id: string;
  tier: EnemyTier;
  name: string;
  description: string;
  power: number;
  hp: number;
  attackDescription: string;
  vulnerableTo: InstrumentId[];
  debuffType?: string;
  isBoss: boolean;
}

// ── Symphony Ally ─────────────────────────────────────────────────────────────

export type AllyId =
  | 'percival'
  | 'syrinx'
  | 'salpinx'
  | 'chalumeau'
  | 'hautbois'
  | 'waldhorn'
  | 'posaune'
  | 'cantora'
  | 'bassanello'
  | 'vela'
  | 'grand_symphony';

export interface SymphonyAlly {
  id: AllyId;
  trueName: string;
  instrument: string;
  corruptedName: string;
  summonAbility: string;
  summonEffect: string;
  rpCost: number;
  freed: boolean;
  zone: ZoneId;
}

// ── Appearance / Avatar ───────────────────────────────────────────────────────

// All fields are indices into the option palettes in lib/appearance.ts, so an
// Appearance is a tiny serializable blob stored as jsonb in Supabase.
export interface Appearance {
  skinTone: number;
  hairStyle: number;
  hairColor: number;
  outfitColor: number;
  accentColor: number;
  eyes: number;
  accessory: number;
  backdrop: number;
}

// ── Character (Player) ────────────────────────────────────────────────────────

export interface Character {
  id: string;
  userId: string;
  classroomId: string;
  displayName: string;
  instrument: InstrumentId;
  level: number;
  xp: number;
  xpToNextLevel: number;
  currentZone: ZoneId;
  stats: StatBlock;
  hp: number;
  maxHp: number;
  resonancePoints: number;
  resonanceCoins: number;
  summonPoints: number;
  gear: Partial<Record<GearSlot, GearItem>>;
  freedAllies: AllyId[];
  completedChallenges: string[];
  completedQuests: string[];
  bootCampComplete: boolean;
  totalAttempts: number;
  weeklyXp: number;
  suspended: boolean;
  appearance: Appearance;
  createdAt: string;
  updatedAt: string;
}

// ── Classroom / Teacher ───────────────────────────────────────────────────────

export interface Classroom {
  id: string;
  teacherId: string;
  name: string;
  period: string;
  joinCode: string;
  currentZone: ZoneId;
  baseInstrumentsOnly: boolean;
  createdAt: string;
}

export interface TeacherProfile {
  id: string;
  email: string;
  displayName: string;
  school?: string;
  classrooms: string[];
}

export interface StudentProfile {
  id: string;
  email: string;
  displayName: string;
  classroomId: string;
  characterId: string;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export type LeaderboardTab =
  | 'overall'
  | 'this_week'
  | 'boss_victories'
  | 'streak'
  | 'ensemble';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  instrument: InstrumentId;
  level: number;
  metric: number;   // The value for the current tab
  rank: number;
}

// ── Boot Camp ─────────────────────────────────────────────────────────────────

export type BootCampStepId =
  | 'posture'
  | 'assembly'
  | 'hold'
  | 'first_sound'
  | 'first_song';

export interface BootCampStep {
  id: BootCampStepId;
  title: string;
  description: string;
  requiresTeacherConfirm: boolean;
  challengeType: ChallengeType | 'teacher_confirm' | 'microphone_any_sound';
}

// ── Co-op Session ─────────────────────────────────────────────────────────────

export type SessionType = 'free_play' | 'teacher_assigned' | 'class_wide';

export interface CoopSession {
  id: string;
  classroomId: string;
  type: SessionType;
  hostId: string;
  participants: string[];    // user IDs
  challengeId?: string;
  status: 'lobby' | 'active' | 'completed';
  createdAt: string;
}

// ── App / Auth ────────────────────────────────────────────────────────────────

export type UserRole = 'teacher' | 'student';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  appearance: Appearance;
}
