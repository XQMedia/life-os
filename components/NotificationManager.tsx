'use client';

import { useEffect } from 'react';
import { getQuests, getIdeas, isRepeatingDaily } from '@/lib/db';

// Background component — mounts in dashboard, renders nothing.
// Reads prefs from localStorage and fires browser Notifications.
export default function NotificationManager() {
  // Daily task reminders
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem('notif_enabled') !== 'true') return;

    const freqMin = Number(localStorage.getItem('notif_frequency') ?? '60');

    async function sendTaskReminder() {
      const quests = await getQuests();
      const pending = quests.filter((q) => isRepeatingDaily(q) && !q.isComplete);
      if (pending.length === 0) return;
      const preview = pending
        .slice(0, 3)
        .map((q) => `· ${q.title}`)
        .join('\n');
      new Notification('Life.OS — Daily Missions Pending', {
        body: `${pending.length} quest${pending.length > 1 ? 's' : ''} still waiting:\n${preview}`,
        icon: '/favicon.ico',
        tag: 'lifeos-daily',
      });
    }

    const id = setInterval(sendTaskReminder, freqMin * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Brainstorm revisit — fires once every 2–3 days
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem('notif_enabled') !== 'true') return;

    const KEY = 'notif_brainstorm_last';
    const last = Number(localStorage.getItem(KEY) ?? '0');
    const intervalDays = 2 + Math.round(Math.random()); // 2 or 3
    const due = last + intervalDays * 86_400_000;
    const delay = Math.max(0, due - Date.now());

    const t = setTimeout(async () => {
      const ideas = await getIdeas();
      if (ideas.length === 0) return;
      new Notification('Life.OS — Revisit Your Brain 💡', {
        body: `You've got ${ideas.length} idea${ideas.length > 1 ? 's' : ''} sitting in your dump. Wanna revisit your last brainstorm?`,
        icon: '/favicon.ico',
        tag: 'lifeos-brainstorm',
      });
      localStorage.setItem(KEY, String(Date.now()));
    }, delay);

    return () => clearTimeout(t);
  }, []);

  return null;
}
