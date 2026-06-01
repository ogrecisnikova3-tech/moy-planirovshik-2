import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Flower2,
  GraduationCap,
  Heart,
  Home,
  NotebookPen,
  Settings,
  Soup,
  Target,
  UserRoundCog
} from "lucide-react";

export const entityStores = [
  "sections",
  "tasks",
  "notes",
  "gardenCrops",
  "recipes",
  "goals",
  "rituals",
  "moonPhases",
  "shoppingItems"
];

export const taskStatuses = [
  { value: "planned", label: "Запланировано" },
  { value: "in_progress", label: "В процессе" },
  { value: "done", label: "Выполнено" },
  { value: "postponed", label: "Отложено" },
  { value: "cancelled", label: "Отменено" }
];

export const priorities = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
  { value: "critical", label: "Важный" }
];

export const repeatModes = [
  { value: "none", label: "Без повтора" },
  { value: "daily", label: "Каждый день" },
  { value: "weekly", label: "Каждую неделю" },
  { value: "monthly", label: "Каждый месяц" }
];

export const sectionPalette = {
  home: "#eadcc8",
  garden: "#dce8cf",
  work: "#d9e1ea",
  self: "#e8def3",
  study: "#f2dfa2",
  recipes: "#f5c99d",
  custom: "#dfe8df"
};

export const baseSections = [
  { id: "today", title: "Сегодня", icon: CalendarDays, color: "#f0e4d2", type: "system" },
  { id: "calendar", title: "Календарь", icon: CalendarDays, color: "#e9dcc7", type: "system" },
  { id: "home", title: "Дом", icon: Home, color: sectionPalette.home, type: "system" },
  { id: "garden", title: "Огород и сад", icon: Flower2, color: sectionPalette.garden, type: "system" },
  { id: "work", title: "Работа", icon: BriefcaseBusiness, color: sectionPalette.work, type: "system" },
  { id: "self", title: "Время для себя", icon: Heart, color: sectionPalette.self, type: "system" },
  { id: "study", title: "Обучение", icon: GraduationCap, color: sectionPalette.study, type: "system" },
  { id: "notes", title: "Заметки", icon: NotebookPen, color: "#e7dfd1", type: "system" },
  { id: "recipes", title: "Рецепты", icon: Soup, color: sectionPalette.recipes, type: "system" },
  { id: "goals", title: "Цели", icon: Target, color: "#dbe3d7", type: "system" },
  { id: "custom", title: "Свои разделы", icon: UserRoundCog, color: sectionPalette.custom, type: "system" },
  { id: "settings", title: "Настройки", icon: Settings, color: "#e6e1d8", type: "system" }
];

export const voiceInputRoadmap = {
  enabled: false,
  plannedEntities: ["Task", "Note", "ShoppingItem", "GardenCrop"],
  adapterSlot: "src/lib/voiceInputAdapter.js"
};
