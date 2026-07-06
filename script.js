const apiKey = "YOUR API KEY";

/* =========================================================
   SHARED: MAIN TAB SWITCHING
   ========================================================= */function showMainSection(event, sectionId) {
  document.querySelectorAll('.main-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  document.querySelectorAll('.main-tab').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');

  if (sectionId === 'streakTab') { renderStreak(); renderCalendar(); renderBadges(); }
  if (sectionId === 'analyticsTab') { renderAnalyticsChart(); }
}

function showClockSection(event, sectionId) {
  document.querySelectorAll('#timerTab .section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  document.querySelectorAll('#timerTab .tab').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');
}

/* =========================================================
   DATA LAYER (all stored in localStorage — works fully offline)
   ========================================================= */
function todayKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getProfile() {
  const raw = localStorage.getItem("hydro_profile");
  return raw ? JSON.parse(raw) : { age: 25, weightKg: 65, heightCm: 170, activity: 1.15 };
}
function saveProfile(p) { localStorage.setItem("hydro_profile", JSON.stringify(p)); }

function getLogs() {
  const raw = localStorage.getItem("hydro_logs");
  return raw ? JSON.parse(raw) : {}; // { "2026-07-06": [{ml, effectiveMl, type, time}], ... }
}
function saveLogs(logs) { localStorage.setItem("hydro_logs", JSON.stringify(logs)); }

function getGoals() {
  const raw = localStorage.getItem("hydro_goals");
  return raw ? JSON.parse(raw) : {}; // { "2026-07-06": goalMl }
}
function saveGoals(g) { localStorage.setItem("hydro_goals", JSON.stringify(g)); }

function getSettings() {
  const raw = localStorage.getItem("hydro_settings");
  return raw ? JSON.parse(raw) : { intervalMin: 60, sleepStart: 22, sleepEnd: 6, missedCount: 0, remindersOn: false };
}
function saveSettings(s) { localStorage.setItem("hydro_settings", JSON.stringify(s)); }

function getBadges() {
  const raw = localStorage.getItem("hydro_badges");
  return raw ? JSON.parse(raw) : [];
}
function saveBadges(b) { localStorage.setItem("hydro_badges", JSON.stringify(b)); }

const DRINK_MULTIPLIERS = {
    water: 1.00,
    coconutWater: 1.00,
    electrolyteDrink: 0.95,
    juice: 0.90,
    milk: 0.90,
    greenTea: 0.90,
    tea: 0.85,
    coffee: 0.70,
    smoothie: 0.80,
    sportsDrink: 0.85,
    softDrink: 0.50,
    energyDrink: 0.40,
    alcohol: 0.20,
    other: 0.50
};

/* =========================================================
   GOAL + BMI CALCULATION
   ========================================================= */
function calculateGoal(profile, weatherTempC) {
  let goal = profile.weightKg * 35; // base ml
  goal *= profile.activity;

  // NEW: adjust for BMI category
  const bmi = calculateBMI(profile);
  if (bmi.category === "Overweight") goal += 250;
  else if (bmi.category === "Obese") goal += 500;
  else if (bmi.category === "Underweight") goal -= 150;

  if (typeof weatherTempC === "number") {
    if (weatherTempC >= 35) goal += 750;
    else if (weatherTempC >= 30) goal += 500;
    else if (weatherTempC >= 25) goal += 250;
  }
  return Math.round(goal / 50) * 50;
}

function calculateBMI(profile) {
  const heightM = profile.heightCm / 100;
  const bmi = profile.weightKg / (heightM * heightM);
  let category = "Normal";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi >= 25 && bmi < 30) category = "Overweight";
  else if (bmi >= 30) category = "Obese";
  return { value: bmi.toFixed(1), category };
}

function saveProfileAndRecalc() {
  const profile = {
    age: parseInt(document.getElementById("profAge").value) || 25,
    weightKg: parseFloat(document.getElementById("profWeight").value) || 65,
    heightCm: parseFloat(document.getElementById("profHeight").value) || 170,
    activity: parseFloat(document.getElementById("profActivity").value) || 1.15
  };
  saveProfile(profile);

  const goal = calculateGoal(profile);
  const goals = getGoals();
  goals[todayKey()] = goal;
  saveGoals(goals);

  const bmi = calculateBMI(profile);
  document.getElementById("goalResultText").textContent = `${goal} ml/day`;
  document.getElementById("bmiResultText").textContent = `${bmi.value} (${bmi.category})`;

  renderTodayProgress();
}

function loadProfileForm() {
  const p = getProfile();
  document.getElementById("profAge").value = p.age;
  document.getElementById("profWeight").value = p.weightKg;
  document.getElementById("profHeight").value = p.heightCm;
  document.getElementById("profActivity").value = p.activity;

  const goals = getGoals();
  const goal = goals[todayKey()] || calculateGoal(p);
  const bmi = calculateBMI(p);
  document.getElementById("goalResultText").textContent = `${goal} ml/day`;
  document.getElementById("bmiResultText").textContent = `${bmi.value} (${bmi.category})`;
}

function getTodayGoal() {
  const goals = getGoals();
  if (goals[todayKey()]) return goals[todayKey()];
  const goal = calculateGoal(getProfile());
  goals[todayKey()] = goal;
  saveGoals(goals);
  return goal;
}

/* =========================================================
   WATER LOGGING
   ========================================================= */
function quickLog(ml) {
  document.getElementById("drinkAmount").value = ml;
  logDrink();
}

function logDrink() {
  const type = document.getElementById("drinkType").value;
  const amount = parseFloat(document.getElementById("drinkAmount").value) || 0;
  if (amount <= 0) { alert("Enter a valid amount."); return; }

  const effectiveMl = Math.round(amount * DRINK_MULTIPLIERS[type]);
  const logs = getLogs();
  const key = todayKey();
  if (!logs[key]) logs[key] = [];
  logs[key].push({ ml: amount, effectiveMl, type, time: new Date().toLocaleTimeString() });
  saveLogs(logs);

  // Logging resets missed-reminder count
  const settings = getSettings();
  settings.missedCount = 0;
  saveSettings(settings);

  renderTodayProgress();
  checkAndUnlockBadges();
}

function renderTodayProgress() {
  const logs = getLogs();
  const key = todayKey();
  const todayLogs = logs[key] || [];
  const totalEffective = todayLogs.reduce((sum, e) => sum + e.effectiveMl, 0);
  const goal = getTodayGoal();
  const pct = Math.min(100, Math.round((totalEffective / goal) * 100));

  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressText").textContent = `${totalEffective} ml / ${goal} ml (${pct}%)`;

  const entriesDiv = document.getElementById("todayEntries");
  entriesDiv.innerHTML = "";
  todayLogs.slice().reverse().forEach(e => {
    const row = document.createElement("div");
    row.className = "entry-row";
    row.innerHTML = `<span>${e.time} — ${e.type} (${e.ml}ml)</span><span>+${e.effectiveMl}ml</span>`;
    entriesDiv.appendChild(row);
  });
}

function clearTodayEntries() {
  if (!confirm("Clear all of today's logged entries? This can't be undone.")) return;
  const logs = getLogs();
  delete logs[todayKey()];
  saveLogs(logs);
  renderTodayProgress();
  renderStreak();
  renderCalendar();
}

function resetAllData() {
  if (!confirm("This will permanently delete ALL your data — logs, streaks, badges, and profile. Are you sure?")) return;
  localStorage.removeItem("hydro_profile");
  localStorage.removeItem("hydro_logs");
  localStorage.removeItem("hydro_goals");
  localStorage.removeItem("hydro_settings");
  localStorage.removeItem("hydro_badges");
  location.reload();
}

/* =========================================================
   STREAK, CALENDAR, BADGES
   ========================================================= */
function dayMetGoal(dateKey, logs, goals) {
  const dayLogs = logs[dateKey] || [];
  const total = dayLogs.reduce((s, e) => s + e.effectiveMl, 0);
  const goal = goals[dateKey] || calculateGoal(getProfile());
  return total >= goal && total > 0;
}

function calculateStreak() {
  const logs = getLogs();
  const goals = getGoals();
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = todayKey(d);
    if (dayMetGoal(key, logs, goals)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function renderStreak() {
  const logs = getLogs();
  const goals = getGoals();
  const streak = calculateStreak();
  let totalHitDays = 0;

  document.getElementById("streakCount").textContent = streak;

  const grid = document.getElementById("streakGrid");
  grid.innerHTML = "";
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const hit = dayMetGoal(key, logs, goals);
    if (hit) totalHitDays++;
    const cell = document.createElement("div");
    cell.className = "streak-cell";
    cell.setAttribute("data-hit", hit ? "1" : "0");
    cell.title = key;
    grid.appendChild(cell);
  }
}

let calendarViewDate = new Date();

function changeCalendarMonth(delta) {
  calendarViewDate.setMonth(calendarViewDate.getMonth() + delta);
  renderCalendar();
}

function renderCalendar() {
  const logs = getLogs();
  const goals = getGoals();
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  document.getElementById("calendarMonthLabel").textContent =
    calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-cell empty";
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = todayKey(d);
    const cell = document.createElement("div");
    const hit = dayMetGoal(key, logs, goals);
    const hasLogs = (logs[key] || []).length > 0;
    cell.className = "calendar-cell " + (hit ? "hit" : (hasLogs ? "missed" : ""));
    cell.textContent = day;
    cell.title = key;
    grid.appendChild(cell);
  }
}

const BADGE_DEFINITIONS = [
  { id: "streak3", label: "3-Day Streak", check: () => calculateStreak() >= 3 },
  { id: "streak7", label: "7-Day Streak", check: () => calculateStreak() >= 7 },
  { id: "streak30", label: "Hydration Master (30 days)", check: () => calculateStreak() >= 30 },
  { id: "logs10", label: "10 Drinks Logged", check: () => totalLogsCount() >= 10 },
  { id: "logs50", label: "50 Drinks Logged", check: () => totalLogsCount() >= 50 },
];

function totalLogsCount() {
  const logs = getLogs();
  return Object.values(logs).reduce((sum, arr) => sum + arr.length, 0);
}

function checkAndUnlockBadges() {
  const unlocked = getBadges();
  BADGE_DEFINITIONS.forEach(b => {
    if (!unlocked.includes(b.id) && b.check()) {
      unlocked.push(b.id);
    }
  });
  saveBadges(unlocked);
  renderBadges();
}

function renderBadges() {
  checkAndUnlockBadges();
  const unlocked = getBadges();
  const grid = document.getElementById("badgesGrid");
  grid.innerHTML = "";
  BADGE_DEFINITIONS.forEach(b => {
    const div = document.createElement("div");
    div.className = "badge" + (unlocked.includes(b.id) ? " unlocked" : "");
    div.innerHTML = `🏆<br>${b.label}`;
    grid.appendChild(div);
  });
}

/* =========================================================
   ANALYTICS (Chart.js)
   ========================================================= */
let analyticsChartInstance = null;

function renderAnalyticsChart() {
  const range = document.getElementById("analyticsRange").value;
  const logs = getLogs();
  const labels = [];
  const data = [];

  if (range === "daily") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = todayKey(d);
      labels.push(key.slice(5));
      data.push((logs[key] || []).reduce((s, e) => s + e.effectiveMl, 0));
    }
  } else if (range === "weekly") {
    for (let w = 7; w >= 0; w--) {
      let total = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - (w * 7 + i));
        total += (logs[todayKey(d)] || []).reduce((s, e) => s + e.effectiveMl, 0);
      }
      labels.push(`Week -${w}`);
      data.push(total);
    }
  } else {
    for (let m = 5; m >= 0; m--) {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      let total = 0;
      Object.keys(logs).forEach(key => {
        const kd = new Date(key);
        if (kd.getMonth() === d.getMonth() && kd.getFullYear() === d.getFullYear()) {
          total += logs[key].reduce((s, e) => s + e.effectiveMl, 0);
        }
      });
      labels.push(monthLabel);
      data.push(total);
    }
  }

  const ctx = document.getElementById("analyticsChart").getContext("2d");
  if (analyticsChartInstance) analyticsChartInstance.destroy();
  analyticsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Effective ml", data, backgroundColor: "#0b74de" }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

/* ---------- Export ---------- */
function exportCSV() {
  const logs = getLogs();
  let csv = "Date,Time,Type,Amount(ml),EffectiveMl\n";
  Object.keys(logs).sort().forEach(date => {
    logs[date].forEach(e => {
      csv += `${date},${e.time},${e.type},${e.ml},${e.effectiveMl}\n`;
    });
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hydroflow_history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const logs = getLogs();
  doc.setFontSize(16);
  doc.text("HydroFlow — Hydration Report", 10, 15);
  doc.setFontSize(10);
  let y = 25;
  Object.keys(logs).sort().forEach(date => {
    const total = logs[date].reduce((s, e) => s + e.effectiveMl, 0);
    doc.text(`${date}: ${total} ml (effective)`, 10, y);
    y += 7;
    if (y > 280) { doc.addPage(); y = 15; }
  });
  doc.save("hydroflow_report.pdf");
}

/* =========================================================
   TIMER
   ========================================================= */
let timerInterval;
let remainingSeconds = 0;

function startTimer() {
  const timerDisplay = document.getElementById("timerDisplay");
  if (remainingSeconds === 0) {
    const hours = parseInt(document.getElementById("timerHours").value) || 0;
    const minutes = parseInt(document.getElementById("timerMinutes").value) || 0;
    const seconds = parseInt(document.getElementById("timerSeconds").value) || 0;
    remainingSeconds = hours * 3600 + minutes * 60 + seconds;
  }
  if (timerInterval) return;

  function updateTimer() {
    const hrs = Math.floor(remainingSeconds / 3600);
    const min = Math.floor((remainingSeconds % 3600) / 60);
    const sec = remainingSeconds % 60;
    timerDisplay.textContent = `${String(hrs).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      playSound();
      alert("Timer done! Time to drink some water 💧");
    } else {
      remainingSeconds--;
    }
  }
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}
function pauseTimer() { clearInterval(timerInterval); timerInterval = null; }
function resetTimer() {
  clearInterval(timerInterval); timerInterval = null; remainingSeconds = 0;
  document.getElementById("timerDisplay").textContent = "00:00:00";
}

/* ---------- Stopwatch ---------- */
function startStopwatch() {
  if (window.stopwatchInterval) return;
  const display = document.getElementById("stopwatchDisplay");
  let elapsed = window.stopwatchElapsed || 0;
  window.stopwatchInterval = setInterval(() => {
    elapsed++;
    window.stopwatchElapsed = elapsed;
    const h = String(Math.floor(elapsed/3600)).padStart(2,'0');
    const m = String(Math.floor((elapsed%3600)/60)).padStart(2,'0');
    const s = String(elapsed%60).padStart(2,'0');
    display.textContent = `${h}:${m}:${s}`;
  }, 1000);
}
function pauseStopwatch() { clearInterval(window.stopwatchInterval); window.stopwatchInterval = null; }
function resetStopwatch() {
  pauseStopwatch(); window.stopwatchElapsed = 0;
  document.getElementById("stopwatchDisplay").textContent = "00:00:00";
}

/* ---------- Alarm ---------- */
function playSound() {
  const s = document.getElementById("timerSound");
  s.play();
  setTimeout(() => { s.pause(); s.currentTime = 0; }, 3000);
}

function setAlarm() {
  const alarmTime = document.getElementById('alarmTime').value;
  if (!alarmTime) { alert('Please select a time for the alarm.'); return; }

  const alarmList = document.getElementById('alarmList');
  const alarmItem = document.createElement('div');
  alarmItem.className = 'alarm-item';
  alarmItem.innerHTML = `
    <span>${alarmTime}</span>
    <label class="switch"><input type="checkbox" checked><span></span></label>
    <button onclick="removeAlarm(this)">Remove</button>
    <button onclick="snoozeAlarm(this)">Snooze 10m</button>
  `;
  alarmList.appendChild(alarmItem);

  const checkAlarm = setInterval(() => {
    const now = new Date();
    const nowTime = now.toTimeString().substring(0,5);
    const toggle = alarmItem.querySelector('input[type="checkbox"]');
    if (nowTime === alarmItem.dataset.time || nowTime === alarmTime) {
      if (toggle.checked) {
        playSound();
        notify("💧 Drink Water!", "It's time for your scheduled water break.");
      }
    }
  }, 1000);
  alarmItem._interval = checkAlarm;
}

function snoozeAlarm(button) {
  const item = button.parentElement;
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10);
  item.dataset.time = d.toTimeString().substring(0,5);
  alert(`Snoozed! Will remind again at ${item.dataset.time}`);
}

function removeAlarm(button) {
  const item = button.parentElement;
  if (item._interval) clearInterval(item._interval);
  item.remove();
}

/* =========================================================
   SMART AUTO REMINDERS (Sleep Mode + Missed Reminder Detection)
   ========================================================= */
let reminderInterval = null;

function requestNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function notify(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  } else {
    console.log(title + ": " + body);
  }
}

function enableReminders() {
  requestNotifPermission();
  const settings = getSettings();
  settings.intervalMin = parseInt(document.getElementById("reminderInterval").value) || 60;
  settings.sleepStart = parseInt(document.getElementById("sleepStart").value);
  settings.sleepEnd = parseInt(document.getElementById("sleepEnd").value);
  settings.remindersOn = true;
  settings.missedCount = settings.missedCount || 0;
  saveSettings(settings);

  document.getElementById("reminderStatus").textContent = "Reminders: ON";
  scheduleNextReminder();
}

function disableReminders() {
  const settings = getSettings();
  settings.remindersOn = false;
  saveSettings(settings);
  if (reminderInterval) clearTimeout(reminderInterval);
  document.getElementById("reminderStatus").textContent = "Reminders: OFF";
}

function isSleepHour(hour, sleepStart, sleepEnd) {
  if (sleepStart === sleepEnd) return false;
  if (sleepStart < sleepEnd) return hour >= sleepStart && hour < sleepEnd;
  return hour >= sleepStart || hour < sleepEnd; // wraps past midnight
}

function scheduleNextReminder() {
  const settings = getSettings();
  if (!settings.remindersOn) return;

  // Missed-reminder detection: if 3+ reminders were ignored (no log since), remind more often
  let effectiveInterval = settings.missedCount >= 3
    ? Math.max(15, Math.round(settings.intervalMin / 2))
    : settings.intervalMin;

  reminderInterval = setTimeout(() => {
    const currentSettings = getSettings();
    if (!currentSettings.remindersOn) return;

    const hour = new Date().getHours();
    if (!isSleepHour(hour, currentSettings.sleepStart, currentSettings.sleepEnd)) {
      notify("💧 HydroFlow Reminder", "Time to drink some water!");
      playSound();
      currentSettings.missedCount = (currentSettings.missedCount || 0) + 1;
      saveSettings(currentSettings);
      document.getElementById("missedCountText").textContent = `Missed reminders: ${currentSettings.missedCount}`;
    }
    scheduleNextReminder();
  }, effectiveInterval * 60 * 1000);
}

/* =========================================================
   WEATHER + AI HYDRATION COACH
   ========================================================= */
function getMealSuggestion() { /* not used in HydroFlow, kept for compatibility */ }

function getCoachTip(weatherMain, tempC, todayEffectiveMl, goal) {
  const w = (weatherMain || "").toLowerCase();
  const pct = goal > 0 ? (todayEffectiveMl / goal) * 100 : 0;

  if (tempC >= 35)
    return "🥵 It's really hot today! Keep a water bottle with you and take a few sips every 30–45 minutes.";
  if (tempC >= 30 && pct < 50)
      return "🌡️ It's quite warm outside, and you're still behind your water goal. Drink a glass of water now to catch up.";
  if (w.includes("rain") && pct < 30)
      return "🌧️ Rainy weather often makes us forget to drink water. Don't forget to stay hydrated today.";
  if (pct >= 100)
      return "🎉 Well done! You've reached your water goal for today. Keep sipping water regularly to stay hydrated.";
  if (pct >= 70)
      return "👏 Nice work! You're almost at your daily water goal. Just a little more to go.";
  if (pct < 30)
      return "💧 You've just started your hydration journey today. Grab a glass of water and keep going!";
  return "😊 Keep drinking water throughout the day. Small, regular sips are the best way to stay hydrated.";
}

async function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return;

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();

  const infoBox = document.getElementById("weatherInfo");
  if (data.cod !== 200) {
    infoBox.innerHTML = `Error: ${data.message}`;
    return;
  }

  infoBox.innerHTML = `
    <p><strong>${data.name}, ${data.sys.country}</strong></p>
    <img src="http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png">
    <p class="temp">${data.main.temp}°C</p>
    <p>${data.weather[0].description}</p>
    <p>Humidity: ${data.main.humidity}%</p>
  `;

  const profile = getProfile();
  const adjustedGoal = calculateGoal(profile, data.main.temp);
  const goals = getGoals();
  goals[todayKey()] = adjustedGoal;
  saveGoals(goals);

  document.getElementById("weatherGoalAdjust").textContent =
    `🎯 Today's Goal based on weather: ${adjustedGoal} ml`;

  const logs = getLogs();
  const todayEffective = (logs[todayKey()] || []).reduce((s,e) => s + e.effectiveMl, 0);
  document.getElementById("coachTip").textContent =
    getCoachTip(data.weather[0].main, data.main.temp, todayEffective, adjustedGoal);

  renderTodayProgress();
}

async function getMyLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
    const res = await fetch(url);
    const data = await res.json();
    document.getElementById("cityInput").value = data.name;
    getWeather();
  });
}

/* =========================================================
   INIT
   ========================================================= */
window.addEventListener("load", () => {
  loadProfileForm();
  renderTodayProgress();
  renderStreak();
  renderCalendar();
  renderBadges();

  const settings = getSettings();
  document.getElementById("reminderInterval").value = settings.intervalMin;
  document.getElementById("sleepStart").value = settings.sleepStart;
  document.getElementById("sleepEnd").value = settings.sleepEnd;
  document.getElementById("reminderStatus").textContent = "Reminders: " + (settings.remindersOn ? "ON" : "OFF");
  document.getElementById("missedCountText").textContent = `Missed reminders: ${settings.missedCount || 0}`;
  if (settings.remindersOn) scheduleNextReminder();

  // Register service worker for PWA offline support (only works when served over http/https, not file://)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
});