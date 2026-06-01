export function toDateKey(date = new Date()) {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

export function formatHumanDate(dateKey) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(dateKey));
}

export function weekday(dateKey) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(new Date(dateKey));
}

export function monthLabel(dateKey) {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(dateKey));
}

export function addDays(dateKey, amount) {
  const date = new Date(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function startOfWeek(dateKey) {
  const date = new Date(dateKey);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return toDateKey(date);
}

export function daysOfWeek(dateKey) {
  const start = startOfWeek(dateKey);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function monthDays(dateKey) {
  const date = new Date(dateKey);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(toDateKey(first));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function moonPhase(dateKey = toDateKey()) {
  const phases = ["Новолуние", "Растущий серп", "Первая четверть", "Растущая луна", "Полнолуние", "Убывающая луна", "Последняя четверть", "Старая луна"];
  const date = new Date(dateKey);
  const knownNewMoon = new Date("2000-01-06T18:14:00Z");
  const days = (date.getTime() - knownNewMoon.getTime()) / 86400000;
  const age = ((days % 29.53058867) + 29.53058867) % 29.53058867;
  const index = Math.floor((age / 29.53058867) * phases.length) % phases.length;
  const illumination = Math.round((1 - Math.cos((age / 29.53058867) * 2 * Math.PI)) * 50);
  return { phase: phases[index], illumination };
}

export function isSameDayTask(task, dateKey) {
  if (task.date === dateKey) return true;
  if (!task.repeat || task.repeat === "none" || !task.date) return false;
  const taskDate = new Date(task.date);
  const target = new Date(dateKey);
  if (taskDate > target) return false;
  if (task.repeat === "daily") return true;
  if (task.repeat === "weekly") return taskDate.getDay() === target.getDay();
  if (task.repeat === "monthly") return taskDate.getDate() === target.getDate();
  return false;
}
