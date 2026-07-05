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
  githubToken?: string;
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

// ── TODOS ─────────────────────────────────────────────────────────────────────

export interface TodoRepeat {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  every?: number; // only used when type === 'custom'; unit = days
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;       // yyyy-MM-dd
  priority: 'normal' | 'high';
  repeat?: TodoRepeat;
  createdAt: string;      // ISO
  completedAt?: string;   // ISO — repeating tasks check this against the interval
}

// ── BOARD (Kanban) ──────────────────────────────────────────────────────────────

export interface BoardLabel {
  id: string;
  name: string;   // may be blank (colour-only label)
  color: string;  // hex
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface BoardCard {
  id: string;
  title: string;
  description?: string;
  labelIds: string[];
  checklist: ChecklistItem[];
  dueDate?: string;        // yyyy-MM-dd
  repeat?: TodoRepeat;
  completed: boolean;
  completedAt?: string;    // ISO — repeating cards check this against the interval
  createdAt: string;       // ISO
}

export interface BoardList {
  id: string;
  title: string;
  cards: BoardCard[];
}

export interface Board {
  lists: BoardList[];
  labels: BoardLabel[];
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
