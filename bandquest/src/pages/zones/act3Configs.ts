import type { AssaultConfig } from './AssaultZonePage';

export const ZONE9_CONFIG: AssaultConfig = {
  zoneId: 9, advanceTo: 10, act: 3, quarter: 9,
  title: 'Chromatic Coasts',
  intro: 'The trail of corruption runs west to the sea. Here the color drains from the world in chromatic bands, and the surf itself has soured. Elder Rampal is waiting on the strand.',
  story: '"You made it." Elder Rampal leans on his staff at the tide line, the old flutist\'s eyes bright. "All ten freed — I did not think I would live to see it. But the hard road is still ahead, across the water. Steady your hearts. The Fourth Wind sails on the morning tide." Valeria and the Wandering Quartet are already loading the ship.',
  headerClass: 'from-cyan-900/40',
  bossHeading: 'The Soured Shore',
  bossSub: 'Clear the corrupted coast to reach the ship. Real combat — your HP is on the line.',
  challenges: [
    { id: 'z9_harmonic_minor', title: 'Harmonic Minor Scales', type: 'technique_scale', uilStandard: 'UIL Zone 9 · Scales', description: 'Play harmonic minor scales — note the raised seventh degree.', required: true, xpBase: 200 },
    { id: 'z9_melodic_minor', title: 'Melodic Minor Scales', type: 'technique_scale', uilStandard: 'UIL Zone 9 · Scales', description: 'Play melodic minor scales — raised 6 and 7 ascending, natural descending.', required: true, xpBase: 200 },
    { id: 'z9_five_four', title: 'Rhythm: 5/4 Time', type: 'rhythm_performance', uilStandard: 'UIL Zone 9 · Rhythm', description: 'Tap a pattern in 5/4 — five beats grouped 3+2 or 2+3.', required: true, xpBase: 175 },
    { id: 'z9_seven_eight', title: 'Rhythm: 7/8 Time', type: 'rhythm_performance', uilStandard: 'UIL Zone 9 · Rhythm', description: 'Tap a pattern in 7/8 — seven eighths grouped unevenly.', required: true, xpBase: 175 },
    { id: 'z9_sightreading_4', title: 'Sight-Reading: Grade 4 Excerpt', type: 'prepared_performance', uilStandard: 'UIL Zone 9 · Sight-Reading', description: 'A Grade 4 excerpt. Study time: 30 seconds, then perform it cold.', required: true, xpBase: 275 },
    { id: 'z9_aural_progressions', title: 'Aural: I–ii–IV–V Progressions', type: 'aural_chord_oracle', uilStandard: 'UIL Zone 9 · Aural', description: 'Hear a progression and identify the I–ii–IV–V functions by ear.', required: true, xpBase: 100 },
    { id: 'z9_mode_id', title: 'Aural: Mode Identification', type: 'aural_melody_mapper', uilStandard: 'UIL Zone 9 · Aural', description: 'Hear a short passage and tell major from minor.', required: false, xpBase: 100 },
  ],
  skirmish: { enemyKeys: ['wave_walker'], doneKey: 'z9_wave_walker', icon: '🌊', name: 'Wave Walker', desc: 'A translucent sound-wave thing that slips along the corrupted shore.' },
  bosses: [
    { enemyKeys: ['coastal_dissonance'], doneKey: 'z9_coast_cleared', icon: '🌊', name: 'The Coastal Dissonance', desc: 'A standing swell of clashing frequencies guarding the water. Break it to board the ship.' },
  ],
  advanceTitle: 'The Fourth Wind sails', advanceLabel: 'Set sail →',
  advanceFlavor: 'The coast is clear and the tide is turning. Time to cross the Syncopated Seas.',
};

export const ZONE10_CONFIG: AssaultConfig = {
  zoneId: 10, advanceTo: 11, act: 3, quarter: 10,
  title: 'Syncopated Seas',
  intro: 'The crossing. These waters are uneven by nature — the waves themselves move in syncopation — but this near Discordia, the sea has turned murderous: tempests, rogue swells, and worse.',
  story: 'Lyra of the Wandering Quartet calls the count from the wheel of the Fourth Wind, and the whole crew rows to it. "Out here, tempo is the only thing keeping us afloat," she shouts over the gale. "Lose the beat and the sea takes you. Hold it — together — and we make Discordia by dawn."',
  headerClass: 'from-blue-950/50',
  bossHeading: 'The Crossing',
  bossSub: 'Hold your tempo against the sea. Real combat — your HP is on the line.',
  challenges: [
    { id: 'z10_all_minor_forms', title: 'All Minor Scale Forms', type: 'technique_scale', uilStandard: 'UIL Zone 10 · Scales', description: 'Play natural, harmonic, and melodic minor forms across the standard keys.', required: true, xpBase: 200 },
    { id: 'z10_modal_scales', title: 'Modal Scales: Dorian & Mixolydian', type: 'technique_scale', uilStandard: 'UIL Zone 10 · Scales', description: 'Play Dorian and Mixolydian modes — the practical band modes.', required: true, xpBase: 200 },
    { id: 'z10_mixed_meter', title: 'Rhythm: Mixed Meters', type: 'rhythm_performance', uilStandard: 'UIL Zone 10 · Rhythm', description: 'Tap a line that switches meter bar to bar without losing the pulse.', required: true, xpBase: 200 },
    { id: 'z10_complex_sync', title: 'Rhythm: Complex Syncopation', type: 'rhythm_performance', uilStandard: 'UIL Zone 10 · Rhythm', description: 'Tap a heavily syncopated line with ties across beats and bars.', required: true, xpBase: 200 },
    { id: 'z10_sightreading_45', title: 'Sight-Reading: Grade 4–5 Excerpt', type: 'prepared_performance', uilStandard: 'UIL Zone 10 · Sight-Reading', description: 'A Grade 4–5 excerpt. Study time: 15 seconds, then perform it cold.', required: true, xpBase: 300 },
    { id: 'z10_aural_extended_chords', title: 'Aural: dim · aug · dom7', type: 'aural_chord_oracle', uilStandard: 'UIL Zone 10 · Aural', description: 'Hear a chord and name its quality — diminished, augmented, or dominant 7th.', required: true, xpBase: 100 },
    { id: 'z10_harmonic_analysis', title: 'Aural: Harmonic Progression Analysis', type: 'aural_chord_oracle', uilStandard: 'UIL Zone 10 · Aural', description: 'Hear a longer progression and trace its harmonic function.', required: false, xpBase: 100 },
  ],
  skirmish: { enemyKeys: ['rogue_wave'], doneKey: 'z10_rogue_wave', icon: '🌀', name: 'Rogue Wave', desc: 'An off-beat swell that rears up out of the dark and crashes against your rhythm.' },
  bosses: [
    { enemyKeys: ['the_maelstrom'], doneKey: 'z10_maelstrom', icon: '🌀', name: 'The Maelstrom', desc: 'A vast whirlpool that grows louder and wider every turn. Break it fast — or it breaks the ship.' },
  ],
  advanceTitle: 'Landfall in Discordia', advanceLabel: 'Make landfall →',
  advanceFlavor: 'The Maelstrom collapses behind you and the dark shore of Discordia rises ahead. The end of the road is in sight.',
};

export const ZONE11_CONFIG: AssaultConfig = {
  zoneId: 11, advanceTo: 12, act: 3, quarter: 11,
  title: 'Dissonant Dunes',
  intro: "You've made landfall in Discordia at last. Grey dunes stretch between the shore and the Hall of Discord, and Vexus's elite guard patrol every ridge of them. His two knight-commanders hold the road.",
  story: '"This is it — his doorstep." Valeria checks her reeds one last time, her usual ease gone tight. "Two commanders between us and the Hall: Piano and Forte. Soft and loud, quiet and overwhelming. Put them both down and the doors open. Whatever happens in there… it has been an honor."',
  headerClass: 'from-stone-800/50',
  bossHeading: "Discordia's Guard",
  bossSub: 'Cut through the guard and break both commanders. Real combat — your HP is on the line.',
  challenges: [
    { id: 'z11_chromatic_scale', title: 'Full Chromatic Scale', type: 'technique_scale', uilStandard: 'UIL Zone 11 · Scales', description: 'Play the full chromatic scale across your range, evenly and in tune.', required: true, xpBase: 225 },
    { id: 'z11_extended_technique', title: 'Extended Techniques', type: 'prepared_performance', uilStandard: 'UIL Zone 11 · Technique', description: 'Perform an extended technique exercise specific to your instrument class.', required: true, xpBase: 200 },
    { id: 'z11_full_progressions', title: 'Full Harmonic Progressions', type: 'prepared_performance', uilStandard: 'UIL Zone 11 · Theory', description: 'Perform your part through a full harmonic progression with confident voice-leading.', required: true, xpBase: 200 },
    { id: 'z11_sightreading_5', title: 'Sight-Reading: Grade 5 Excerpt', type: 'prepared_performance', uilStandard: 'UIL Zone 11 · Sight-Reading', description: 'A Grade 5 excerpt. Study time: 10 seconds (UIL standard), then perform it cold.', required: true, xpBase: 325 },
    { id: 'z11_aural_complex', title: 'Aural: Complex Harmonic Progressions', type: 'aural_chord_oracle', uilStandard: 'UIL Zone 11 · Aural', description: 'Hear a complex progression and trace every function.', required: true, xpBase: 125 },
    { id: 'z11_aural_dictation', title: 'Aural: Advanced Melodic Dictation', type: 'aural_melody_mapper', uilStandard: 'UIL Zone 11 · Aural', description: 'Hear an extended phrase and pick out its exact notation.', required: false, xpBase: 125 },
  ],
  skirmish: { enemyKeys: ['cacophony_soldier', 'cacophony_soldier'], doneKey: 'z11_guard', icon: '⚔️', name: 'Cacophony Soldier', desc: 'A made soldier of the Discordian Guard — far stronger when its fellows fight beside it.' },
  bosses: [
    { enemyKeys: ['piano_commander'], doneKey: 'z11_piano', icon: '🤫', name: 'Piano', desc: 'The soft knight-commander — strikes from near-silence, where you never hear the blade.' },
    { enemyKeys: ['forte_commander'], doneKey: 'z11_forte', icon: '💥', name: 'Forte', desc: 'The loud knight-commander — overwhelming, ground-splitting force. Both must fall.' },
  ],
  advanceTitle: 'The doors of the Hall', advanceLabel: 'Enter the Hall →',
  advanceFlavor: 'Piano and Forte lie broken in the sand. Ahead, the great black doors of the Hall of Discord grind open. There is no turning back now.',
};
