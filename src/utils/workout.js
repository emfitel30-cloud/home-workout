export function pickRandom(items, count) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy.slice(0, Math.min(count, copy.length));
}

export function getExerciseCountByDuration(minutes) {
  if (minutes <= 20) return 3;
  if (minutes <= 30) return 4;
  if (minutes <= 45) return 6;
  if (minutes <= 60) return 8;
  return 10;
}

export function sortLogsNewestFirst(logs) {
  return [...logs].sort(
    (a, b) =>
      new Date(b.createdAtLocal || 0).getTime() -
      new Date(a.createdAtLocal || 0).getTime()
  );
}

export function getExerciseCategory(item) {
  const tags = (item.tags || []).join(" ").toLowerCase();
  const name = String(item.name || "").toLowerCase();
  const text = `${tags} ${name} ${item.intensity || ""}`;

  if (
    text.includes("warmup") ||
    text.includes("stretch") ||
    text.includes("mobility")
  ) {
    return "Mobility";
  }

  if (
    text.includes("abs") ||
    text.includes("core") ||
    text.includes("plank") ||
    text.includes("sit-up")
  ) {
    return "Core";
  }

  if (text.includes("fat_loss") || text.includes("cardio")) {
    return "Cardio";
  }

  return "Strength";
}

export function calculateAverageDifficulty(items) {
  const values = items
    .map((item) => Number(item.difficulty))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return "-";

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(average * 10) / 10;
}

export function formatActualWeight(exercise) {
  if (exercise.actualWeightText) return exercise.actualWeightText;

  if (exercise.actualWeightKg !== undefined && exercise.actualWeightKg !== null) {
    return `${exercise.actualWeightKg} kg`;
  }

  return "-";
}
