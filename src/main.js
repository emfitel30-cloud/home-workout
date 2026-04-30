import "./styles.css";

import { LOCAL_USERS } from "./constants/users.js";
import {
  deleteActivityLog,
  getActiveCollection,
  getUserLogs,
  saveActivityLog,
} from "./services/firestoreService.js";
import { getUserIcon } from "./components/icons.js";
import {
  renderLogCards,
  renderLogDetail,
  renderWorkoutCards,
} from "./components/render.js";
import {
  calculateAverageDifficulty,
  getExerciseCategory,
  getExerciseCountByDuration,
  pickRandom,
  sortLogsNewestFirst,
} from "./utils/workout.js";
import { formatDate } from "./utils/date.js";
import { escapeHtml } from "./utils/escape.js";

let activeUser = null;
let equipmentData = [];
let muscleData = [];
let exercisesData = [];
let generatedWorkout = [];
let currentLogs = [];
let pendingDeleteLogId = null;

const $ = (id) => document.getElementById(id);

function setStatus(message) {
  $("statusBox").textContent = message;
}

async function selectUser(userId) {
  activeUser = LOCAL_USERS[userId];
  generatedWorkout = [];

  document.body.className = userId === "rahel" ? "rahel-theme" : "";
  $("landingPage").classList.add("hidden");
  $("appPage").classList.remove("hidden");

  $("brandIcon").innerHTML = getUserIcon(activeUser.gender);
  $("brandTitle").textContent = activeUser.name;
  $("brandSubtitle").textContent =
    activeUser.gender === "male"
      ? "Program latihan dengan dumbbell, barbell, dan bodyweight"
      : "Program full body sederhana tanpa alat";
  $("levelInput").value = activeUser.defaultLevel || "beginner";

  resetWorkoutUI();
  setStatus("Memuat data...");

  try {
    equipmentData = await getActiveCollection("equipment");
    muscleData = await getActiveCollection("muscles");
    exercisesData = await getActiveCollection("exercises");

    renderFormOptions();
    await loadLogs();

    setStatus("Data latihan siap. Total gerakan: " + exercisesData.length);
  } catch (error) {
    console.error(error);
    setStatus("Gagal memuat data. Cek Firebase rules, collection, dan config.");
  }
}

function backToLanding() {
  $("appPage").classList.add("hidden");
  $("landingPage").classList.remove("hidden");
  document.body.className = "";
}

function renderFormOptions() {
  renderEquipmentOptions();
  renderPlateOptions();
  renderMuscleGroupOptions();
}

function renderEquipmentOptions() {
  const allowed = activeUser.allowedEquipmentTypes || [];

  const uniqueTypes = [
    ...new Set(
      equipmentData
        .filter((item) => (item.usableBy || []).includes(activeUser.id))
        .map((item) => item.equipmentType)
        .filter((type) => allowed.includes(type))
    ),
  ];

  $("equipmentOptions").innerHTML =
    uniqueTypes
      .map(
        (type) => `
          <label class="check-item">
            <input type="checkbox" class="equipment-check" value="${escapeHtml(type)}" ${type === "bodyweight" ? "checked" : ""}>
            ${escapeHtml(type)}
          </label>
        `
      )
      .join("") || `<div class="small">Tidak ada alat untuk user ini.</div>`;
}

function renderPlateOptions() {
  const plates = equipmentData
    .filter((item) => item.type === "plate")
    .filter((item) => (item.usableBy || []).includes(activeUser.id))
    .sort((a, b) => Number(a.weightKg || 0) - Number(b.weightKg || 0));

  $("plateOptions").innerHTML = plates.length
    ? plates
        .map(
          (item) => `
            <label class="check-item">
              <input type="checkbox" class="plate-check" value="${escapeHtml(item.id)}" data-weight="${Number(item.weightKg || 0)}" checked>
              ${escapeHtml(item.name)}
            </label>
          `
        )
        .join("")
    : `<div class="small">Tidak ada piringan.</div>`;
}

function renderMuscleGroupOptions() {
  const allowedGroups = activeUser.allowedMuscleGroups || [];

  const groups = muscleData
    .filter((item) => item.type === "muscle_group")
    .filter((item) => allowedGroups.includes(item.slug))
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

  $("muscleGroupInput").innerHTML = groups
    .map(
      (item) =>
        `<option value="${escapeHtml(item.slug)}">${escapeHtml(item.displayName || item.name)}</option>`
    )
    .join("");
}

function getCheckedValues(selector) {
  return Array.from(document.querySelectorAll(selector + ":checked")).map(
    (item) => item.value
  );
}

function getCheckedWeights() {
  return Array.from(document.querySelectorAll(".plate-check:checked"))
    .map((item) => Number(item.dataset.weight || 0))
    .filter((num) => !Number.isNaN(num));
}

function buildGenerateForm() {
  return {
    userId: activeUser.id,
    userName: activeUser.name,
    gender: activeUser.gender,
    selectedLevel: $("levelInput").value,
    selectedEquipmentTypes: getCheckedValues(".equipment-check"),
    selectedEquipmentIds: getCheckedValues(".plate-check"),
    selectedAvailableWeightsKg: getCheckedWeights(),
    selectedMuscleGroup: $("muscleGroupInput").value,
    selectedDurationMinutes: Number($("durationInput").value),
    workoutGoal: activeUser.defaultGoal,
  };
}

function generateWorkout() {
  if (!activeUser) return;

  const form = buildGenerateForm();
  const count = getExerciseCountByDuration(form.selectedDurationMinutes);

  let filtered = exercisesData
    .filter((item) => item.active !== false)
    .filter((item) => (item.suitableFor || []).includes(form.userId))
    .filter((item) => item.muscleGroup === form.selectedMuscleGroup)
    .filter((item) => (item.levels || []).includes(form.selectedLevel))
    .filter((item) =>
      (item.equipmentTypes || []).some((type) =>
        form.selectedEquipmentTypes.includes(type)
      )
    );

  filtered = filtered.filter((item) => {
    if (!item.requiresWeight) return true;
    if (!form.selectedAvailableWeightsKg.length) return false;

    const min = Number(item.minRecommendedWeightKg || 0);
    const max = Number(item.maxRecommendedWeightKg || 999);

    return form.selectedAvailableWeightsKg.some(
      (weight) => weight >= min && weight <= max
    );
  });

  generatedWorkout = pickRandom(filtered, count).map((item) => ({
    ...item,
    actualSets: "",
    actualReps: "",
    actualWeightKg: item.requiresWeight ? "" : 0,
    actualWeightText: item.requiresWeight ? "" : "bodyweight",
    actualDurationSeconds: item.recommendedDurationSeconds || null,
    difficulty: "",
    completed: true,
    actualNote: "",
  }));

  $("summaryText").textContent = `Ditemukan ${filtered.length} latihan cocok. Direkomendasikan ${generatedWorkout.length} latihan.`;

  renderWorkout();
  $("saveBox").classList.toggle("hidden", generatedWorkout.length === 0);

  setStatus(
    generatedWorkout.length
      ? "Latihan siap. Isi realisasi setelah selesai."
      : "Tidak ada latihan cocok. Coba ubah alat, level, atau beban."
  );
}

function resetWorkoutUI() {
  generatedWorkout = [];
  $("summaryText").textContent = "Belum generate.";
  $("workoutList").innerHTML = `<div class="empty">Latihan akan muncul di sini.</div>`;
  $("saveBox").classList.add("hidden");
}

function renderWorkout() {
  $("workoutList").innerHTML = renderWorkoutCards(generatedWorkout);

  $("workoutList")
    .querySelectorAll("[data-index][data-field]")
    .forEach((input) => {
      input.addEventListener("input", () => {
        updateActual(Number(input.dataset.index), input.dataset.field, input.value);
      });
    });
}

function updateActual(index, field, value) {
  if (!generatedWorkout[index]) return;

  if (["actualSets", "actualWeightKg", "difficulty"].includes(field)) {
    generatedWorkout[index][field] = value === "" ? "" : Number(value);
  } else {
    generatedWorkout[index][field] = value;
  }
}

function validateActualInputs() {
  let valid = true;
  let firstInvalid = null;
  let firstInvalidLabel = "input";

  document.querySelectorAll(".actual-required").forEach((input) => {
    const rawValue = String(input.value || "").trim();
    let isValid = rawValue !== "";

    if (input.type === "number") {
      const value = Number(rawValue);
      const min = input.min === "" ? null : Number(input.min);
      const max = input.max === "" ? null : Number(input.max);

      isValid = isValid && Number.isFinite(value);

      if (min !== null) isValid = isValid && value >= min;
      if (max !== null) isValid = isValid && value <= max;
    }

    input.classList.toggle("input-error", !isValid);

    if (!isValid && !firstInvalid) {
      firstInvalid = input;
      firstInvalidLabel = input.dataset.label || firstInvalidLabel;
    }

    if (!isValid) valid = false;
  });

  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => firstInvalid.focus(), 250);
    setStatus(`${firstInvalidLabel} belum diisi. Isi 0 kalau skip.`);
  }

  return valid;
}

async function saveProgress() {
  if (!activeUser || !generatedWorkout.length) return;

  if (!validateActualInputs()) {
    setStatus("Lengkapi realisasi. Isi 0 kalau skip.");
    return;
  }

  const form = buildGenerateForm();
  const selectedGroup = muscleData.find(
    (item) => item.slug === form.selectedMuscleGroup
  );

  const totalRecommendedSets = generatedWorkout.reduce(
    (sum, item) => sum + Number(item.recommendedSets || 0),
    0
  );
  const totalActualSets = generatedWorkout.reduce(
    (sum, item) => sum + Number(item.actualSets || 0),
    0
  );

  const logData = {
    userId: form.userId,
    userName: form.userName,
    gender: form.gender,
    selectedLevel: form.selectedLevel,
    selectedEquipmentTypes: form.selectedEquipmentTypes,
    selectedEquipmentIds: form.selectedEquipmentIds,
    selectedAvailableWeightsKg: form.selectedAvailableWeightsKg,
    selectedMuscleGroup: form.selectedMuscleGroup,
    selectedDurationMinutes: form.selectedDurationMinutes,
    workoutName: selectedGroup ? selectedGroup.name : form.selectedMuscleGroup,
    workoutGoal: form.workoutGoal,
    status: "completed",
    totalRecommendedExercises: generatedWorkout.length,
    totalActualExercises: generatedWorkout.filter((item) => item.completed !== false)
      .length,
    totalRecommendedSets,
    totalActualSets,
    note: $("sessionNote").value.trim(),
    exercises: generatedWorkout.map((item) => ({
      exerciseId: item.id || item.slug,
      name: item.name,
      muscleGroup: item.muscleGroup,
      primaryMuscles: item.primaryMuscles || [],
      secondaryMuscles: item.secondaryMuscles || [],
      equipmentTypes: item.equipmentTypes || [],
      equipmentIds: item.equipmentIds || [],
      recommendedSets: Number(item.recommendedSets || 0),
      recommendedReps: item.recommendedReps || "",
      recommendedDurationSeconds: item.recommendedDurationSeconds || null,
      recommendedRestSeconds: item.recommendedRestSeconds || null,
      recommendedWeightNote: item.recommendedWeightNote || "",
      actualSets: Number(item.actualSets),
      actualReps: item.actualReps,
      actualWeightKg: Number(item.actualWeightKg),
      actualWeightText: item.actualWeightText || "",
      actualDurationSeconds: item.actualDurationSeconds || null,
      difficulty: Number(item.difficulty),
      completed: item.completed !== false,
      note: item.actualNote || "",
    })),
  };

  try {
    await saveActivityLog(logData);

    const progressSummary = `Selesai ${generatedWorkout.length} latihan, ${totalActualSets} set, rata-rata capek ${calculateAverageDifficulty(generatedWorkout)}/5.`;

    $("sessionNote").value = "";
    resetWorkoutUI();

    await loadLogs();

    setStatus(progressSummary);
  } catch (error) {
    console.error(error);
    setStatus("Gagal menyimpan progress. Cek Firestore rules.");
  }
}

async function loadLogs() {
  if (!activeUser) return;

  $("logList").innerHTML = `<div class="empty">Memuat log...</div>`;

  try {
    currentLogs = sortLogsNewestFirst(await getUserLogs(activeUser.id));

    if (!currentLogs.length) {
      $("logList").innerHTML = `<div class="empty">Belum ada log untuk ${escapeHtml(activeUser.name)}.</div>`;
      return;
    }

    renderLogs();
  } catch (error) {
    console.error(error);
    $("logList").innerHTML = `<div class="empty">Gagal memuat log. Cek Firebase.</div>`;
  }
}

function renderLogs() {
  $("logList").innerHTML = renderLogCards(currentLogs);

  document.querySelectorAll(".history-button").forEach((button) => {
    button.addEventListener("click", () => openLogModal(button.dataset.logId));
  });

  document.querySelectorAll("[data-delete-log-id]").forEach((button) => {
    button.addEventListener("click", () =>
      openDeleteLogModal(button.dataset.deleteLogId)
    );
  });
}

function openLogModal(logId) {
  const log = currentLogs.find((item) => item.id === logId);
  if (!log) return;

  $("modalTitle").textContent = log.workoutName || "Detail Log";
  $("modalSubtitle").textContent = `${formatDate(log.createdAtLocal)} • ${log.selectedDurationMinutes || 0} menit • ${log.totalActualExercises || 0} latihan`;
  $("modalBody").innerHTML = renderLogDetail(log);
  $("logModal").classList.remove("hidden");

  const modalDelete = $("modalDeleteButton");
  if (modalDelete) {
    modalDelete.addEventListener("click", () => openDeleteLogModal(log.id));
  }
}

function closeLogModal() {
  $("logModal").classList.add("hidden");
  $("modalBody").innerHTML = "";
}

function openDeleteLogModal(logId) {
  if (!logId) return;

  pendingDeleteLogId = logId;

  const log = currentLogs.find((item) => item.id === logId);
  const label = log
    ? `${log.workoutName || "Workout"} pada ${formatDate(log.createdAtLocal)}`
    : "log ini";

  $("deleteLogText").textContent = `Apakah Anda yakin ingin menghapus ${label}? Data log yang sudah dihapus tidak bisa dikembalikan.`;
  $("deleteLogModal").classList.remove("hidden");
}

function closeDeleteLogModal() {
  pendingDeleteLogId = null;
  $("deleteLogModal").classList.add("hidden");
}

async function confirmDeleteLog() {
  const logId = pendingDeleteLogId;
  if (!logId) return;

  try {
    await deleteActivityLog(logId);

    currentLogs = currentLogs.filter((item) => item.id !== logId);

    closeDeleteLogModal();
    closeLogModal();

    if (!currentLogs.length) {
      $("logList").innerHTML = `<div class="empty">Belum ada log untuk ${escapeHtml(activeUser.name)}.</div>`;
    } else {
      renderLogs();
    }

    setStatus("Log berhasil dihapus.");
  } catch (error) {
    console.error(error);
    setStatus("Gagal menghapus log. Cek Firestore rules dan koneksi Firebase.");
  }
}

function bindEvents() {
  document.querySelectorAll("[data-user-id]").forEach((button) => {
    button.addEventListener("click", () => selectUser(button.dataset.userId));
  });

  $("backButton").addEventListener("click", backToLanding);
  $("generateButton").addEventListener("click", generateWorkout);
  $("saveButton").addEventListener("click", saveProgress);
  $("refreshLogButton").addEventListener("click", loadLogs);
  $("closeLogModalButton").addEventListener("click", closeLogModal);
  $("cancelDeleteButton").addEventListener("click", closeDeleteLogModal);
  $("confirmDeleteButton").addEventListener("click", confirmDeleteLog);

  $("logModal").addEventListener("click", (event) => {
    if (event.target.id === "logModal") closeLogModal();
  });

  $("deleteLogModal").addEventListener("click", (event) => {
    if (event.target.id === "deleteLogModal") closeDeleteLogModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLogModal();
      closeDeleteLogModal();
    }
  });
}

function hydrateStaticIcons() {
  document
    .querySelectorAll("[data-icon='male']")
    .forEach((element) => (element.innerHTML = getUserIcon("male")));

  document
    .querySelectorAll("[data-icon='female']")
    .forEach((element) => (element.innerHTML = getUserIcon("female")));
}

function runSelfTests() {
  const tests = [];

  tests.push({ name: "selectUser is global", pass: typeof window.selectUser === "function" });
  tests.push({ name: "duration 45 => 6 exercises", pass: getExerciseCountByDuration(45) === 6 });
  tests.push({ name: "local users exist", pass: Boolean(LOCAL_USERS.yosafat && LOCAL_USERS.rahel) });
  tests.push({ name: "pickRandom safe", pass: pickRandom([1, 2, 3], 2).length === 2 });
  tests.push({
    name: "sort logs newest",
    pass:
      sortLogsNewestFirst([
        { createdAtLocal: "2026-01-01T00:00:00.000Z" },
        { createdAtLocal: "2026-02-01T00:00:00.000Z" },
      ])[0].createdAtLocal === "2026-02-01T00:00:00.000Z",
  });
  tests.push({
    name: "category detects core",
    pass: getExerciseCategory({ tags: ["abs", "core"], name: "Air Bike" }) === "Core",
  });
  tests.push({
    name: "average difficulty",
    pass: calculateAverageDifficulty([{ difficulty: 3 }, { difficulty: 5 }]) === 4,
  });

  const failed = tests.filter((test) => !test.pass);

  if (failed.length) console.error("Self test failed:", failed);
  else console.info("Self test passed:", tests.map((test) => test.name));
}

window.selectUser = selectUser;
window.backToLanding = backToLanding;
window.generateWorkout = generateWorkout;
window.saveProgress = saveProgress;
window.loadLogs = loadLogs;
window.closeLogModal = closeLogModal;
window.closeDeleteLogModal = closeDeleteLogModal;
window.confirmDeleteLog = confirmDeleteLog;

hydrateStaticIcons();
bindEvents();
runSelfTests();
