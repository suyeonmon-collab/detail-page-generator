// 템플릿 관리 API 엔드포인트
// GET, POST, PUT, DELETE 지원

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://geuboakvnddaaheahild.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method } = req;
    const { templateId } = req.query;

    console.log(`📋 [Templates API] ${method} 요청 - TemplateId: ${templateId || 'N/A'}`);

    switch (method) {
      case 'GET':
        if (templateId) {
          // 특정 템플릿 조회
          await getTemplate(req, res, templateId);
        } else {
          // 템플릿 목록 조회
          await getTemplateList(req, res);
        }
        break;

      case 'POST':
        // 새 템플릿 생성
        await createTemplate(req, res);
        break;

      case 'PUT':
        // 템플릿 업데이트
        if (!templateId) {
          return res.status(400).json({ error: 'Template ID is required for PUT request' });
        }
        await updateTemplate(req, res, templateId);
        break;

      case 'DELETE':
        // 템플릿 삭제
        if (!templateId) {
          return res.status(400).json({ error: 'Template ID is required for DELETE request' });
        }
        await deleteTemplate(req, res, templateId);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }

  } catch (error) {
    console.error('❌ [Templates API] 오류:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// 템플릿 목록 조회
async function getTemplateList(req, res) {
  try {
    console.log('📋 [getTemplateList] 템플릿 목록 조회 시작');

    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .eq('enabled', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ [getTemplateList] Supabase 오류:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }

    console.log(`✅ [getTemplateList] 템플릿 목록 조회 완료: ${templates.length}개`);

    return res.status(200).json({
      success: true,
      templates: templates || []
    });

  } catch (error) {
    console.error('❌ [getTemplateList] 오류:', error);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
}

// 특정 템플릿 조회
async function getTemplate(req, res, templateId) {
  try {
    console.log(`📋 [getTemplate] 템플릿 조회 시작: ${templateId}`);

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (error) {
      console.error('❌ [getTemplate] Supabase 오류:', error);
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log(`✅ [getTemplate] 템플릿 조회 완료: ${template.name}`);

    return res.status(200).json({
      success: true,
      template: template
    });

  } catch (error) {
    console.error('❌ [getTemplate] 오류:', error);
    return res.status(500).json({ error: 'Failed to fetch template' });
  }
}

// 새 템플릿 생성
async function createTemplate(req, res) {
  try {
    console.log('📋 [createTemplate] 새 템플릿 생성 시작');

    const templateData = req.body;

    // 필수 필드 검증
    if (!templateData.template_id || !templateData.name) {
      return res.status(400).json({ 
        error: 'Missing required fields: template_id, name' 
      });
    }

    // 템플릿 데이터 구성
    const templateRecord = {
      template_id: templateData.template_id,
      category_id: templateData.category_id || 'default',
      name: templateData.name,
      description: templateData.description || '',
      preview_image: templateData.preview_image || null,
      figma_url: templateData.figma_url || null,
      figma_file_key: templateData.figma_file_key || null,
      price: templateData.price || 0,
      enabled: templateData.enabled !== false,
      nodes: templateData.nodes || {}
    };

    const { data, error } = await supabase
      .from('templates')
      .insert([templateRecord])
      .select()
      .single();

    if (error) {
      console.error('❌ [createTemplate] Supabase 오류:', error);
      return res.status(500).json({ error: 'Failed to create template' });
    }

    console.log(`✅ [createTemplate] 템플릿 생성 완료: ${data.name}`);

    return res.status(201).json({
      success: true,
      template: data,
      message: 'Template created successfully'
    });

  } catch (error) {
    console.error('❌ [createTemplate] 오류:', error);
    return res.status(500).json({ error: 'Failed to create template' });
  }
}

// 템플릿 업데이트
async function updateTemplate(req, res, templateId) {
  try {
    console.log(`📋 [updateTemplate] 템플릿 업데이트 시작: ${templateId}`);

    const updateData = req.body;

    // 업데이트 데이터 구성
    const templateRecord = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('templates')
      .update(templateRecord)
      .eq('template_id', templateId)
      .select()
      .single();

    if (error) {
      console.error('❌ [updateTemplate] Supabase 오류:', error);
      return res.status(500).json({ error: 'Failed to update template' });
    }

    console.log(`✅ [updateTemplate] 템플릿 업데이트 완료: ${data.name}`);

    return res.status(200).json({
      success: true,
      template: data,
      message: 'Template updated successfully'
    });

  } catch (error) {
    console.error('❌ [updateTemplate] 오류:', error);
    return res.status(500).json({ error: 'Failed to update template' });
  }
}

// 템플릿 삭제
async function deleteTemplate(req, res, templateId) {
  try {
    console.log(`📋 [deleteTemplate] 템플릿 삭제 시작: ${templateId}`);

    const { data, error } = await supabase
      .from('templates')
      .delete()
      .eq('template_id', templateId)
      .select()
      .single();

    if (error) {
      console.error('❌ [deleteTemplate] Supabase 오류:', error);
      return res.status(500).json({ error: 'Failed to delete template' });
    }

    console.log(`✅ [deleteTemplate] 템플릿 삭제 완료: ${templateId}`);

    return res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('❌ [deleteTemplate] 오류:', error);
    return res.status(500).json({ error: 'Failed to delete template' });
  }
}