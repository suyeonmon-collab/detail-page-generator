// 템플릿을 웹 편집 가능한 형태로 변환하는 API
// GET /api/template-web-data/[templateId]

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

    console.log('🌐 [Template Web Data API] 웹 편집 데이터 요청:', templateId);

    // 템플릿 정보 조회
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('template_id', templateId)
      .eq('enabled', true)
      .single();

    if (error || !template) {
      console.error('❌ [Template Web Data API] 템플릿 조회 오류:', error);
      return res.status(404).json({ 
        error: '템플릿을 찾을 수 없습니다',
        details: error?.message 
      });
    }

    // 웹 편집용 데이터 변환
    const webData = convertToWebEditableData(template);

    console.log('✅ [Template Web Data API] 웹 편집 데이터 생성 완료');

    return res.status(200).json({
      success: true,
      template: {
        id: template.template_id,
        name: template.name,
        description: template.description,
        preview_image: template.preview_image,
        figma_url: template.figma_url
      },
      editable_elements: webData.editableElements,
      layout: webData.layout,
      styles: webData.styles
    });

  } catch (error) {
    console.error('❌ [Template Web Data API] 서버 오류:', error);
    return res.status(500).json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    });
  }
}

// 템플릿을 웹 편집 가능한 데이터로 변환
function convertToWebEditableData(template) {
  const editableElements = [];
  const layout = {
    width: 1200, // 기본 너비
    height: 800, // 기본 높이
    background: '#ffffff'
  };
  const styles = {};

  // 노드 데이터 처리
  if (template.nodes && typeof template.nodes === 'object') {
    Object.entries(template.nodes).forEach(([nodeId, nodeData]) => {
      if (nodeData.editable) {
        const element = {
          id: nodeId,
          type: nodeData.type,
          label: nodeData.label,
          editType: nodeData.editType,
          position: nodeData.position || { x: 0, y: 0, width: 100, height: 50 },
          styles: nodeData.styles || {},
          currentValue: getCurrentValueFromNode(nodeData)
        };

        editableElements.push(element);

        // 스타일 정보 수집
        if (nodeData.styles) {
          styles[nodeId] = nodeData.styles;
        }
      }
    });
  }

  return {
    editableElements,
    layout,
    styles
  };
}

// 노드에서 현재 값 추출
function getCurrentValueFromNode(nodeData) {
  switch (nodeData.editType) {
    case 'text':
      return nodeData.styles?.textContent || '';
    case 'image':
      return nodeData.styles?.imageUrl || '';
    case 'color':
      return nodeData.styles?.backgroundColor || '#ffffff';
    case 'size':
      return {
        width: nodeData.position?.width || 100,
        height: nodeData.position?.height || 50
      };
    default:
      return '';
  }
}
