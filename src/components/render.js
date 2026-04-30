import { escapeHtml } from "../utils/escape.js";
import { formatActualWeight, getExerciseCategory } from "../utils/workout.js";
import { getLogDateParts } from "../utils/date.js";
import { trashIcon } from "./icons.js";

export function renderCategoryBadge(item) {
  return `<span class="badge category-badge">${escapeHtml(getExerciseCategory(item))}</span>`;
}

export function renderMediaContent(item) {
  if (item.mediaUrl && item.mediaType === "video") {
    return `
      <video controls muted playsinline preload="metadata">
        <source src="${escapeHtml(item.mediaUrl)}">
      </video>
    `;
  }

  if (item.mediaUrl && (item.mediaType === "image" || item.mediaType === "gif")) {
    return `<img src="${escapeHtml(item.mediaUrl)}" alt="${escapeHtml(item.name)}">`;
  }

  return "Media belum tersedia. Ikuti instruksi gerakan.";
}

export function renderWorkoutCards(generatedWorkout) {
  if (!generatedWorkout.length) {
    return `<div class="empty">Tidak ada latihan yang cocok.</div>`;
  }

  return generatedWorkout
    .map(
      (item, index) => `
        <article class="exercise-card">
          <div class="exercise-head">
            <div>
              <div class="exercise-title">${index + 1}. ${escapeHtml(item.name)}</div>
              <div class="small">
                ${escapeHtml((item.primaryMuscles || []).join(", ")) || "-"} •
                ${escapeHtml((item.equipmentTypes || []).join(", ")) || "-"}
              </div>
              <div class="badge-row">
                ${renderCategoryBadge(item)}
                <span class="badge">${escapeHtml(item.intensity || "normal")}</span>
              </div>
            </div>
          </div>

          <div class="media-box">
            ${renderMediaContent(item)}
          </div>

          <div class="exercise-section">
            <div class="section-title">
              <span>Rekomendasi</span>
            </div>

            <div class="recommend-grid">
              <div class="recommend-item">Set<strong>${item.recommendedSets || "-"}</strong></div>
              <div class="recommend-item">Reps<strong>${escapeHtml(item.recommendedReps || "-")}</strong></div>
              <div class="recommend-item">Istirahat<strong>${item.recommendedRestSeconds || "-"} dtk</strong></div>
              <div class="recommend-item">Beban<strong>${item.requiresWeight ? "Ringan" : "Bodyweight"}</strong></div>
            </div>

            ${
              item.recommendedWeightNote
                ? `<div class="small" style="margin-top:10px;">${escapeHtml(item.recommendedWeightNote)}</div>`
                : ""
            }

            <ol class="instruction-list compact">
              ${(item.instructions || [])
                .slice(0, 5)
                .map((step) => `<li>${escapeHtml(step)}</li>`)
                .join("")}
            </ol>
          </div>

          <div class="exercise-section">
            <div class="section-title">
              <span>Realisasi</span>
              <span class="small">isi setelah selesai</span>
            </div>

            <div class="actual-grid">
              <div class="actual-field">
                <label>Set <span style="color:#fecaca;">*</span></label>
                <input class="actual-required actual-sets-input" data-label="Set" data-index="${index}" data-field="actualSets" type="number" min="0" value="${item.actualSets}" placeholder="0">
                <div class="field-help">0 jika skip</div>
              </div>

              <div class="actual-field">
                <label>Reps <span style="color:#fecaca;">*</span></label>
                <input class="actual-required" data-label="Reps" data-index="${index}" data-field="actualReps" type="text" placeholder="12,10,8 / 0" value="${escapeHtml(item.actualReps)}">
              </div>

              <div class="actual-field">
                <label>Beban kg <span style="color:#fecaca;">*</span></label>
                <input class="actual-required" data-label="Beban" data-index="${index}" data-field="actualWeightKg" type="number" step="0.5" min="0" value="${item.actualWeightKg}" placeholder="0">
              </div>

              <div class="actual-field">
                <label>Capek 1-5 <span style="color:#fecaca;">*</span></label>
                <input class="actual-required" data-label="Capek" data-index="${index}" data-field="difficulty" type="number" min="1" max="5" value="${item.difficulty}" placeholder="1-5">
              </div>
            </div>

            <label>Catatan</label>
            <input type="text" placeholder="Opsional" data-index="${index}" data-field="actualNote">
          </div>
        </article>
      `
    )
    .join("");
}

export function renderLogCards(currentLogs) {
  return currentLogs
    .slice(0, 20)
    .map((log) => {
      const dateParts = getLogDateParts(log.createdAtLocal);

      return `
        <div class="history-item">
          <div class="history-date">
            <div>${escapeHtml(dateParts.day)}<span>${escapeHtml(dateParts.month)}</span></div>
          </div>

          <button class="history-button" data-log-id="${escapeHtml(log.id)}" type="button">
            <strong>${escapeHtml(log.workoutName || "Workout")}</strong>
            <div class="small">
              ${escapeHtml(dateParts.time)} • ${log.selectedDurationMinutes || 0} menit •
              ${log.totalActualExercises || 0} latihan • ${log.totalActualSets || 0} set
            </div>
            ${log.note ? `<div class="small">${escapeHtml(log.note)}</div>` : ""}
            <div class="badge-row">
              <span class="badge">${escapeHtml(log.selectedLevel || "-")}</span>
              <span class="badge">${escapeHtml((log.selectedEquipmentTypes || []).join(", ") || "bodyweight")}</span>
            </div>
          </button>

          <div class="history-actions">
            <button class="icon-btn" type="button" data-delete-log-id="${escapeHtml(log.id)}" title="Hapus log" aria-label="Hapus log">
              ${trashIcon()}
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

export function renderLogDetail(log) {
  const exercises = Array.isArray(log.exercises) ? log.exercises : [];

  return `
    <div class="log-detail">
      <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
        <button id="modalDeleteButton" class="icon-btn" type="button" title="Hapus log">
          ${trashIcon()}
        </button>
      </div>

      <div class="small">
        <strong>User:</strong> ${escapeHtml(log.userName || log.userId || "-")}<br>
        <strong>Level:</strong> ${escapeHtml(log.selectedLevel || "-")}<br>
        <strong>Alat:</strong> ${escapeHtml((log.selectedEquipmentTypes || []).join(", ") || "-")}<br>
        <strong>Beban tersedia:</strong> ${escapeHtml((log.selectedAvailableWeightsKg || []).join(", ") || "-")} kg
      </div>

      <div class="detail-grid">
        <div class="detail-stat"><strong>${log.selectedDurationMinutes || 0}</strong><span class="small">Menit</span></div>
        <div class="detail-stat"><strong>${log.totalActualExercises || 0}</strong><span class="small">Latihan</span></div>
        <div class="detail-stat"><strong>${log.totalActualSets || 0}</strong><span class="small">Set</span></div>
        <div class="detail-stat"><strong>${escapeHtml(log.status || "-")}</strong><span class="small">Status</span></div>
      </div>

      <h4 style="margin:14px 0 8px;">Detail latihan</h4>
      ${
        exercises.length
          ? exercises.map((exercise, index) => renderLogExercise(exercise, index)).join("")
          : `<div class="empty">Tidak ada detail latihan.</div>`
      }
    </div>
  `;
}

function renderLogExercise(exercise, index) {
  return `
    <div class="log-exercise">
      <div class="log-exercise-title">${index + 1}. ${escapeHtml(exercise.name || "Latihan")}</div>
      <div class="small">
        ${escapeHtml((exercise.primaryMuscles || []).join(", ") || exercise.muscleGroup || "-")} •
        ${escapeHtml((exercise.equipmentTypes || []).join(", ") || "-")}
      </div>

      <div class="kv-list">
        <div class="kv">Rekomendasi set<span>${exercise.recommendedSets || "-"}</span></div>
        <div class="kv">Set<span>${exercise.actualSets || 0}</span></div>
        <div class="kv">Rekomendasi reps<span>${escapeHtml(exercise.recommendedReps || "-")}</span></div>
        <div class="kv">Reps<span>${escapeHtml(exercise.actualReps || "-")}</span></div>
        <div class="kv">Beban<span>${escapeHtml(formatActualWeight(exercise))}</span></div>
        <div class="kv">Capek<span>${exercise.difficulty || "-"}/5</span></div>
      </div>

      ${
        exercise.note
          ? `<div class="small" style="margin-top:8px;"><strong>Catatan:</strong> ${escapeHtml(exercise.note)}</div>`
          : ""
      }
    </div>
  `;
}
