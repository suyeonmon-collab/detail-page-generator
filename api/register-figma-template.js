// 피그마 URL 등록 및 템플릿 생성 API
// POST /api/register-figma-template

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geuboakvnddaaheahild.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      figma_url,
      template_name,
      category_id = 'default',
      description = '',
      price = 0
    } = req.body;

    // 필수 필드 검증
    if (!figma_url || !template_name) {
      return res.status(400).json({ 
        error: '필수 필드가 누락되었습니다 (figma_url, template_name)' 
      });
    }

    // 피그마 URL에서 파일 키 추출
    const fileKeyMatch = figma_url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    if (!fileKeyMatch) {
      return res.status(400).json({ 
        error: '유효하지 않은 피그마 URL입니다' 
      });
    }

    const figma_file_key = fileKeyMatch[1];
    const template_id = generateTemplateId(template_name);

    console.log('📝 [Register Figma Template API] 피그마 템플릿 등록 요청:', {
      template_name,
      figma_file_key,
      category_id
    });

    // 템플릿 데이터 구성
    const templateData = {
      template_id,
      category_id,
      name: template_name,
      description,
      preview_image: null, // 플러그인에서 생성될 예정
      figma_url,
      figma_file_key,
      price: parseInt(price) || 0,
      enabled: true,
      nodes: {} // 플러그인에서 설정될 예정
    };

    // Supabase에 저장
    const { data: template, error } = await supabase
      .from('templates')
      .insert([templateData])
      .select()
      .single();

    if (error) {
      console.error('❌ [Register Figma Template API] Supabase 오류:', error);
      return res.status(500).json({ 
        error: '템플릿 등록에 실패했습니다',
        details: error.message 
      });
    }

    console.log('✅ [Register Figma Template API] 템플릿 등록 완료:', template.template_id);

    // 플러그인 실행을 위한 URL 생성
    const pluginUrl = generatePluginUrl(figma_file_key, template_id);

    return res.status(201).json({
      success: true,
      template: template,
      plugin_url: pluginUrl,
      message: '템플릿이 등록되었습니다. 플러그인을 실행하여 설정을 완료하세요.'
    });

  } catch (error) {
    console.error('❌ [Register Figma Template API] 서버 오류:', error);
    return res.status(500).json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    });
  }
}

// 템플릿 ID 생성
function generateTemplateId(name) {
  const timestamp = Date.now();
  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${sanitizedName}-${timestamp}`;
}

// 플러그인 실행 URL 생성
function generatePluginUrl(fileKey, templateId) {
  return `https://figma.com/file/${fileKey}?plugin=template-web-editor-admin&template=${templateId}`;
}
