const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

exports.handler = async function (event) {
  try {
    // If using GET for listing logs
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        },
        body: JSON.stringify(data)
      };
    }

    // If POST for inserting a log
    if (event.httpMethod === 'POST') {
      const payload = JSON.parse(event.body || '{}');
      const { data, error } = await supabase.from('logs').insert([payload]).select();

      if (error) throw error;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        },
        body: JSON.stringify(data)
      };
    }

    return {
      statusCode: 405,
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: err.message || 'Server error' })
    };
  }
};
