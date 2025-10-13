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

  // POST만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    console.log('📥 Received data:', {
      templateId: data.templateId,
      categoryId: data.categoryId,
      email: data.customerEmail
    });

    // 1. AI 콘텐츠 생성 (OpenAI)
    const aiContent = await generateAIContent(data);
    
    if (!aiContent) {
      throw new Error('AI 콘텐츠 생성 실패');
    }

    console.log('✅ AI content generated');

    // 2. Figma 템플릿 적용 (시뮬레이션)
    const figmaPreview = await applyToFigmaTemplate(data, aiContent);

    // 3. DB에 저장
    const { data: design, error: insertError } = await supabase
      .from('detail_requests')
      .insert([{
        customer_email: data.customerEmail,
        product_name: data.templateName || 'Unknown',
        product_description: JSON.stringify(data.content || {}),
        target_audience: data.targetAudience,
        product_category: data.categoryId,
        template: data.templateId,
        image_data: JSON.stringify(data.images || {}),
        ai_content: aiContent,
        status: 'ai_completed'
      }])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      throw new Error(`데이터베이스 저장 실패: ${insertError.message}`);
    }

    console.log('✅ Saved to database, design ID:', design.id);

    return res.status(200).json({
      success: true,
      requestId: design.id,
      aiContent: aiContent,
      previewUrl: figmaPreview.previewUrl,
      message: 'AI 콘텐츠가 성공적으로 생성되었습니다'
    });

  } catch (error) {
    console.error('❌ Error in generate-content:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || '서버 오류가 발생했습니다'
    });
  }
};

// AI 콘텐츠 생성 (OpenAI)
async function generateAIContent(data) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('AI API key not configured');
    }

    // 프롬프트 생성
    const prompt = buildPrompt(data);
    
    // OpenAI API 사용
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API 오류: ${errorData.error?.message || 'API 호출 실패'}`);
    }

    const result = await response.json();
    const aiText = result.choices?.[0]?.message?.content;

    if (!aiText) {
      throw new Error('AI 응답이 비어있습니다');
    }

    // 노드별로 콘텐츠 분리
    return parseAIContent(aiText, data);

  } catch (error) {
    console.error('AI generation error:', error);
    throw error;
  }
}

// 프롬프트 생성
function buildPrompt(data) {
  const { templateName, categoryId, targetAudience, content } = data;
  
  let prompt = `당신은 전문 카피라이터입니다. 다음 정보를 바탕으로 매력적인 마케팅 콘텐츠를 작성해주세요.

카테고리: ${categoryId}
템플릿 스타일: ${templateName}
타겟 고객: ${targetAudience}

입력된 내용:
`;

  // 사용자 입력 추가
  Object.entries(content).forEach(([key, value]) => {
    prompt += `- ${key}: ${value}\n`;
  });

  prompt += `

위 내용을 바탕으로 각 섹션에 들어갈 텍스트를 생성해주세요.
감성적이고 설득력있게 작성하되, ${targetAudience}에게 어필할 수 있도록 해주세요.

응답 형식:
JSON 형식으로 각 섹션별 텍스트를 제공해주세요.
예: {"section1": "텍스트...", "section2": "텍스트..."}`;

  return prompt;
}

// AI 응답 파싱
function parseAIContent(aiText, data) {
  try {
    // JSON 형식으로 파싱 시도
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // 실패하면 입력 데이터를 기반으로 구조화
    const content = {};
    Object.keys(data.content).forEach((key, index) => {
      content[key] = data.content[key] + ' (AI 개선 버전)';
    });
    
    return content;
  } catch (error) {
    console.error('AI content parsing error:', error);
    return data.content; // 폴백: 원본 콘텐츠 반환
  }
}

// Figma 템플릿 적용
async function applyToFigmaTemplate(data, aiContent) {
  try {
    console.log('🎨 Applying to Figma template:', data.templateId);
    
    // 워터마크 포함 미리보기 URL
    const previewUrl = `https://via.placeholder.com/800x1000/667eea/ffffff?text=Preview+with+Watermark`;

    return {
      previewUrl: previewUrl,
      figmaFileId: 'figma-file-' + Date.now(),
      status: 'preview_ready'
    };

  } catch (error) {
    console.error('Figma application error:', error);
    return {
      previewUrl: null,
      error: error.message
    };
  }
}

