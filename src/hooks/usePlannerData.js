import { useCallback, useEffect, useMemo, useState } from "react";
import { baseSections, entityStores } from "../data/defaults";
import { deleteRemote, enableFirestoreOffline, listenUserCollection, writeRemote } from "../firebase/config";
import { deleteLocal, getAllLocal, getQueue, putLocal, queueMutation, removeQueueItem, replaceLocalCollection } from "../lib/idb";
import { toDateKey } from "../lib/dates";
import { useOnlineStatus } from "./useOnlineStatus";

function emptyState() {
  return Object.fromEntries(entityStores.map((store) => [store, []]));
}

function now() {
  return new Date().toISOString();
}

function stamp(record, userId) {
  const time = now();
  return {
    ...record,
    id: record.id || crypto.randomUUID(),
    userId,
    createdAt: record.createdAt || time,
    updatedAt: time
  };
}

export function usePlannerData(user) {
  const online = useOnlineStatus();
  const [data, setData] = useState(emptyState);
  const [syncState, setSyncState] = useState("local");
  const [connectionError, setConnectionError] = useState("");

  const userId = user?.uid || "demo-user";

  useEffect(() => {
    enableFirestoreOffline();
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all(entityStores.map((store) => getAllLocal(store).then((records) => [
      store,
      records.filter((record) => (record.userId || "demo-user") === userId)
    ]))).then((entries) => {
      if (!active) return;
      setData((current) => ({ ...current, ...Object.fromEntries(entries) }));
    }).catch((error) => {
      if (!active) return;
      setConnectionError(error.message);
      setSyncState("error");
    });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const unsubs = entityStores.map((store) =>
      listenUserCollection(store, user.uid, (records) => {
        replaceLocalCollection(store, records, user.uid);
        setData((current) => ({ ...current, [store]: records }));
        setConnectionError("");
        setSyncState("synced");
      }, (error) => {
        setConnectionError(error.message);
        setSyncState("error");
      })
    );
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [user?.uid]);

  const flushQueue = useCallback(async () => {
    if (!online || !user?.uid) return;
    const queue = await getQueue();
    for (const mutation of queue) {
      try {
        if (mutation.type === "delete") {
          await deleteRemote(mutation.storeName, mutation.recordId || mutation.id);
        } else {
          await writeRemote(mutation.storeName, mutation.record);
        }
        await removeQueueItem(mutation.id);
      } catch (error) {
        setConnectionError(error.message);
        setSyncState("pending");
        return;
      }
    }
    setConnectionError("");
    setSyncState("synced");
  }, [online, user?.uid]);

  useEffect(() => {
    flushQueue().catch(() => setSyncState("pending"));
  }, [flushQueue]);

  const upsert = useCallback(
    async (storeName, rawRecord) => {
      const record = stamp(rawRecord, userId);
      await putLocal(storeName, record);
      setData((current) => ({
        ...current,
        [storeName]: [record, ...current[storeName].filter((item) => item.id !== record.id)]
      }));
      if (online && user?.uid) {
        try {
          await writeRemote(storeName, record);
          setConnectionError("");
          setSyncState("synced");
        } catch (error) {
          await queueMutation({ type: "upsert", storeName, record, userId });
          setConnectionError(error.message);
          setSyncState("pending");
        }
      } else {
        await queueMutation({ type: "upsert", storeName, record, userId });
        setSyncState("pending");
      }
      return record;
    },
    [online, user?.uid, userId]
  );

  const remove = useCallback(
    async (storeName, id) => {
      await deleteLocal(storeName, id);
      setData((current) => ({ ...current, [storeName]: current[storeName].filter((item) => item.id !== id) }));
      if (online && user?.uid) {
        try {
          await deleteRemote(storeName, id);
          setConnectionError("");
          setSyncState("synced");
        } catch (error) {
          await queueMutation({ type: "delete", storeName, recordId: id, userId });
          setConnectionError(error.message);
          setSyncState("pending");
        }
      } else {
        await queueMutation({ type: "delete", storeName, recordId: id, userId });
        setSyncState("pending");
      }
    },
    [online, user?.uid, userId]
  );

  const sections = useMemo(() => {
    const customSections = data.sections.filter((section) => !section.hidden);
    return [...baseSections, ...customSections.map((section) => ({ ...section, type: "custom" }))];
  }, [data.sections]);

  const seedDemoData = useCallback(async () => {
    if (data.tasks.length || data.notes.length) return;
    await upsert("tasks", {
      title: "Спланировать неделю",
      sectionId: "today",
      date: toDateKey(),
      status: "planned",
      priority: "high",
      repeat: "weekly",
      reminderAt: "09:00",
      description: "Разложить домашние, рабочие и личные дела."
    });
    await upsert("rituals", {
      type: "morning",
      title: "Спокойное утро",
      actions: ["Вода", "Проветрить", "Три главных дела"],
      date: toDateKey(),
      note: "",
      completed: false
    });
    await upsert("shoppingItems", { title: "Крупа гречневая", quantity: "1 пачка", sectionId: "home", checked: false });
  }, [data.notes.length, data.tasks.length, upsert]);

  return { data, sections, online, syncState, connectionError, upsert, remove, flushQueue, seedDemoData };
}
