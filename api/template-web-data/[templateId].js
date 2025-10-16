// 템플릿 웹 편집 데이터 API
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
      return res.status(400).json({ error: 'Template ID is required' });
    }

    console.log('🔍 [template-web-data] 템플릿 조회:', templateId);

    // Supabase에서 템플릿 데이터 조회
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (error) {
      console.error('❌ [template-web-data] Supabase 오류:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!template) {
      console.log('❌ [template-web-data] 템플릿을 찾을 수 없음:', templateId);
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log('✅ [template-web-data] 템플릿 조회 성공:', template.name);

    // 웹 편집에 필요한 데이터만 반환
    const webData = {
      templateId: template.template_id,
      name: template.name,
      description: template.description,
      figmaUrl: template.figma_url,
      figmaFileKey: template.figma_file_key,
      figmaNodeId: template.figma_node_id,
      nodes: template.nodes || {},
      previewImage: template.preview_image
    };

    return res.status(200).json(webData);

  } catch (error) {
    console.error('❌ [template-web-data] 서버 오류:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
