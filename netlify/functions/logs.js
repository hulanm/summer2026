// netlify/functions/logs.js
// Netlify Function to proxy reading/writing logs to Supabase REST API.
// Expects environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

exports.handler = async function(event, context) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env' }) }
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  }

  try {
    if (event.httpMethod === 'GET') {
      // fetch all logs
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/logs?select=*&order=date.desc`, { headers })
      const data = await resp.json()
      return { statusCode: resp.ok ? 200 : 500, body: JSON.stringify(data) }
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : null
      if (!body) return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }) }

      // validate
      if (!body.date) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing date' }) }
      }

      const payload = [{
        id: body.id || Date.now(),
        date: body.date,
        read: Number(body.read || 0),
        write: Number(body.write || 0),
        pages: body.pages != null ? Number(body.pages) : null,
        book: body.book || null,
        notes: body.notes || null,
        created_at: body.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]

      const resp = await fetch(`${SUPABASE_URL}/rest/v1/logs`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(payload)
      })
      const data = await resp.json()
      return { statusCode: resp.ok ? 200 : 500, body: JSON.stringify(data) }
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    console.error('logs function error', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) }
  }
}
