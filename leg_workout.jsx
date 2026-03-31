import { useState } from "react";

const workout = {
  title: "IRON LEGS",
  subtitle: "Functional Strength · Size · Explosiveness",
  duration: "75 min",
  note: "Lower-back safe — zero spinal compression loading",
  phases: [
    {
      id: "warmup",
      label: "WARM-UP",
      color: "#f59e0b",
      time: "10 min",
      exercises: [
        {
          name: "Bike / SkiErg",
          sets: "—",
          reps: "5 min easy",
          rest: "—",
          notes: "Build blood flow, loosen hips",
          tag: "Cardio",
        },
        {
          name: "Leg Swings (front/side)",
          sets: "2",
          reps: "15 each direction",
          rest: "—",
          notes: "Hip mobility",
          tag: "Mobility",
        },
        {
          name: "Bodyweight Squat → Squat Hold",
          sets: "2",
          reps: "10 + 5s hold",
          rest: "30s",
          notes: "Prime quad/glute pattern",
          tag: "Activation",
        },
        {
          name: "Glute Bridge",
          sets: "2",
          reps: "15",
          rest: "30s",
          notes: "Activate glutes before loading",
          tag: "Activation",
        },
      ],
    },
    {
      id: "strength",
      label: "STRENGTH BLOCK",
      color: "#ef4444",
      time: "35 min",
      exercises: [
        {
          name: "Pendulum Squat",
          sets: "5 working",
          reps: "6–8",
          rest: "2:30",
          intensity: "75–85% 1RM",
          warmupSets: "Warm-up: 1×10 @ 40% → 1×6 @ 55% → 1×4 @ 65% → 1×2 @ 72% (then into working sets)",
          notes: "Your anchor movement. 3s eccentric, explode up. Leave 1–2 reps in the tank on early sets; last set can go to failure. No spinal load.",
          tag: "💪 Main Lift",
        },
        {
          name: "Hack Squat Machine",
          sets: "4 working",
          reps: "8–10",
          rest: "2 min",
          intensity: "70–78% 1RM",
          warmupSets: "Warm-up: 1×8 @ 50% → 1×5 @ 62% (then into working sets)",
          notes: "Feet low & narrow for quad emphasis. 2s eccentric. You're pre-fatigued from pendulum — load slightly lighter than you think.",
          tag: "Hypertrophy",
        },
        {
          name: "Romanian Deadlift",
          sets: "3 working",
          reps: "10–12",
          rest: "90s",
          intensity: "60–70% 1RM — keep it LIGHT",
          warmupSets: "Warm-up: 1×10 @ 40% (feel the hinge, no warm-up needed beyond that)",
          notes: "This is not a max effort move today — it's hamstring length-tension work. Hinge deep, squeeze glutes at top. Stop immediately if lower back fires up.",
          tag: "Posterior Chain",
        },
        {
          name: "Leg Press — Wide Stance",
          sets: "3 working",
          reps: "10–12",
          rest: "90s",
          intensity: "65–75% 1RM",
          warmupSets: "No extra warm-up needed — legs are well primed by now",
          notes: "High foot placement to load glutes/hamstrings. Full range — don't cut depth. Last set: strip 20% and rep out for a drop set burnout.",
          tag: "Hypertrophy",
        },
      ],
    },
    {
      id: "explosive",
      label: "EXPLOSIVENESS BLOCK",
      color: "#8b5cf6",
      time: "15 min",
      exercises: [
        {
          name: "Box Jump",
          sets: "4",
          reps: "5",
          rest: "90s",
          intensity: "Bodyweight — pure speed",
          warmupSets: "Warm-up: 2 low box jumps at 50% effort to prime the CNS before going full height",
          notes: "Max intent every single rep. Step down between reps — full reset. Pick a box height that challenges but doesn't risk the landing.",
          tag: "⚡ Power",
        },
        {
          name: "Kettlebell Swing",
          sets: "4",
          reps: "8",
          rest: "90s",
          intensity: "Moderate KB — RPE 7. Speed & snap, not heavy grind",
          warmupSets: "Warm-up: 1×5 light KB to groove the hinge before going full power",
          notes: "Hip hinge — not a squat. Drive hips through explosively, glutes fire at the top. Spine neutral throughout. Stop immediately if lower back fires up — go to Broad Jumps instead.",
          tag: "⚡ Power",
        },
      ],
    },
    {
      id: "endurance",
      label: "ENDURANCE / BURNOUT",
      color: "#10b981",
      time: "10 min",
      exercises: [
        {
          name: "Walking Lunges",
          sets: "3",
          reps: "20 steps",
          rest: "60s",
          intensity: "Bodyweight or light DBs — RPE 7",
          warmupSets: "No warm-up needed at this stage",
          notes: "Upright torso, controlled. Add light dumbbells if bodyweight feels too easy. Functional endurance finisher.",
          tag: "Endurance",
        },
        {
          name: "Leg Extension Machine",
          sets: "3",
          reps: "15–20",
          rest: "45s",
          intensity: "~50–60% machine max — moderate, focus on squeeze",
          warmupSets: "No warm-up needed",
          notes: "Slow 2s squeeze at top each rep. Short rest — this is a burnout. Last set: go to failure.",
          tag: "Isolation",
        },
        {
          name: "Seated Leg Curl Machine",
          sets: "3",
          reps: "15–20",
          rest: "45s",
          intensity: "~50–60% machine max",
          warmupSets: "No warm-up needed",
          notes: "Seated keeps the lower back fully out of it. Match the volume to leg extensions. Last set to failure.",
          tag: "Isolation",
        },
      ],
    },
    {
      id: "cooldown",
      label: "COOL-DOWN",
      color: "#64748b",
      time: "5 min",
      exercises: [
        {
          name: "Couch Stretch",
          sets: "—",
          reps: "60s each leg",
          rest: "—",
          notes: "Hip flexor recovery",
          tag: "Stretch",
        },
        {
          name: "Pigeon Pose (floor)",
          sets: "—",
          reps: "60s each side",
          rest: "—",
          notes: "Glute release",
          tag: "Stretch",
        },
        {
          name: "Lying Hamstring Stretch",
          sets: "—",
          reps: "45s each",
          rest: "—",
          notes: "Keep lower back flat on floor",
          tag: "Stretch",
        },
      ],
    },
  ],
};

const tagColors = {
  "💪 Main Lift": "#ef4444",
  "⚡ Power": "#8b5cf6",
  Hypertrophy: "#f59e0b",
  Endurance: "#10b981",
  Isolation: "#06b6d4",
  "Posterior Chain": "#f97316",
  Activation: "#84cc16",
  Mobility: "#ec4899",
  Cardio: "#3b82f6",
  Stretch: "#64748b",
};

export default function LegWorkout() {
  const [openPhase, setOpenPhase] = useState("strength");
  const [checked, setChecked] = useState({});

  const toggle = (phaseId, i) => {
    const key = `${phaseId}-${i}`;
    setChecked((p) => ({ ...p, [key]: !p[key] }));
  };

  const totalExercises = workout.phases.flatMap((p) => p.exercises).length;
  const doneCount = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((doneCount / totalExercises) * 100);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e2e8f0",
      fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
      padding: "0 0 60px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,900;1,700&family=Barlow:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .phase-header:hover { filter: brightness(1.1); }
        .ex-row { transition: background 0.2s; }
        .ex-row:hover { background: rgba(255,255,255,0.04) !important; }
        .check-btn { transition: all 0.15s; cursor: pointer; }
        .check-btn:hover { transform: scale(1.15); }
        .progress-bar { transition: width 0.5s cubic-bezier(.4,0,.2,1); }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
      `}</style>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a0505 50%, #0a0a0a 100%)",
        borderBottom: "3px solid #ef4444",
        padding: "40px 24px 32px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(239,68,68,0.06) 39px, rgba(239,68,68,0.06) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(239,68,68,0.06) 39px, rgba(239,68,68,0.06) 40px)",
          pointerEvents: "none",
        }} />
        <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#ef4444", marginBottom: 8, fontFamily: "'Barlow', sans-serif", fontWeight: 500 }}>
            LEG DAY PROTOCOL
          </div>
          <h1 style={{ fontSize: "clamp(52px,10vw,88px)", fontWeight: 900, lineHeight: 0.9, letterSpacing: -2, color: "#fff", fontStyle: "italic" }}>
            {workout.title}
          </h1>
          <p style={{ fontSize: 18, color: "#94a3b8", letterSpacing: 2, marginTop: 12, fontWeight: 600 }}>
            {workout.subtitle}
          </p>

          <div style={{ display: "flex", gap: 20, marginTop: 24, flexWrap: "wrap" }}>
            {[
              { label: "DURATION", val: workout.duration },
              { label: "EXERCISES", val: totalExercises },
              { label: "PHASES", val: workout.phases.length },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "10px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#ef4444" }}>{val}</div>
                <div style={{ fontSize: 10, letterSpacing: 3, color: "#64748b", fontFamily: "'Barlow', sans-serif" }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "10px 14px", display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontSize: 13, color: "#fca5a5", fontFamily: "'Barlow', sans-serif", fontWeight: 500 }}>{workout.note}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: 4, color: "#64748b", fontFamily: "'Barlow', sans-serif" }}>WORKOUT PROGRESS</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: pct === 100 ? "#10b981" : "#ef4444" }}>{pct}%</span>
        </div>
        <div style={{ height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
          <div className="progress-bar" style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#10b981" : "linear-gradient(90deg, #ef4444, #f97316)", borderRadius: 2 }} />
        </div>
        {pct === 100 && (
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 22, fontWeight: 900, color: "#10b981", letterSpacing: 3 }}>
            SESSION COMPLETE 🔥
          </div>
        )}
      </div>

      {/* Phases */}
      <div style={{ maxWidth: 680, margin: "16px auto 0", padding: "0 24px" }}>
        {workout.phases.map((phase) => {
          const isOpen = openPhase === phase.id;
          const phaseDone = phase.exercises.filter((_, i) => checked[`${phase.id}-${i}`]).length;
          return (
            <div key={phase.id} style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", border: `1px solid ${isOpen ? phase.color + "44" : "rgba(255,255,255,0.07)"}`, transition: "border-color 0.3s" }}>
              {/* Phase header */}
              <div
                className="phase-header"
                onClick={() => setOpenPhase(isOpen ? null : phase.id)}
                style={{
                  background: isOpen ? `linear-gradient(90deg, ${phase.color}22, #0f0f0f)` : "#111",
                  padding: "14px 18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderLeft: `3px solid ${phase.color}`,
                  userSelect: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 2, color: isOpen ? "#fff" : "#94a3b8" }}>{phase.label}</div>
                    <div style={{ fontSize: 12, color: phase.color, fontFamily: "'Barlow', sans-serif", marginTop: 1 }}>{phase.time} · {phase.exercises.length} exercises</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'Barlow', sans-serif" }}>{phaseDone}/{phase.exercises.length}</div>
                  <div style={{ fontSize: 18, color: phase.color, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }}>▼</div>
                </div>
              </div>

              {/* Exercises */}
              {isOpen && (
                <div style={{ background: "#0d0d0d" }}>
                  {/* Column headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 56px 80px 56px", gap: 0, padding: "8px 18px", borderBottom: "1px solid #1e293b" }}>
                    {["", "EXERCISE", "SETS", "REPS", "REST"].map((h) => (
                      <div key={h} style={{ fontSize: 9, letterSpacing: 3, color: "#475569", fontFamily: "'Barlow', sans-serif" }}>{h}</div>
                    ))}
                  </div>

                  {phase.exercises.map((ex, i) => {
                    const key = `${phase.id}-${i}`;
                    const done = !!checked[key];
                    return (
                      <div key={i} className="ex-row" style={{
                        padding: "14px 18px",
                        borderBottom: i < phase.exercises.length - 1 ? "1px solid #1a1a1a" : "none",
                        opacity: done ? 0.45 : 1,
                        transition: "opacity 0.2s",
                      }}>
                        <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 56px 80px 56px", gap: 0, alignItems: "center" }}>
                          {/* Checkbox */}
                          <div
                            className="check-btn"
                            onClick={() => toggle(phase.id, i)}
                            style={{
                              width: 20, height: 20,
                              border: `2px solid ${done ? phase.color : "#334155"}`,
                              borderRadius: 4,
                              background: done ? phase.color : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            {done && <span style={{ color: "#000", fontSize: 12, fontWeight: 900 }}>✓</span>}
                          </div>

                          {/* Name + tag + notes */}
                          <div style={{ paddingRight: 12 }}>
                            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 0.5, color: done ? "#475569" : "#f1f5f9", textDecoration: done ? "line-through" : "none" }}>
                              {ex.name}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                              <span style={{
                                fontSize: 9, letterSpacing: 2, fontWeight: 600,
                                padding: "2px 7px", borderRadius: 3,
                                background: (tagColors[ex.tag] || "#475569") + "22",
                                color: tagColors[ex.tag] || "#94a3b8",
                                fontFamily: "'Barlow', sans-serif",
                                border: `1px solid ${(tagColors[ex.tag] || "#475569") + "44"}`,
                              }}>{ex.tag}</span>
                            </div>
                            {ex.intensity && (
                              <div style={{ marginTop: 5 }}>
                                <span style={{ fontSize: 11, letterSpacing: 1, color: "#f59e0b", fontFamily: "'Barlow', sans-serif", fontWeight: 700 }}>
                                  🎯 {ex.intensity}
                                </span>
                              </div>
                            )}
                            {ex.warmupSets && (
                              <div style={{ marginTop: 5, padding: "5px 8px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 4 }}>
                                <span style={{ fontSize: 11, color: "#d97706", fontFamily: "'Barlow', sans-serif", fontWeight: 700 }}>WARM-UP SETS: </span>
                                <span style={{ fontSize: 11, color: "#78716c", fontFamily: "'Barlow', sans-serif" }}>{ex.warmupSets}</span>
                              </div>
                            )}
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 5, fontFamily: "'Barlow', sans-serif", lineHeight: 1.4 }}>
                              {ex.notes}
                            </div>
                          </div>

                          <div style={{ fontSize: 20, fontWeight: 900, color: phase.color, textAlign: "center" }}>{ex.sets}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1", fontFamily: "'Barlow', sans-serif", textAlign: "center" }}>{ex.reps}</div>
                          <div style={{ fontSize: 14, color: "#94a3b8", fontFamily: "'Barlow', sans-serif", textAlign: "center" }}>{ex.rest}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer tip */}
      <div style={{ maxWidth: 680, margin: "24px auto 0", padding: "0 24px" }}>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#475569", fontFamily: "'Barlow', sans-serif", marginBottom: 8 }}>COACH NOTES</div>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              "Pendulum squat first — hit it fresh and heavy.",
              "Explosive block: treat every rep like a max effort. Load is irrelevant — speed is everything.",
              "If lower back flares on RDLs, swap for Nordic curl or lying leg curl instead.",
              "Hydrate between phases. Cramp prevention matters on a 75-min session.",
              "Tap exercises as you finish them to track progress.",
            ].map((tip, i) => (
              <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "#94a3b8", fontFamily: "'Barlow', sans-serif", lineHeight: 1.5 }}>
                <span style={{ color: "#ef4444", flexShrink: 0 }}>→</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
