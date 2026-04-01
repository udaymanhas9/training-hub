// Canonical muscle values match react-body-highlighter's MuscleType
export type MuscleValue =
  | 'chest' | 'front-deltoids' | 'back-deltoids'
  | 'biceps' | 'triceps' | 'forearm'
  | 'trapezius' | 'upper-back' | 'lower-back'
  | 'abs' | 'obliques'
  | 'quadriceps' | 'hamstring' | 'gluteal' | 'calves'
  | 'adductor' | 'abductors';

export const MUSCLE_DISPLAY: Record<MuscleValue, string> = {
  'chest':         'Chest',
  'front-deltoids':'Front Delts',
  'back-deltoids': 'Rear Delts',
  'biceps':        'Biceps',
  'triceps':       'Triceps',
  'forearm':       'Forearms',
  'trapezius':     'Traps',
  'upper-back':    'Upper Back',
  'lower-back':    'Lower Back',
  'abs':           'Abs',
  'obliques':      'Obliques',
  'quadriceps':    'Quads',
  'hamstring':     'Hamstrings',
  'gluteal':       'Glutes',
  'calves':        'Calves',
  'adductor':      'Adductors',
  'abductors':     'Abductors',
};

export const ALL_MUSCLES = Object.keys(MUSCLE_DISPLAY) as MuscleValue[];

// ─── Lookup table ────────────────────────────────────────────────────────────
// Keys are normalised (lowercase, no punctuation). Values are MuscleValue[].

const RAW_MAP: [string, MuscleValue[]][] = [
  // ── Chest ────────────────────────────────────────────────────────────────
  ['bench press',                   ['chest', 'front-deltoids', 'triceps']],
  ['barbell bench press',           ['chest', 'front-deltoids', 'triceps']],
  ['dumbbell bench press',          ['chest', 'front-deltoids', 'triceps']],
  ['incline bench press',           ['chest', 'front-deltoids', 'triceps']],
  ['decline bench press',           ['chest', 'front-deltoids', 'triceps']],
  ['incline dumbbell press',        ['chest', 'front-deltoids', 'triceps']],
  ['incline db press',              ['chest', 'front-deltoids', 'triceps']],
  ['cable fly',                     ['chest']],
  ['cable flye',                    ['chest']],
  ['cable flyes',                   ['chest']],
  ['cable flyes low to high',       ['chest', 'front-deltoids']],
  ['dumbbell fly',                  ['chest']],
  ['pec deck',                      ['chest']],
  ['push up',                       ['chest', 'front-deltoids', 'triceps']],
  ['pushup',                        ['chest', 'front-deltoids', 'triceps']],
  ['dips',                          ['chest', 'triceps', 'front-deltoids']],
  ['weighted dips',                 ['chest', 'triceps', 'front-deltoids']],
  ['chest dip',                     ['chest', 'triceps', 'front-deltoids']],

  // ── Shoulders ────────────────────────────────────────────────────────────
  ['overhead press',                ['front-deltoids', 'trapezius', 'triceps']],
  ['barbell overhead press',        ['front-deltoids', 'trapezius', 'triceps']],
  ['ohp',                           ['front-deltoids', 'trapezius', 'triceps']],
  ['military press',                ['front-deltoids', 'trapezius', 'triceps']],
  ['dumbbell shoulder press',       ['front-deltoids', 'trapezius', 'triceps']],
  ['arnold press',                  ['front-deltoids', 'back-deltoids', 'triceps']],
  ['lateral raise',                 ['back-deltoids']],
  ['lateral raises',                ['back-deltoids']],
  ['cable lateral raise',           ['back-deltoids']],
  ['light db lateral raise',        ['back-deltoids']],
  ['front raise',                   ['front-deltoids']],
  ['rear delt fly',                 ['back-deltoids']],
  ['face pull',                     ['back-deltoids', 'trapezius']],
  ['band pull apart',               ['back-deltoids', 'trapezius']],
  ['band pull-aparts',              ['back-deltoids', 'trapezius']],
  ['upright row',                   ['trapezius', 'front-deltoids']],
  ['shrug',                         ['trapezius']],
  ['barbell shrug',                 ['trapezius']],
  ['dumbbell shrug',                ['trapezius']],

  // ── Back ─────────────────────────────────────────────────────────────────
  ['pull up',                       ['upper-back', 'biceps']],
  ['pullup',                        ['upper-back', 'biceps']],
  ['weighted pull up',              ['upper-back', 'biceps']],
  ['weighted pull-up',              ['upper-back', 'biceps']],
  ['chin up',                       ['upper-back', 'biceps']],
  ['chinup',                        ['upper-back', 'biceps']],
  ['lat pulldown',                  ['upper-back', 'biceps']],
  ['barbell row',                   ['upper-back', 'biceps', 'lower-back']],
  ['barbell bent-over row',         ['upper-back', 'biceps', 'lower-back']],
  ['bent over row',                 ['upper-back', 'biceps', 'lower-back']],
  ['dumbbell row',                  ['upper-back', 'biceps']],
  ['db row',                        ['upper-back', 'biceps']],
  ['cable row',                     ['upper-back', 'biceps']],
  ['seated cable row',              ['upper-back', 'biceps']],
  ['machine row',                   ['upper-back', 'biceps']],
  ['t bar row',                     ['upper-back', 'biceps', 'lower-back']],
  ['deadlift',                      ['lower-back', 'gluteal', 'hamstring', 'trapezius']],
  ['romanian deadlift',             ['hamstring', 'gluteal', 'lower-back']],
  ['rdl',                           ['hamstring', 'gluteal', 'lower-back']],
  ['sumo deadlift',                 ['gluteal', 'hamstring', 'lower-back', 'adductor']],
  ['trap bar deadlift',             ['lower-back', 'gluteal', 'hamstring', 'quadriceps']],
  ['hyperextension',                ['lower-back', 'gluteal', 'hamstring']],
  ['back extension',                ['lower-back', 'gluteal', 'hamstring']],
  ['good morning',                  ['lower-back', 'hamstring', 'gluteal']],
  ['dead hang',                     ['upper-back', 'forearm']],
  ['dead hangs',                    ['upper-back', 'forearm']],
  ['scapular pull up',              ['upper-back', 'trapezius']],
  ['scapular pull-ups',             ['upper-back', 'trapezius']],

  // ── Biceps ───────────────────────────────────────────────────────────────
  ['barbell curl',                  ['biceps', 'forearm']],
  ['dumbbell curl',                 ['biceps', 'forearm']],
  ['bicep curl',                    ['biceps', 'forearm']],
  ['biceps curl',                   ['biceps', 'forearm']],
  ['hammer curl',                   ['biceps', 'forearm']],
  ['preacher curl',                 ['biceps']],
  ['concentration curl',            ['biceps']],
  ['cable curl',                    ['biceps', 'forearm']],
  ['ez bar curl',                   ['biceps', 'forearm']],
  ['incline curl',                  ['biceps']],

  // ── Triceps ──────────────────────────────────────────────────────────────
  ['tricep pushdown',               ['triceps']],
  ['triceps pushdown',              ['triceps']],
  ['rope pushdown',                 ['triceps']],
  ['tricep pushdown rope',          ['triceps']],
  ['overhead tricep extension',     ['triceps']],
  ['overhead tricep extension ez bar', ['triceps']],
  ['skull crusher',                 ['triceps']],
  ['lying tricep extension',        ['triceps']],
  ['close grip bench press',        ['triceps', 'chest', 'front-deltoids']],
  ['close-grip bench',              ['triceps', 'chest', 'front-deltoids']],

  // ── Core ─────────────────────────────────────────────────────────────────
  ['crunch',                        ['abs']],
  ['sit up',                        ['abs']],
  ['situp',                         ['abs']],
  ['plank',                         ['abs', 'obliques']],
  ['leg raise',                     ['abs']],
  ['hanging leg raise',             ['abs']],
  ['cable crunch',                  ['abs']],
  ['ab rollout',                    ['abs', 'obliques']],
  ['ab wheel',                      ['abs', 'obliques']],
  ['russian twist',                 ['obliques', 'abs']],
  ['side plank',                    ['obliques']],
  ['woodchop',                      ['obliques', 'abs']],
  ['bicycle crunch',                ['abs', 'obliques']],
  ['v up',                          ['abs']],
  ['hollow body hold',              ['abs']],

  // ── Legs ─────────────────────────────────────────────────────────────────
  ['squat',                         ['quadriceps', 'gluteal', 'hamstring']],
  ['back squat',                    ['quadriceps', 'gluteal', 'hamstring']],
  ['front squat',                   ['quadriceps', 'gluteal']],
  ['goblet squat',                  ['quadriceps', 'gluteal']],
  ['hack squat',                    ['quadriceps', 'gluteal']],
  ['hack squat machine',            ['quadriceps', 'gluteal']],
  ['pendulum squat',                ['quadriceps', 'gluteal']],
  ['leg press',                     ['quadriceps', 'gluteal', 'hamstring']],
  ['leg press wide stance',         ['gluteal', 'hamstring', 'quadriceps', 'adductor']],
  ['lunge',                         ['quadriceps', 'gluteal', 'hamstring']],
  ['lunges',                        ['quadriceps', 'gluteal', 'hamstring']],
  ['walking lunge',                 ['quadriceps', 'gluteal', 'hamstring']],
  ['walking lunges',                ['quadriceps', 'gluteal', 'hamstring']],
  ['reverse lunge',                 ['quadriceps', 'gluteal', 'hamstring']],
  ['bulgarian split squat',         ['quadriceps', 'gluteal', 'hamstring']],
  ['split squat',                   ['quadriceps', 'gluteal']],
  ['step up',                       ['quadriceps', 'gluteal']],
  ['leg extension',                 ['quadriceps']],
  ['leg extension machine',         ['quadriceps']],
  ['leg curl',                      ['hamstring']],
  ['seated leg curl',               ['hamstring']],
  ['seated leg curl machine',       ['hamstring']],
  ['lying leg curl',                ['hamstring']],
  ['nordic hamstring curl',         ['hamstring']],
  ['calf raise',                    ['calves']],
  ['standing calf raise',           ['calves']],
  ['seated calf raise',             ['calves']],
  ['glute bridge',                  ['gluteal', 'hamstring']],
  ['hip thrust',                    ['gluteal', 'hamstring']],
  ['barbell hip thrust',            ['gluteal', 'hamstring']],
  ['sumo squat',                    ['gluteal', 'adductor', 'quadriceps']],
  ['box jump',                      ['quadriceps', 'gluteal', 'calves']],
  ['broad jump',                    ['quadriceps', 'gluteal', 'calves']],
  ['kettlebell swing',              ['gluteal', 'hamstring', 'lower-back']],
  ['adductor machine',              ['adductor']],
  ['abductor machine',              ['abductors']],
  ['inner thigh machine',           ['adductor']],

  // ── Mobility / warmup ────────────────────────────────────────────────────
  ['leg swing',                     ['quadriceps', 'hamstring']],
  ['leg swings',                    ['quadriceps', 'hamstring']],
  ['bodyweight squat',              ['quadriceps', 'gluteal']],
  ['arm circle',                    ['front-deltoids', 'back-deltoids']],
  ['arm circles',                   ['front-deltoids', 'back-deltoids']],
  ['hip circle',                    ['gluteal', 'adductor']],
  ['chest opener stretch',          ['chest', 'front-deltoids']],
  ['couch stretch',                 ['quadriceps']],
  ['pigeon pose',                   ['gluteal']],
  ['hamstring stretch',             ['hamstring']],
  ['lying hamstring stretch',       ['hamstring']],

  // ── Full body / power ────────────────────────────────────────────────────
  ['power clean',                   ['upper-back', 'trapezius', 'gluteal', 'quadriceps']],
  ['clean',                         ['upper-back', 'trapezius', 'gluteal', 'quadriceps']],
  ['clean and jerk',                ['upper-back', 'trapezius', 'gluteal', 'quadriceps', 'front-deltoids', 'triceps']],
  ['snatch',                        ['upper-back', 'trapezius', 'gluteal', 'quadriceps', 'hamstring']],
  ['thruster',                      ['quadriceps', 'gluteal', 'front-deltoids', 'triceps']],
  ['burpee',                        ['chest', 'front-deltoids', 'triceps', 'quadriceps', 'abs']],
  ['burpee box jump',               ['chest', 'front-deltoids', 'triceps', 'quadriceps', 'gluteal', 'calves']],

  // ── Med ball ─────────────────────────────────────────────────────────────
  ['med ball slam',                 ['abs', 'obliques', 'upper-back', 'front-deltoids', 'triceps']],
  ['medicine ball slam',            ['abs', 'obliques', 'upper-back', 'front-deltoids', 'triceps']],
  ['ball slam',                     ['abs', 'obliques', 'upper-back', 'front-deltoids', 'triceps']],
  ['med ball rotational slam',      ['obliques', 'abs', 'upper-back', 'front-deltoids']],
  ['med ball wall ball',            ['quadriceps', 'gluteal', 'front-deltoids', 'triceps', 'abs']],
  ['wall ball',                     ['quadriceps', 'gluteal', 'front-deltoids', 'triceps', 'abs']],
  ['med ball chest pass',           ['chest', 'front-deltoids', 'triceps']],
  ['med ball throw',                ['chest', 'front-deltoids', 'triceps', 'abs']],
  ['med ball Russian twist',        ['obliques', 'abs']],
  ['med ball crunch',               ['abs']],
  ['med ball squat',                ['quadriceps', 'gluteal', 'hamstring']],
  ['med ball lunge',                ['quadriceps', 'gluteal', 'hamstring']],
  ['med ball overhead slam',        ['abs', 'obliques', 'upper-back', 'front-deltoids']],
  ['overhead med ball slam',        ['abs', 'obliques', 'upper-back', 'front-deltoids']],
  ['med ball side slam',            ['obliques', 'abs', 'upper-back']],

  // ── Kettlebell ───────────────────────────────────────────────────────────
  ['kettlebell swing',              ['gluteal', 'hamstring', 'lower-back', 'abs']],
  ['kb swing',                      ['gluteal', 'hamstring', 'lower-back', 'abs']],
  ['single arm kettlebell swing',   ['gluteal', 'hamstring', 'lower-back', 'abs', 'obliques']],
  ['kettlebell clean',              ['upper-back', 'gluteal', 'quadriceps', 'trapezius']],
  ['kettlebell snatch',             ['upper-back', 'gluteal', 'quadriceps', 'trapezius', 'hamstring']],
  ['kb snatch',                     ['upper-back', 'gluteal', 'quadriceps', 'trapezius', 'hamstring']],
  ['kettlebell press',              ['front-deltoids', 'triceps', 'trapezius']],
  ['kb press',                      ['front-deltoids', 'triceps', 'trapezius']],
  ['kettlebell goblet squat',       ['quadriceps', 'gluteal', 'abs']],
  ['kb goblet squat',               ['quadriceps', 'gluteal', 'abs']],
  ['kettlebell deadlift',           ['gluteal', 'hamstring', 'lower-back']],
  ['kb deadlift',                   ['gluteal', 'hamstring', 'lower-back']],
  ['kettlebell row',                ['upper-back', 'biceps']],
  ['kb row',                        ['upper-back', 'biceps']],
  ['kettlebell lunge',              ['quadriceps', 'gluteal', 'hamstring']],
  ['kettlebell turkish get up',     ['abs', 'obliques', 'front-deltoids', 'gluteal', 'quadriceps']],
  ['turkish get up',                ['abs', 'obliques', 'front-deltoids', 'gluteal', 'quadriceps']],
  ['tgu',                           ['abs', 'obliques', 'front-deltoids', 'gluteal', 'quadriceps']],
  ['kettlebell around the world',   ['abs', 'obliques', 'front-deltoids']],
  ['kettlebell halo',               ['front-deltoids', 'back-deltoids', 'trapezius', 'abs']],
  ['kb halo',                       ['front-deltoids', 'back-deltoids', 'trapezius', 'abs']],
  ['kettlebell windmill',           ['obliques', 'abs', 'front-deltoids', 'hamstring']],
  ['kb windmill',                   ['obliques', 'abs', 'front-deltoids', 'hamstring']],
  ['kettlebell figure 8',           ['abs', 'obliques', 'lower-back', 'quadriceps']],
  ['bottoms up press',              ['front-deltoids', 'triceps', 'abs']],

  // ── Box jumps / plyometrics ───────────────────────────────────────────────
  ['box jump',                      ['quadriceps', 'gluteal', 'calves', 'hamstring']],
  ['box jumps',                     ['quadriceps', 'gluteal', 'calves', 'hamstring']],
  ['step up box jump',              ['quadriceps', 'gluteal', 'calves']],
  ['lateral box jump',              ['quadriceps', 'gluteal', 'calves', 'abductors']],
  ['depth jump',                    ['quadriceps', 'gluteal', 'calves', 'hamstring']],
  ['broad jump',                    ['quadriceps', 'gluteal', 'calves', 'hamstring']],
  ['tuck jump',                     ['quadriceps', 'gluteal', 'calves', 'abs']],
  ['jump squat',                    ['quadriceps', 'gluteal', 'calves']],
  ['split jump',                    ['quadriceps', 'gluteal', 'hamstring', 'calves']],
  ['scissor jump',                  ['quadriceps', 'gluteal', 'hamstring', 'calves']],
  ['hurdle jump',                   ['quadriceps', 'gluteal', 'calves', 'hamstring']],
  ['lateral bound',                 ['gluteal', 'quadriceps', 'calves', 'abductors']],
  ['single leg box jump',           ['quadriceps', 'gluteal', 'calves', 'hamstring']],
  ['plyometric push up',            ['chest', 'front-deltoids', 'triceps']],
  ['clap push up',                  ['chest', 'front-deltoids', 'triceps']],

  // ── Boxing / combat sports ────────────────────────────────────────────────
  ['boxing',                        ['chest', 'front-deltoids', 'back-deltoids', 'triceps', 'biceps', 'abs', 'obliques']],
  ['shadow boxing',                 ['chest', 'front-deltoids', 'back-deltoids', 'triceps', 'abs', 'obliques']],
  ['heavy bag',                     ['chest', 'front-deltoids', 'triceps', 'abs', 'obliques', 'calves']],
  ['heavy bag work',                ['chest', 'front-deltoids', 'triceps', 'abs', 'obliques', 'calves']],
  ['punch bag',                     ['chest', 'front-deltoids', 'triceps', 'abs', 'obliques']],
  ['speed bag',                     ['front-deltoids', 'back-deltoids', 'triceps', 'biceps', 'forearm']],
  ['pad work',                      ['chest', 'front-deltoids', 'triceps', 'abs', 'obliques', 'calves']],
  ['jab cross',                     ['chest', 'front-deltoids', 'triceps', 'obliques']],
  ['hook',                          ['chest', 'front-deltoids', 'obliques', 'biceps']],
  ['uppercut',                      ['biceps', 'front-deltoids', 'abs', 'obliques']],
  ['slip drill',                    ['obliques', 'abs', 'calves']],
  ['footwork drill',                ['calves', 'quadriceps', 'gluteal']],
  ['sparring',                      ['chest', 'front-deltoids', 'back-deltoids', 'triceps', 'biceps', 'abs', 'obliques', 'calves']],
  ['muay thai',                     ['quadriceps', 'gluteal', 'calves', 'abs', 'obliques', 'front-deltoids', 'triceps']],
  ['kickboxing',                    ['quadriceps', 'gluteal', 'calves', 'abs', 'obliques', 'front-deltoids', 'triceps']],
  ['mma',                           ['quadriceps', 'gluteal', 'calves', 'abs', 'obliques', 'chest', 'upper-back', 'front-deltoids']],
  ['jump rope',                     ['calves', 'quadriceps', 'front-deltoids', 'abs']],
  ['skipping',                      ['calves', 'quadriceps', 'front-deltoids', 'abs']],
  ['double under',                  ['calves', 'quadriceps', 'front-deltoids', 'abs']],

  // ── Battle ropes / functional ─────────────────────────────────────────────
  ['battle ropes',                  ['front-deltoids', 'back-deltoids', 'biceps', 'triceps', 'abs', 'obliques']],
  ['battle rope waves',             ['front-deltoids', 'biceps', 'triceps', 'abs']],
  ['battle rope slams',             ['front-deltoids', 'back-deltoids', 'abs', 'obliques', 'triceps']],
  ['battle rope circles',           ['front-deltoids', 'back-deltoids', 'biceps', 'abs', 'obliques']],
  ['sled push',                     ['quadriceps', 'gluteal', 'calves', 'hamstring', 'chest', 'front-deltoids']],
  ['sled pull',                     ['upper-back', 'biceps', 'hamstring', 'gluteal', 'calves']],
  ['farmers carry',                 ['trapezius', 'forearm', 'abs', 'quadriceps', 'calves']],
  ['farmers walk',                  ['trapezius', 'forearm', 'abs', 'quadriceps', 'calves']],
  ['sandbag carry',                 ['trapezius', 'abs', 'obliques', 'quadriceps', 'gluteal']],
  ['tire flip',                     ['quadriceps', 'gluteal', 'hamstring', 'lower-back', 'chest', 'front-deltoids', 'triceps']],
  ['rope climb',                    ['biceps', 'upper-back', 'forearm', 'abs']],
  ['wall ball shot',                ['quadriceps', 'gluteal', 'front-deltoids', 'triceps', 'abs']],

  // ── Cardio ───────────────────────────────────────────────────────────────
  ['bike',                          ['quadriceps', 'hamstring', 'calves']],
  ['ski erg',                       ['upper-back', 'abs', 'triceps']],
  ['bike  ski erg',                 ['quadriceps', 'upper-back', 'abs']],
  ['rowing machine',                ['upper-back', 'biceps', 'lower-back', 'quadriceps']],
  ['rowing',                        ['upper-back', 'biceps', 'lower-back', 'quadriceps']],
  ['elliptical',                    ['quadriceps', 'hamstring', 'calves']],
  ['treadmill',                     ['quadriceps', 'hamstring', 'calves']],
  ['run',                           ['quadriceps', 'hamstring', 'calves', 'gluteal']],
  ['sprint',                        ['quadriceps', 'hamstring', 'calves', 'gluteal']],
  ['assault bike',                  ['quadriceps', 'hamstring', 'calves', 'front-deltoids', 'triceps']],
  ['air bike',                      ['quadriceps', 'hamstring', 'calves', 'front-deltoids', 'triceps']],
  ['stair climber',                 ['quadriceps', 'gluteal', 'calves', 'hamstring']],
  ['stair run',                     ['quadriceps', 'gluteal', 'calves', 'hamstring']],
  ['cycling',                       ['quadriceps', 'hamstring', 'calves', 'gluteal']],
  ['swimming',                      ['upper-back', 'front-deltoids', 'chest', 'triceps', 'abs', 'calves']],
];

// Normalise: lowercase + strip non-alphanumeric (except spaces)
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

const LOOKUP = new Map<string, MuscleValue[]>(
  RAW_MAP.map(([k, v]) => [normalise(k), v])
);

export function lookupMuscles(exerciseName: string): MuscleValue[] {
  const key = normalise(exerciseName);
  if (LOOKUP.has(key)) return LOOKUP.get(key)!;

  // Substring match — longest key that is contained in the name wins
  let best: MuscleValue[] = [];
  let bestLen = 0;
  for (const [k, v] of Array.from(LOOKUP)) {
    if (key.includes(k) && k.length > bestLen) {
      best = v;
      bestLen = k.length;
    }
  }
  return best;
}

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export interface ExerciseSuggestion {
  name: string;
  muscles: MuscleValue[];
}

export function searchExercises(query: string): ExerciseSuggestion[] {
  if (!query || query.length < 2) return [];
  const q = normalise(query);

  const scored: Array<ExerciseSuggestion & { score: number }> = [];

  for (const [rawKey, muscles] of RAW_MAP) {
    const nk = normalise(rawKey);
    let score = 0;
    if (nk === q)            score = 3;
    else if (nk.startsWith(q)) score = 2;
    else if (nk.includes(q))   score = 1;
    if (score > 0) scored.push({ name: toTitleCase(rawKey), muscles, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 8)
    .map(({ name, muscles }) => ({ name, muscles }));
}
