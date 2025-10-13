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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    
    console.log('📥 디자인 요청:', {
      requestId: data.requestId,
      contentLength: data.finalContent?.length,
      hasNewImage: data.hasNewImage
    });
    
    // 수정된 내용 저장
    const { error: updateError } = await supabase
      .from('detail_requests')
      .update({
        edited_content: data.finalContent,
        image_data: data.newImageData || null,
        status: 'design_pending'
      })
      .eq('id', data.requestId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      throw updateError;
    }

    console.log('✅ 디자인 요청 저장 완료');

    return res.status(200).json({
      success: true,
      message: '디자인 생성 요청 완료'
    });

  } catch (error) {
    console.error('❌ Error in request-design:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

