// 템플릿 저장 API
// POST /api/save-template

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
      template_id,
      category_id,
      name,
      description,
      preview_image,
      figma_url,
      figma_file_key,
      price = 0,
      enabled = true,
      nodes
    } = req.body;

    // 필수 필드 검증
    if (!template_id || !category_id || !name) {
      return res.status(400).json({ 
        error: '필수 필드가 누락되었습니다 (template_id, category_id, name)' 
      });
    }

    console.log('💾 [Save Template API] 템플릿 저장 요청:', {
      template_id,
      name,
      category_id
    });

    // 템플릿 데이터 구성
    const templateData = {
      template_id,
      category_id,
      name,
      description: description || '',
      preview_image: preview_image || null,
      figma_url: figma_url || null,
      figma_file_key: figma_file_key || null,
      price: parseInt(price) || 0,
      enabled: Boolean(enabled),
      nodes: nodes || {}
    };

    // Supabase에 저장
    const { data: template, error } = await supabase
      .from('templates')
      .insert([templateData])
      .select()
      .single();

    if (error) {
      console.error('❌ [Save Template API] Supabase 오류:', error);
      return res.status(500).json({ 
        error: '템플릿 저장에 실패했습니다',
        details: error.message 
      });
    }

    console.log('✅ [Save Template API] 템플릿 저장 완료:', template.template_id);

    return res.status(201).json({
      success: true,
      template: template,
      message: '템플릿이 성공적으로 저장되었습니다'
    });

  } catch (error) {
    console.error('❌ [Save Template API] 서버 오류:', error);
    return res.status(500).json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    });
  }
}
