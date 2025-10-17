// Figma 플러그인 자동 실행 트리거 API
// 웹에서 템플릿 저장 시 백그라운드에서 플러그인 실행을 트리거

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { templateId, figmaInfo, action } = req.body;

    console.log('🚀 [trigger-figma-plugin] 플러그인 실행 트리거:', { templateId, figmaInfo, action });

    if (!templateId || !figmaInfo) {
      return res.status(400).json({ 
        success: false, 
        error: 'templateId와 figmaInfo가 필요합니다' 
      });
    }

    // 템플릿 정보를 데이터베이스에서 가져오기
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (templateError) {
      console.error('❌ [trigger-figma-plugin] 템플릿 조회 오류:', templateError);
      return res.status(404).json({ 
        success: false, 
        error: '템플릿을 찾을 수 없습니다' 
      });
    }

    // 플러그인 실행을 위한 큐에 작업 추가
    const pluginTask = {
      templateId,
      templateName: template.name,
      figmaUrl: template.figma_url,
      figmaFileKey: figmaInfo.fileKey,
      figmaNodeId: figmaInfo.nodeId,
      action: action || 'update-template',
      status: 'pending',
      createdAt: new Date().toISOString(),
      priority: 'normal'
    };

    // 플러그인 작업 큐 테이블에 저장 (실제 구현에서는 별도 테이블 사용)
    // 현재는 템플릿 테이블에 플러그인 상태 업데이트
    const { error: updateError } = await supabase
      .from('templates')
      .update({
        plugin_status: 'pending',
        plugin_task: pluginTask,
        updated_at: new Date().toISOString()
      })
      .eq('template_id', templateId);

    if (updateError) {
      console.error('❌ [trigger-figma-plugin] 상태 업데이트 오류:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: '플러그인 상태 업데이트 실패' 
      });
    }

    console.log('✅ [trigger-figma-plugin] 플러그인 실행 트리거 성공');

    // 실제 플러그인 실행은 별도 프로세스에서 처리
    // 여기서는 트리거만 하고 즉시 응답
    res.status(200).json({
      success: true,
      message: 'Figma 플러그인 실행이 트리거되었습니다',
      taskId: `${templateId}_${Date.now()}`,
      pluginTask
    });

  } catch (error) {
    console.error('❌ [trigger-figma-plugin] 오류:', error);
    res.status(500).json({
      success: false,
      error: '플러그인 실행 트리거 중 오류가 발생했습니다',
      details: error.message
    });
  }
}
