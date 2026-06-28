import { useState, useEffect } from 'react';

export function useLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/.netlify/functions/logs?cachebust=' + Date.now(), {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const server = res.ok ? await res.json() : [];
        const local = JSON.parse(localStorage.getItem('sr_logs_v3') || '[]');
        const map = new Map();
        for (const s of server) map.set(String(s.id), s);
        for (const l of local) map.set(String(l.id), { ...map.get(String(l.id)), ...l });
        if (mounted) setLogs(Array.from(map.values()).sort((a,b) => (a.date > b.date ? -1 : 1)));
      } catch (e) {
        console.error('load logs failed', e);
        const local = JSON.parse(localStorage.getItem('sr_logs_v3') || '[]');
        if (mounted) setLogs(local);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return logs;
}
