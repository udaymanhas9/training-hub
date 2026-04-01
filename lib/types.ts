export type WorkoutType = "legs" | "push" | "pull" | "run" | "custom";

export interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes?: string;
  tag: string;
  intensity?: string;
  warmupSets?: string;
  muscleGroups?: string[];
}

export interface Phase {
  id: string;
  label: string;
  color: string;
  time: string;
  exercises: Exercise[];
}

export interface WorkoutDefinition {
  id: string;
  name: string;
  type: WorkoutType;
  accentColor: string;
  tagline: string;
  duration: string;
  note?: string;
  phases: Phase[];
}

export interface SetLog {
  reps: number;
  weight: number;
  unit: "kg" | "lbs";
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
}

export interface SessionLog {
  id: string;
  workoutId: string;
  date: string;
  durationMinutes: number;
  exercises: ExerciseLog[];
}

export interface PersonalBest {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  workoutId: string;
}

export interface HealthEntry {
  id: string;
  date: string;
  weight: number;
  bodyFatPct?: number;
  bmi?: number;
}

export interface UserProfile {
  name: string;
  heightCm: number;
  weightUnit: "kg" | "lbs";
  dateOfBirth?: string;
  githubUsername?: string;
  leetcodeUsername?: string;
  leetcodeSession?: string;
  stravaAccessToken?: string;
  stravaRefreshToken?: string;
  stravaExpiresAt?: number;
  stravaAthleteId?: number;
}

// ── STRAVA ────────────────────────────────────────────────────────────────────

export interface StravaSplit {
  distance: number;          // metres
  movingTime: number;        // seconds
  elevationDifference: number;
  averageSpeed: number;      // m/s
  averageHeartrate?: number;
  splitIndex: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;          // metres
  movingTime: number;        // seconds
  elapsedTime: number;
  totalElevationGain: number;
  startDate: string;         // ISO
  averageSpeed: number;      // m/s
  maxSpeed: number;
  averageHeartrate?: number;
  maxHeartrate?: number;
  averageCadence?: number;
  calories?: number;
  mapPolyline?: string;
  splits?: StravaSplit[];
  startLatlng?: [number, number];
}

// ── THE LAB ───────────────────────────────────────────────────────────────────

export type ProblemStatus = 'Solved' | 'Attempted' | 'Revisit';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface LeetCodeEntry {
  id: string;
  problemNumber: number;
  problemName: string;
  difficulty: Difficulty;
  topics: string[];
  status: ProblemStatus;
  language: string;
  timeTaken?: number;   // minutes
  notes?: string;
  date: string;         // ISO yyyy-MM-dd
}

export interface QuantEntry {
  id: string;
  name: string;
  source: string;
  topic: string;
  difficulty: Difficulty;
  notes?: string;
  date: string;
}
