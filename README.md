# Мой жизненный планировщик

PWA MVP: личный ежедневник, планировщик и хозяйская книга. Работает как React-приложение для Netlify, использует Firebase Auth, Firestore и локальный IndexedDB-кеш.

## Что уже есть

- Firebase Auth: email/password и Google, если заданы переменные окружения.
- Локальный демо-режим без Firebase для разработки.
- Главный экран «Сегодня»: дата, день недели, фаза луны, задачи, важное, повторы, напоминания, ритуалы, сделанное, быстрые кнопки.
- Календарь: день, неделя, месяц.
- CRUD для задач, заметок, покупок, рецептов, огородных культур, целей, ритуалов и пользовательских разделов.
- Огородные карточки с историей по `seasonYear`.
- Рецепты и заготовки с отдельными полями для банок, хранения и семейной оценки.
- Офлайн-режим: service worker, IndexedDB, Firestore persistence, очередь изменений.
- Синхронизация «последнее изменение побеждает» через поле `updatedAt`.
- Архитектурная заглушка для будущего голосового ввода: `src/lib/voiceInputAdapter.js`.

## Запуск

```bash
npm install
npm run dev
```

## Firebase

1. Создайте Firebase project.
2. Включите Authentication: Email/Password и Google.
3. Создайте Firestore Database.
4. Скопируйте `.env.example` в `.env` и заполните значения.
5. В Netlify добавьте эти же переменные окружения в Site configuration -> Environment variables.

## Firestore rules для MVP

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{docId} {
      allow read, write: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }
  }
}
```

## Netlify

Проект уже содержит `netlify.toml`.

```bash
npm run build
```

Build command: `npm run build`

Publish directory: `dist`
