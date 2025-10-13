const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId } = req.query;
    
    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required' });
    }
    
    const { data, error } = await supabase
      .from('detail_requests')
      .select('status, figma_link, png_link')
      .eq('id', requestId)
      .single();

    if (error) throw error;

    return res.status(200).json({
      status: data.status,
      figmaLink: data.figma_link,
      pngLink: data.png_link
    });

  } catch (error) {
    return res.status(500).json({ 
      error: error.message 
    });
  }
};

