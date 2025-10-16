// 템플릿 삭제 API
// DELETE /api/templates/[templateId]

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geuboakvnddaaheahild.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { templateId } = req.query;

    if (!templateId) {
      return res.status(400).json({ error: '템플릿 ID가 필요합니다' });
    }

    console.log('🗑️ [Delete Template API] 템플릿 삭제 요청:', templateId);

    // 먼저 템플릿이 존재하는지 확인
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('templates')
      .select('template_id, name')
      .eq('template_id', templateId)
      .single();

    if (fetchError || !existingTemplate) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다' });
    }

    // 템플릿 삭제
    const { error: deleteError } = await supabase
      .from('templates')
      .delete()
      .eq('template_id', templateId);

    if (deleteError) {
      console.error('❌ [Delete Template API] Supabase 오류:', deleteError);
      return res.status(500).json({ 
        error: '템플릿 삭제에 실패했습니다',
        details: deleteError.message 
      });
    }

    console.log('✅ [Delete Template API] 템플릿 삭제 완료:', templateId);

    return res.status(200).json({
      success: true,
      message: `템플릿 "${existingTemplate.name}"이 성공적으로 삭제되었습니다`
    });

  } catch (error) {
    console.error('❌ [Delete Template API] 서버 오류:', error);
    return res.status(500).json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    });
  }
}
