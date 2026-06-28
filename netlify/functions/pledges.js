// netlify/functions/pledges.js
// Netlify Function to proxy pledge requests to Supabase REST API.
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
      // fetch all pledges
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/pledges?select=*&order=created_at.desc`, { headers })
      const data = await resp.json()
      return { statusCode: resp.ok ? 200 : 500, body: JSON.stringify(data) }
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : null
      if (!body) return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }) }

      // ensure required fields for server: name and email
      if (!body.name || !body.email) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing name or email' }) }
      }

      // prepare upsert payload as array (Supabase REST expects an array for inserts)
      const payload = [{
        id: body.id || Date.now(),
        name: body.name,
        email: body.email,
        type: body.type || 'permin',
        rate: body.rate != null ? body.rate : null,
        amount: body.amount != null ? body.amount : null,
        created_at: body.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]

      // upsert using merge-duplicates (on primary key)
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/pledges`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(payload)
      })
      const data = await resp.json()
      return { statusCode: resp.ok ? 200 : 500, body: JSON.stringify(data) }
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    console.error('pledges function error', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) }
  }
}
