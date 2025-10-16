// 템플릿 업데이트 API
// PUT /api/update-template/[templateId]

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geuboakvnddaaheahild.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { templateId } = req.query;
    const updateData = req.body;

    if (!templateId) {
      return res.status(400).json({ error: '템플릿 ID가 필요합니다' });
    }

    console.log('🔄 [Update Template API] 템플릿 업데이트 요청:', templateId);

    // 업데이트할 데이터에 타임스탬프 추가
    const dataToUpdate = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    // Supabase에서 업데이트
    const { data: template, error } = await supabase
      .from('templates')
      .update(dataToUpdate)
      .eq('template_id', templateId)
      .select()
      .single();

    if (error) {
      console.error('❌ [Update Template API] Supabase 오류:', error);
      return res.status(500).json({ 
        error: '템플릿 업데이트에 실패했습니다',
        details: error.message 
      });
    }

    if (!template) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다' });
    }

    console.log('✅ [Update Template API] 템플릿 업데이트 완료:', template.template_id);

    return res.status(200).json({
      success: true,
      template: template,
      message: '템플릿이 성공적으로 업데이트되었습니다'
    });

  } catch (error) {
    console.error('❌ [Update Template API] 서버 오류:', error);
    return res.status(500).json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    });
  }
}
