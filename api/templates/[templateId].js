// 특정 템플릿 조회 API
// GET /api/templates/[templateId]

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geuboakvnddaaheahild.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { templateId } = req.query;

    if (!templateId) {
      return res.status(400).json({ error: '템플릿 ID가 필요합니다' });
    }

    console.log('📄 [Template API] 템플릿 조회 요청:', templateId);

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('template_id', templateId)
      .eq('enabled', true)
      .single();

    if (error) {
      console.error('❌ [Template API] Supabase 오류:', error);
      return res.status(404).json({ 
        error: '템플릿을 찾을 수 없습니다',
        details: error.message 
      });
    }

    if (!template) {
      return res.status(404).json({ error: '템플릿을 찾을 수 없습니다' });
    }

    console.log('✅ [Template API] 템플릿 조회 완료:', template.name);

    return res.status(200).json({
      success: true,
      template: template
    });

  } catch (error) {
    console.error('❌ [Template API] 서버 오류:', error);
    return res.status(500).json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    });
  }
}
