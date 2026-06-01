import {
  CalendarDays,
  Check,
  CirclePlus,
  Cloud,
  CloudOff,
  Edit3,
  Moon,
  NotebookPen,
  Plus,
  Search,
  Shapes,
  Target,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { baseSections, priorities, repeatModes, sectionPalette, taskStatuses } from "./data/defaults";
import { entitySchemas } from "./data/schemas";
import { useAuth } from "./hooks/useAuth";
import { usePlannerData } from "./hooks/usePlannerData";
import { daysOfWeek, formatHumanDate, isSameDayTask, monthDays, monthLabel, moonPhase, toDateKey, weekday } from "./lib/dates";

const storeLabels = {
  tasks: "Задача",
  notes: "Заметка",
  shoppingItems: "Покупка",
  recipes: "Рецепт",
  gardenCrops: "Культура",
  goals: "Цель",
  rituals: "Ритуал",
  sections: "Раздел"
};

const quickActions = [
  { store: "tasks", label: "Задача" },
  { store: "notes", label: "Заметка" },
  { store: "shoppingItems", label: "Покупка" },
  { store: "recipes", label: "Рецепт" }
];

const bottomNav = [
  { id: "today", label: "Сегодня", icon: CalendarDays },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "home", label: "Разделы", icon: Shapes },
  { id: "notes", label: "Заметки", icon: NotebookPen },
  { id: "goals", label: "Цели", icon: Target }
];

function emptyRecord(store, dateKey, sectionId = "today") {
  const base = { sectionId, date: dateKey };
  const maps = {
    tasks: { ...base, title: "", description: "", status: "planned", priority: "medium", repeat: "none", reminderAt: "" },
    notes: { ...base, title: "", body: "" },
    shoppingItems: { title: "", quantity: "", sectionId: "home", checked: false },
    recipes: { title: "", category: "Заготовки", ingredients: "", method: "", cookedAt: dateKey, repeat: "yes" },
    gardenCrops: { culture: "", variety: "", seasonYear: new Date(dateKey).getFullYear(), plantingPlace: "", notes: "", plantAgain: "question" },
    goals: { title: "", sectionId, deadline: "", steps: [{ title: "", done: false }], status: "planned" },
    rituals: { type: "morning", title: "", actions: [""], date: dateKey, note: "", completed: false },
    sections: { title: "", color: sectionPalette.custom, icon: "Star", hidden: false, order: Date.now() }
  };
  return maps[store];
}

function AuthPanel({ authState }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [error, setError] = useState("");

  if (!authState.hasFirebaseConfig) {
    return <div className="auth-card"><h1>Мой жизненный планировщик</h1><p>Firebase ещё не настроен, поэтому включён локальный демо-режим с IndexedDB.</p></div>;
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (mode === "signup") await authState.signUp(email, password);
      else await authState.signIn(email, password);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>Мой жизненный планировщик</h1>
      {authState.error && <p className="error">{authState.error}</p>}
      <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" />
      <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" type="password" />
      {error && <p className="error">{error}</p>}
      <button className="primary" type="submit">{mode === "signup" ? "Создать аккаунт" : "Войти"}</button>
      <button type="button" onClick={() => authState.signInGoogle()}>Войти через Google</button>
      <button type="button" className="text-button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "У меня уже есть аккаунт" : "Создать аккаунт"}</button>
    </form>
  );
}

function Shell({ children, sections, active, setActive, online, syncState, user, onSignOut }) {
  const syncLabel = syncState === "pending" ? "ждёт синхронизации" : syncState === "error" ? "ошибка синхронизации" : "синхронизировано";
  const syncText = `${online ? "онлайн" : "офлайн"} · ${syncLabel}`;
  const isBottomActive = (item) => item.id === "home" ? !["today", "calendar", "notes", "goals"].includes(active) : active === item.id;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="app-title"><div className="brand-mark compact"><CalendarDays size={20} /></div><div><strong>Мой жизненный планировщик</strong><span>{syncText}</span></div></div>
        <div className="search"><Search size={18} /><span>План недели, заметки, дом, огород</span></div>
        <div className="status-pill">{online ? <Cloud size={16} /> : <CloudOff size={16} />}{syncText}</div>
        <button className="avatar" onClick={onSignOut}>{user?.displayName?.[0] || user?.email?.[0] || "Я"}</button>
      </header>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><CalendarDays size={24} /></div><div><strong>Мой жизненный</strong><span>планировщик</span></div></div>
        <div className="mobile-sync">{online ? <Cloud size={14} /> : <CloudOff size={14} />}{syncText}</div>
        <nav>{sections.map((section) => {
          const Icon = section.icon || baseSections.find((item) => item.id === "custom").icon;
          return <button key={section.id} className={active === section.id ? "active" : ""} onClick={() => setActive(section.id)}><span style={{ background: section.color }}><Icon size={18} /></span>{section.title}</button>;
        })}</nav>
      </aside>
      <main>{children}</main>
      <nav className="bottom-nav" aria-label="Основная навигация">{bottomNav.map((item) => { const Icon = item.icon; return <button key={item.id} className={isBottomActive(item) ? "active" : ""} onClick={() => setActive(item.id)}><Icon size={19} /><span>{item.label}</span></button>; })}</nav>
    </div>
  );
}

function Today({ data, onNew, onEdit, onDelete, onToggle, dateKey }) {
  const moon = moonPhase(dateKey);
  const tasks = data.tasks.filter((task) => isSameDayTask(task, dateKey));
  const important = tasks.filter((task) => ["high", "critical"].includes(task.priority));
  const done = tasks.filter((task) => task.status === "done");
  return (
    <section className="page">
      <div className="today-hero"><div><strong className="today-app-name">Мой жизненный планировщик</strong><p>{weekday(dateKey)}</p><h1>{formatHumanDate(dateKey)}</h1><span><Moon size={18} /> {moon.phase} · освещённость {moon.illumination}%</span></div><div className="quick-actions">{quickActions.map((action) => <button key={action.store} onClick={() => onNew(action.store)}><Plus size={18} />{action.label}</button>)}</div></div>
      <div className="dashboard-grid">
        <Panel title="Что важно сегодня">{important.length ? important.map((task) => <TaskRow key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />) : <Empty text="Выберите важные дела на день." />}</Panel>
        <Panel title="Задачи на сегодня">{tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />) : <Empty text="На сегодня задач нет." />}</Panel>
        <Panel title="Повторяющиеся дела">{tasks.filter((task) => task.repeat !== "none").map((task) => <TaskRow key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />)}</Panel>
        <Panel title="Сделано за день">{done.length ? done.map((task) => <MiniItem key={task.id} title={task.title} meta="готово" />) : <Empty text="Здесь появятся выполненные дела." />}</Panel>
      </div>
    </section>
  );
}

function CalendarView({ data, dateKey, setDateKey, onEdit }) {
  const [mode, setMode] = useState("week");
  const days = mode === "day" ? [dateKey] : mode === "week" ? daysOfWeek(dateKey) : monthDays(dateKey);
  return <section className="page"><div className="section-header"><div><p>Календарь</p><h1>{mode === "month" ? monthLabel(dateKey) : formatHumanDate(dateKey)}</h1></div><div className="segmented">{["day", "week", "month"].map((item) => <button key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item === "day" ? "День" : item === "week" ? "Неделя" : "Месяц"}</button>)}</div></div><div className={`calendar-grid ${mode}`}>{days.map((day) => { const dayTasks = data.tasks.filter((task) => isSameDayTask(task, day)); const moon = moonPhase(day); return <button key={day} className={day === dateKey ? "calendar-day selected" : "calendar-day"} onClick={() => setDateKey(day)}><strong>{new Date(day).getDate()}</strong><span>{weekday(day).slice(0, 2)}</span><small>{moon.phase}</small>{dayTasks.slice(0, 4).map((task) => <em key={task.id} onClick={(event) => { event.stopPropagation(); onEdit("tasks", task); }}>{task.title}</em>)}</button>; })}</div></section>;
}

function Panel({ title, children }) { return <div className="panel"><h2>{title}</h2><div className="panel-body">{children}</div></div>; }
function Empty({ text }) { return <p className="empty">{text}</p>; }
function MiniItem({ title, meta }) { return <div className="mini-item"><strong>{title}</strong><span>{meta}</span></div>; }

function TaskRow({ task, onEdit, onDelete, onToggle }) {
  const status = taskStatuses.find((item) => item.value === task.status)?.label;
  return <article className={`task-row priority-${task.priority}`}><button className="check" onClick={() => onToggle(task)}>{task.status === "done" ? <Check size={16} /> : ""}</button><div className="task-content"><strong>{task.title}</strong><span>{status} · {task.reminderAt || "без напоминания"}</span></div><div className="task-actions"><button title="Редактировать" onClick={() => onEdit("tasks", task)}><Edit3 size={16} /></button><button title="Удалить" onClick={() => onDelete("tasks", task.id)}><Trash2 size={16} /></button></div></article>;
}

function CollectionPage({ title, store, items, onNew, onEdit, onDelete, renderItem }) {
  return <section className="page"><div className="section-header"><div><p>{storeLabels[store]}</p><h1>{title}</h1></div><button className="primary" onClick={() => onNew(store)}><CirclePlus size={18} />Добавить</button></div><div className="cards-grid">{items.length ? items.map((item) => <article key={item.id} className="entity-card">{renderItem(item)}<div className="card-actions"><button onClick={() => onEdit(store, item)}><Edit3 size={16} />Изменить</button><button onClick={() => onDelete(store, item.id)}><Trash2 size={16} />Удалить</button></div></article>) : <Empty text="Здесь пока пусто." />}</div></section>;
}

function SettingsPage({ onNew }) {
  return <section className="page"><div className="section-header"><div><p>Настройки</p><h1>Структура и подготовка</h1></div></div><div className="settings-grid"><Panel title="Сущности MVP">{Object.entries(entitySchemas).map(([name, fields]) => <MiniItem key={name} title={name} meta={`${fields.length} полей`} />)}</Panel><Panel title="Будущая функция"><p className="empty">Голосовой ввод заложен отдельным адаптером и может быть подключён позже.</p></Panel><Panel title="Пользовательские разделы"><button className="primary" onClick={() => onNew("sections")}><Plus size={18} />Создать раздел</button></Panel></div></section>;
}

function EntityModal({ store, record, sections, onClose, onSave }) {
  const [form, setForm] = useState(record);
  const title = record?.id ? `Изменить: ${storeLabels[store]}` : `Добавить: ${storeLabels[store]}`;
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  function save(event) { event.preventDefault(); onSave(store, form); }
  return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="modal-header"><h2>{title}</h2><button type="button" onClick={onClose}><X size={18} /></button></div><Field label={store === "gardenCrops" ? "Культура" : store === "shoppingItems" ? "Что купить" : store === "goals" ? "Цель" : "Название"} value={form.title || form.culture || ""} onChange={(v) => store === "gardenCrops" ? set("culture", v) : set("title", v)} required />{store === "tasks" && <><Text label="Описание" value={form.description} onChange={(v) => set("description", v)} /><Select label="Раздел" value={form.sectionId} onChange={(v) => set("sectionId", v)} options={sections.map((s) => ({ value: s.id, label: s.title }))} /><Field label="Дата" type="date" value={form.date} onChange={(v) => set("date", v)} /><Select label="Статус" value={form.status} onChange={(v) => set("status", v)} options={taskStatuses} /><Select label="Приоритет" value={form.priority} onChange={(v) => set("priority", v)} options={priorities} /><Select label="Повтор" value={form.repeat} onChange={(v) => set("repeat", v)} options={repeatModes} /><Field label="Напоминание" type="time" value={form.reminderAt} onChange={(v) => set("reminderAt", v)} /></>}{store === "notes" && <Text label="Текст" value={form.body} onChange={(v) => set("body", v)} />}{store === "shoppingItems" && <Field label="Количество" value={form.quantity} onChange={(v) => set("quantity", v)} />}{store === "goals" && <Field label="Срок" type="date" value={form.deadline} onChange={(v) => set("deadline", v)} />}{store === "gardenCrops" && <><Field label="Сорт" value={form.variety} onChange={(v) => set("variety", v)} /><Field label="Место посадки" value={form.plantingPlace} onChange={(v) => set("plantingPlace", v)} /><Text label="Заметки" value={form.notes} onChange={(v) => set("notes", v)} /></>}<div className="modal-actions"><button type="button" onClick={onClose}>Отмена</button><button className="primary" type="submit">Сохранить</button></div></form></div>;
}

function Field({ label, value, onChange, type = "text", required }) { return <label>{label}<input required={required} type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} /></label>; }
function Text({ label, value, onChange }) { return <label>{label}<textarea value={value || ""} onChange={(event) => onChange(event.target.value)} /></label>; }
function Select({ label, value, onChange, options }) { return <label>{label}<select value={value || ""} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }

export default function App() {
  const authState = useAuth();
  const planner = usePlannerData(authState.user);
  const [active, setActive] = useState("today");
  const [dateKey, setDateKey] = useState(toDateKey());
  const [modal, setModal] = useState(null);
  const seededUserRef = useRef("");

  useEffect(() => {
    const uid = authState.user?.uid;
    if (uid && seededUserRef.current !== uid) {
      seededUserRef.current = uid;
      planner.seedDemoData();
    }
  }, [authState.user?.uid, planner.seedDemoData]);

  const currentSection = planner.sections.find((section) => section.id === active);
  const sectionTasks = planner.data.tasks.filter((task) => task.sectionId === active);
  const customSection = planner.data.sections.find((section) => section.id === active);
  const openNew = (store) => setModal({ store, record: emptyRecord(store, dateKey, active) });
  const openEdit = (store, record) => setModal({ store, record });
  const save = async (store, record) => { await planner.upsert(store, record); setModal(null); };
  const remove = (store, id) => planner.remove(store, id);
  const toggleTask = (task) => planner.upsert("tasks", { ...task, status: task.status === "done" ? "planned" : "done" });

  const page = useMemo(() => {
    if (active === "today") return <Today data={planner.data} onNew={openNew} onEdit={openEdit} onDelete={remove} onToggle={toggleTask} dateKey={dateKey} />;
    if (active === "calendar") return <CalendarView data={planner.data} dateKey={dateKey} setDateKey={setDateKey} onEdit={openEdit} />;
    if (active === "garden") return <CollectionPage title="Огород и сад" store="gardenCrops" items={planner.data.gardenCrops} onNew={openNew} onEdit={openEdit} onDelete={remove} renderItem={(item) => <><h2>{item.culture || "Культура"}</h2><p>{item.variety} · сезон {item.seasonYear}</p><span>{item.plantingPlace || "место не указано"}</span></>} />;
    if (active === "recipes") return <CollectionPage title="Рецепты и заготовки" store="recipes" items={planner.data.recipes} onNew={openNew} onEdit={openEdit} onDelete={remove} renderItem={(item) => <><h2>{item.title}</h2><p>{item.category}</p><span>{item.cookedAt || "без даты"}</span></>} />;
    if (active === "notes") return <CollectionPage title="Заметки" store="notes" items={planner.data.notes} onNew={openNew} onEdit={openEdit} onDelete={remove} renderItem={(item) => <><h2>{item.title}</h2><p>{item.body}</p><span>{item.date}</span></>} />;
    if (active === "goals") return <CollectionPage title="Цели" store="goals" items={planner.data.goals} onNew={openNew} onEdit={openEdit} onDelete={remove} renderItem={(item) => <><h2>{item.title}</h2><p>{(item.steps || []).length} шагов</p><span>{item.deadline || "без срока"}</span></>} />;
    if (active === "settings") return <SettingsPage onNew={openNew} />;
    if (active === "custom") return <CollectionPage title="Пользовательские разделы" store="sections" items={planner.data.sections} onNew={openNew} onEdit={openEdit} onDelete={remove} renderItem={(item) => <><h2>{item.title}</h2><p>{item.hidden ? "скрыт" : "виден"}</p><span style={{ background: item.color }} /></>} />;
    if (["home", "work", "self", "study"].includes(active) || customSection) return <CollectionPage title={currentSection?.title || "Раздел"} store="tasks" items={sectionTasks} onNew={openNew} onEdit={openEdit} onDelete={remove} renderItem={(item) => <><h2>{item.title}</h2><p>{item.description || taskStatuses.find((status) => status.value === item.status)?.label}</p><span>{item.date}</span></>} />;
    return <Today data={planner.data} onNew={openNew} onEdit={openEdit} onDelete={remove} onToggle={toggleTask} dateKey={dateKey} />;
  }, [active, planner.data, dateKey, currentSection?.title]);

  if (authState.loading) return <div className="center">Загружаем планировщик...</div>;
  if (!authState.user) return <div className="auth-layout"><AuthPanel authState={authState} /></div>;

  return <Shell sections={planner.sections} active={active} setActive={setActive} online={planner.online} syncState={planner.syncState} user={authState.user} onSignOut={authState.hasFirebaseConfig ? authState.signOut : undefined}>{page}{modal && <EntityModal store={modal.store} record={modal.record} sections={planner.sections} onClose={() => setModal(null)} onSave={save} />}</Shell>;
}
