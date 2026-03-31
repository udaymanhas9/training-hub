import { supabase } from './supabase';
import { WorkoutDefinition, SessionLog, PersonalBest, HealthEntry, UserProfile, LeetCodeEntry, QuantEntry } from './types';
import { defaultWorkouts } from './defaultData';

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ── Workouts ──────────────────────────────────────────────────────────────────

export async function getWorkouts(): Promise<WorkoutDefinition[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('workout_definitions')
    .select('data')
    .eq('user_id', userId);
  if (error) throw error;
  if (!data || data.length === 0) {
    // First load — seed defaults
    await seedDefaultWorkouts(userId);
    return defaultWorkouts;
  }
  return data.map((row: { data: WorkoutDefinition }) => row.data);
}

async function seedDefaultWorkouts(userId: string) {
  const rows = defaultWorkouts.map(w => ({ id: w.id, user_id: userId, data: w }));
  await supabase.from('workout_definitions').insert(rows);
}

export async function getWorkoutById(id: string): Promise<WorkoutDefinition | undefined> {
  const userId = await getUserId();
  if (!userId) return undefined;
  const { data, error } = await supabase
    .from('workout_definitions')
    .select('data')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error || !data) return undefined;
  return (data as { data: WorkoutDefinition }).data;
}

export async function saveWorkout(w: WorkoutDefinition): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase
    .from('workout_definitions')
    .upsert({ id: w.id, user_id: userId, data: w, updated_at: new Date().toISOString() }, { onConflict: 'id,user_id' });
}

export async function deleteWorkout(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('workout_definitions').delete().eq('id', id).eq('user_id', userId);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function getSessions(): Promise<SessionLog[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('session_log')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    workoutId: row.workout_id,
    date: row.date,
    durationMinutes: row.duration_minutes,
    exercises: row.exercises,
  }));
}

export async function saveSession(s: SessionLog): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('session_log').insert({
    id: s.id,
    user_id: userId,
    workout_id: s.workoutId,
    date: s.date,
    duration_minutes: s.durationMinutes,
    exercises: s.exercises,
  });
}

export async function getLastSession(workoutId: string): Promise<SessionLog | undefined> {
  const userId = await getUserId();
  if (!userId) return undefined;
  const { data, error } = await supabase
    .from('session_log')
    .select('*')
    .eq('user_id', userId)
    .eq('workout_id', workoutId)
    .order('date', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return undefined;
  return {
    id: data.id,
    workoutId: data.workout_id,
    date: data.date,
    durationMinutes: data.duration_minutes,
    exercises: data.exercises,
  };
}

// ── Personal Bests ────────────────────────────────────────────────────────────

export async function getPBs(): Promise<PersonalBest[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('personal_bests')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(row => ({
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    weight: row.weight,
    reps: row.reps,
    date: row.date,
    workoutId: row.workout_id,
  }));
}

export async function savePBs(pbs: PersonalBest[]): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  if (pbs.length === 0) return;
  const rows = pbs.map(pb => ({
    exercise_id: pb.exerciseId,
    user_id: userId,
    exercise_name: pb.exerciseName,
    weight: pb.weight,
    reps: pb.reps,
    date: pb.date,
    workout_id: pb.workoutId,
  }));
  await supabase.from('personal_bests').upsert(rows, { onConflict: 'exercise_id,user_id' });
}

// ── Health Stats ──────────────────────────────────────────────────────────────

export async function getHealthEntries(): Promise<HealthEntry[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('health_stats')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    date: row.date,
    weight: row.weight,
    bodyFatPct: row.body_fat_pct,
    bmi: row.bmi,
  }));
}

export async function saveHealthEntries(entries: HealthEntry[]): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const rows = entries.map(e => ({
    id: e.id,
    user_id: userId,
    date: e.date,
    weight: e.weight,
    body_fat_pct: e.bodyFatPct,
    bmi: e.bmi,
  }));
  await supabase.from('health_stats').upsert(rows, { onConflict: 'id,user_id' });
}

// ── User Profile ──────────────────────────────────────────────────────────────

export async function getProfile(): Promise<UserProfile> {
  const userId = await getUserId();
  if (!userId) return { name: '', heightCm: 175, weightUnit: 'kg' };
  const { data, error } = await supabase
    .from('user_profile')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error || !data) return { name: '', heightCm: 175, weightUnit: 'kg' };
  return {
    name: data.name || '',
    heightCm: data.height_cm || 175,
    weightUnit: data.weight_unit || 'kg',
    dateOfBirth: data.date_of_birth,
    githubUsername: data.github_username,
    leetcodeUsername: data.leetcode_username,
    leetcodeSession: data.leetcode_session,
  };
}

export async function saveProfile(p: UserProfile): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('user_profile').upsert({
    user_id: userId,
    name: p.name,
    height_cm: p.heightCm,
    weight_unit: p.weightUnit,
    date_of_birth: p.dateOfBirth,
    github_username: p.githubUsername,
    leetcode_username: p.leetcodeUsername,
    leetcode_session: p.leetcodeSession,
  }, { onConflict: 'user_id' });
}

// ── LeetCode ──────────────────────────────────────────────────────────────────

export async function getLeetCodeEntries(): Promise<LeetCodeEntry[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('leetcode_log')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    problemNumber: row.problem_number,
    problemName: row.problem_name,
    difficulty: row.difficulty,
    topics: row.topics || [],
    status: row.status,
    language: row.language,
    timeTaken: row.time_taken,
    notes: row.notes,
    date: row.date,
  }));
}

export async function saveLeetCodeEntry(entry: LeetCodeEntry): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('leetcode_log').upsert({
    id: entry.id,
    user_id: userId,
    problem_number: entry.problemNumber,
    problem_name: entry.problemName,
    difficulty: entry.difficulty,
    topics: entry.topics,
    status: entry.status,
    language: entry.language,
    time_taken: entry.timeTaken,
    notes: entry.notes,
    date: entry.date,
  }, { onConflict: 'id,user_id' });
}

export async function deleteLeetCodeEntry(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('leetcode_log').delete().eq('id', id).eq('user_id', userId);
}

// ── Quant ─────────────────────────────────────────────────────────────────────

export async function getQuantEntries(): Promise<QuantEntry[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('quant_log')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    source: row.source,
    topic: row.topic,
    difficulty: row.difficulty,
    notes: row.notes,
    date: row.date,
  }));
}

export async function saveQuantEntry(entry: QuantEntry): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('quant_log').upsert({
    id: entry.id,
    user_id: userId,
    name: entry.name,
    source: entry.source,
    topic: entry.topic,
    difficulty: entry.difficulty,
    notes: entry.notes,
    date: entry.date,
  }, { onConflict: 'id,user_id' });
}

export async function deleteQuantEntry(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('quant_log').delete().eq('id', id).eq('user_id', userId);
}

// ── Quant custom topics ───────────────────────────────────────────────────────

export async function getCustomTopics(): Promise<string[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from('quant_custom_topics')
    .select('topics')
    .eq('user_id', userId)
    .single();
  return data?.topics || [];
}

export async function saveCustomTopics(topics: string[]): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from('quant_custom_topics').upsert(
    { user_id: userId, topics },
    { onConflict: 'user_id' }
  );
}
