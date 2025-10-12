const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const data = JSON.parse(event.body);
    
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '디자인 생성 요청 완료'
      })
    };

  } catch (error) {
    console.error('❌ Error in request-design:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
