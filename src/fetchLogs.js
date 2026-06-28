export async function fetchLogsFromServer() {
  const url = '/.netlify/functions/logs?cachebust=' + Date.now();
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
  if (!res.ok) throw new Error('Failed to fetch logs: ' + res.status);
  return res.json();
}

export function mergeLogs(serverLogs = [], localLogs = []) {
  const map = new Map();
  for (const s of serverLogs) map.set(String(s.id), s);
  for (const l of localLogs) map.set(String(l.id), { ...map.get(String(l.id)), ...l });
  return Array.from(map.values()).sort((a, b) => (a.date > b.date ? -1 : 1));
}
