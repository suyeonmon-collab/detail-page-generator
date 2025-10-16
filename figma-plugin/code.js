// 관리자용 피그마 플러그인 - 템플릿 웹 편집 설정
// TypeScript로 작성된 관리자용 템플릿 설정 도구

// 피그마 플러그인 환경 설정
if (typeof figma === 'undefined') {
  // 개발 환경에서 테스트용 mock 객체
  global.figma = {
    currentPage: { findAll: () => [] },
    showUI: () => {},
    ui: { postMessage: () => {}, onmessage: null },
    notify: () => {},
    closePlugin: () => {},
    loadFontAsync: () => Promise.resolve(),
    base64Decode: (str) => new Uint8Array(),
    createImage: () => ({ hash: 'mock' }),
    fileKey: 'mock-file-key',
    root: { children: [] }
  };
}

// Supabase 설정
const SUPABASE_URL = 'https://geuboakvnddaaheahild.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds';

// 플러그인 실행
figma.on("run", ({ command }) => {
  console.log('🚀 [Admin Plugin] 관리자용 템플릿 설정 플러그인 실행');
  
  // UI 표시
  figma.showUI(__html__, { width: 500, height: 800 });
  
  // 파일 정보 전송
  sendFileInfo();
  
  console.log('✅ [Admin Plugin] 플러그인 초기화 완료');
});

// UI 메시지 처리
figma.ui.onmessage = async (msg) => {
  try {
    if (!msg || !msg.type) {
      console.error('Invalid message received:', msg);
      return;
    }

    console.log('📨 [Admin Plugin] 메시지 수신:', msg.type);

    switch (msg.type) {
      case "get-file-info":
        sendFileInfo();
        break;
      case "analyze-layers":
        await analyzeLayers();
        break;
      case "load-template-list":
        await loadTemplateList();
        break;
      case "load-template":
        // 더 이상 사용되지 않음 - 템플릿 목록에서 직접 템플릿 객체를 전달
        console.log('load-template message received but not needed anymore');
        break;
      case "save-template":
        await saveTemplate(msg.payload);
        break;
      case "update-template":
        await updateTemplate(msg.payload);
        break;
      case "delete-template":
        await deleteTemplate(msg.payload.templateId);
        break;
      case "close":
        figma.closePlugin();
        break;
      default:
        console.warn('Unknown message type:', msg.type);
    }
  } catch (error) {
    console.error('❌ [Admin Plugin] 메시지 처리 오류:', error);
    figma.notify(`오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    figma.ui.postMessage({ 
      type: "error", 
      payload: { message: String(error.message || error) } 
    });
  }
};

// 파일 정보 전송
function sendFileInfo() {
  try {
    const fileKey = figma.fileKey;
    const fileName = figma.root.name || 'Untitled';
    
    figma.ui.postMessage({
      type: 'file-info',
      payload: {
        fileKey: fileKey,
        fileName: fileName
      }
    });
    
    console.log('📁 [Admin Plugin] 파일 정보 전송:', { fileKey, fileName });
  } catch (error) {
    console.error('❌ [Admin Plugin] 파일 정보 전송 오류:', error);
  }
}

// 레이어 분석 - 자동으로 모든 편집 가능한 레이어를 활성화
async function analyzeLayers() {
  try {
    console.log('🔍 [Admin Plugin] 레이어 분석 시작 - 자동 편집 가능 설정');
    figma.notify('레이어를 분석하고 있습니다...');
    
    const page = figma.currentPage;
    const layers = [];
    
    // 모든 노드 수집
    const allNodes = page.findAll();
    console.log('📊 [Admin Plugin] 총 노드 수:', allNodes.length);
    
    let processedCount = 0;
    const maxNodes = Math.min(allNodes.length, 50); // 최대 50개 노드만 처리 (더 안전하게)
    
    for (let i = 0; i < maxNodes; i++) {
      const node = allNodes[i];
      try {
        // 편집 가능한 노드 타입만 분석
        if (isEditableNodeType(node)) {
          const layerInfo = {
            id: node.id,
            name: node.name || 'unnamed',
            type: node.type,
            editable: true, // 모든 레이어를 자동으로 편집 가능하게 설정
            label: node.name || 'unnamed',
            editType: getDefaultEditType(node),
            currentValue: getCurrentValue(node),
            position: {
              x: node.x || 0,
              y: node.y || 0,
              width: node.width || 0,
              height: node.height || 0
            },
            styles: {} // 스타일 추출은 생략하여 안정성 확보
          };
          
          layers.push(layerInfo);
          console.log(`✅ [Admin Plugin] 레이어 분석 완료: ${layerInfo.name} (${layerInfo.type})`);
        }
        processedCount++;
        
        // 진행 상황 업데이트 (매 5개마다)
        if (processedCount % 5 === 0) {
          console.log(`📈 [Admin Plugin] 분석 진행: ${processedCount}/${maxNodes}`);
          figma.notify(`레이어 분석 중... ${processedCount}/${maxNodes}`);
        }
        
        // 타임아웃 방지를 위한 짧은 대기
        if (processedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } catch (nodeError) {
        console.warn(`⚠️ [Admin Plugin] 노드 분석 실패 (${node.id}):`, nodeError);
        processedCount++;
      }
    }
    
    console.log('✅ [Admin Plugin] 레이어 분석 완료:', layers.length, '개 (모두 편집 가능)');
    
    figma.ui.postMessage({
      type: 'layer-analysis',
      payload: {
        layers: layers,
        autoEditable: true // 자동 편집 가능 모드 표시
      }
    });
    
    figma.notify(`${layers.length}개의 레이어를 자동으로 편집 가능하게 설정했습니다`);
    
  } catch (error) {
    console.error('❌ [Admin Plugin] 레이어 분석 오류:', error);
    figma.notify('레이어 분석 중 오류가 발생했습니다');
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error.message }
    });
  }
}

// 개별 노드 분석
async function analyzeNode(node) {
  try {
    // 편집 가능한 노드 타입만 분석
    if (!isEditableNodeType(node)) {
      return null;
    }
    
    const layerInfo = {
      id: node.id,
      name: node.name || 'unnamed',
      type: node.type,
      editable: false,
      label: node.name || 'unnamed',
      editType: getDefaultEditType(node),
      currentValue: getCurrentValue(node),
      position: {
        x: node.x || 0,
        y: node.y || 0,
        width: node.width || 0,
        height: node.height || 0
      },
      styles: await extractStyles(node)
    };
    
    return layerInfo;
    
  } catch (error) {
    console.warn(`노드 분석 오류 (${node.id}):`, error);
    return null;
  }
}

// 편집 가능한 노드 타입 확인
function isEditableNodeType(node) {
  const editableTypes = ['TEXT', 'RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'VECTOR'];
  return editableTypes.includes(node.type);
}

// 기본 편집 타입 결정
function getDefaultEditType(node) {
  switch (node.type) {
    case 'TEXT':
      return 'text';
    case 'RECTANGLE':
    case 'ELLIPSE':
    case 'POLYGON':
    case 'STAR':
      // 이미지가 있으면 이미지, 없으면 도형 변경
      const hasImage = node.fills && node.fills.some(fill => fill.type === 'IMAGE');
      return hasImage ? 'image' : 'shape';
    default:
      return 'shape';
  }
}

// 현재 값 추출
function getCurrentValue(node) {
  switch (node.type) {
    case 'TEXT':
      return node.characters || '';
    case 'RECTANGLE':
    case 'ELLIPSE':
    case 'POLYGON':
    case 'STAR':
      const hasImage = node.fills && node.fills.some(fill => fill.type === 'IMAGE');
      if (hasImage) {
        return '이미지';
      } else {
        const solidFill = node.fills && node.fills.find(fill => fill.type === 'SOLID');
        return solidFill ? `색상: ${rgbToHex(solidFill.color)}` : '도형';
      }
    default:
      return '도형';
  }
}

// 스타일 정보 추출
async function extractStyles(node) {
  const styles = {};
  
  try {
    if (node.type === 'TEXT') {
      // 텍스트 스타일 - 안전한 접근
      styles.fontSize = node.fontSize || 16;
      styles.fontFamily = (node.fontName && node.fontName.family) ? 
        `${node.fontName.family} ${node.fontName.style || ''}` : 'Unknown';
      styles.textAlignHorizontal = node.textAlignHorizontal || 'LEFT';
      styles.textAlignVertical = node.textAlignVertical || 'TOP';
      styles.letterSpacing = node.letterSpacing || { value: 0, unit: 'PIXELS' };
      styles.lineHeight = node.lineHeight || { value: 1, unit: 'AUTO' };
      
      // 색상 정보 - 안전한 접근
      if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill && fill.type === 'SOLID' && fill.color) {
          styles.color = rgbToHex(fill.color);
        }
      }
    } else if (['RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR'].includes(node.type)) {
      // 도형 스타일 - 안전한 접근
      styles.fills = Array.isArray(node.fills) ? node.fills : [];
      styles.strokes = Array.isArray(node.strokes) ? node.strokes : [];
      styles.strokeWeight = node.strokeWeight || 0;
      styles.cornerRadius = node.cornerRadius || 0;
      
      // 효과 정보 - 안전한 접근
      styles.effects = Array.isArray(node.effects) ? node.effects : [];
    }
    
    return styles;
  } catch (error) {
    console.warn('스타일 추출 오류:', error);
    return {};
  }
}

// RGB를 HEX로 변환
function rgbToHex(rgb) {
  const r = Math.round(rgb.r * 255);
  const g = Math.round(rgb.g * 255);
  const b = Math.round(rgb.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// 템플릿 목록 로드
async function loadTemplateList() {
  try {
    console.log('📋 [Admin Plugin] 템플릿 목록 로드 시작');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/templates?select=*&order=updated_at.desc`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase API 오류: ${response.status}`);
    }

    const templates = await response.json();
    console.log('✅ [Admin Plugin] 템플릿 목록 로드 완료:', templates.length, '개');
    
    figma.ui.postMessage({
      type: 'template-list',
      payload: {
        templates: templates
      }
    });
    
  } catch (error) {
    console.error('❌ [Admin Plugin] 템플릿 목록 로드 오류:', error);
    figma.notify('템플릿 목록을 불러올 수 없습니다');
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error.message }
    });
  }
}


// 새 템플릿 저장
async function saveTemplate(templateData) {
  try {
    console.log('💾 [Admin Plugin] 새 템플릿 저장 시작:', templateData.name);
    figma.notify('템플릿을 저장하고 있습니다...');
    
    // 템플릿 썸네일 생성
    const thumbnail = await generateThumbnail();
    
    // 노드 구조 생성
    const nodes = {};
    templateData.layers.forEach(layer => {
      if (layer.editable) {
        nodes[layer.id] = {
          editable: layer.editable,
          label: layer.label,
          editType: layer.editType,
          type: layer.type,
          position: layer.position,
          styles: layer.styles
        };
      }
    });
    
    // 템플릿 데이터 구성
    const templateRecord = {
      template_id: generateTemplateId(templateData.name),
      category_id: 'default', // 기본 카테고리
      name: templateData.name,
      description: templateData.description || '',
      preview_image: thumbnail,
      figma_url: `https://figma.com/file/${figma.fileKey}`,
      figma_file_key: figma.fileKey,
      price: 0,
      enabled: true,
      nodes: nodes
    };
    
    // Supabase에 저장
    const response = await fetch(`${SUPABASE_URL}/rest/v1/templates`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(templateRecord)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase API 오류: ${response.status} - ${errorText}`);
    }
    
    console.log('✅ [Admin Plugin] 템플릿 저장 완료');
    
    // 완료 메시지 전송
    figma.ui.postMessage({
      type: 'template-saved',
      payload: {
        templateId: templateRecord.template_id,
        previewUrl: generatePreviewUrl(templateRecord.template_id)
      }
    });
    
    figma.notify('템플릿이 성공적으로 저장되었습니다!');
    
  } catch (error) {
    console.error('❌ [Admin Plugin] 템플릿 저장 오류:', error);
    figma.notify('템플릿 저장에 실패했습니다');
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error.message }
    });
  }
}

// 템플릿 업데이트
async function updateTemplate(templateData) {
  try {
    console.log('🔄 [Admin Plugin] 템플릿 업데이트 시작:', templateData.templateId);
    figma.notify('템플릿을 업데이트하고 있습니다...');
    
    // 템플릿 썸네일 생성
    const thumbnail = await generateThumbnail();
    
    // 노드 구조 생성
    const nodes = {};
    templateData.layers.forEach(layer => {
      if (layer.editable) {
        nodes[layer.id] = {
          editable: layer.editable,
          label: layer.label,
          editType: layer.editType,
          type: layer.type,
          position: layer.position,
          styles: layer.styles
        };
      }
    });
    
    // 업데이트 데이터 구성
    const updateData = {
      preview_image: thumbnail,
      figma_file_key: figma.fileKey,
      nodes: nodes,
      updated_at: new Date().toISOString()
    };
    
    // Supabase에서 업데이트
    const response = await fetch(`${SUPABASE_URL}/rest/v1/templates?template_id=eq.${templateData.templateId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase API 오류: ${response.status} - ${errorText}`);
    }
    
    console.log('✅ [Admin Plugin] 템플릿 업데이트 완료');
    
    // 완료 메시지 전송
    figma.ui.postMessage({
      type: 'template-updated',
      payload: {
        templateId: templateData.templateId,
        previewUrl: generatePreviewUrl(templateData.templateId)
      }
    });
    
    figma.notify('템플릿이 성공적으로 업데이트되었습니다!');
    
  } catch (error) {
    console.error('❌ [Admin Plugin] 템플릿 업데이트 오류:', error);
    figma.notify('템플릿 업데이트에 실패했습니다');
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error.message }
    });
  }
}

// 템플릿 삭제
async function deleteTemplate(templateId) {
  try {
    console.log('🗑️ [Admin Plugin] 템플릿 삭제 시작:', templateId);
    figma.notify('템플릿을 삭제하고 있습니다...');
    
    // Supabase에서 삭제
    const response = await fetch(`${SUPABASE_URL}/rest/v1/templates?template_id=eq.${templateId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase API 오류: ${response.status} - ${errorText}`);
    }
    
    console.log('✅ [Admin Plugin] 템플릿 삭제 완료');
    
    // 완료 메시지 전송
    figma.ui.postMessage({
      type: 'template-deleted',
      payload: {
        templateId: templateId
      }
    });
    
    figma.notify('템플릿이 성공적으로 삭제되었습니다!');
    
  } catch (error) {
    console.error('❌ [Admin Plugin] 템플릿 삭제 오류:', error);
    figma.notify('템플릿 삭제에 실패했습니다');
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error.message }
    });
  }
}

async function generateThumbnail() {
  try {
    console.log('🖼️ [Admin Plugin] 썸네일 생성 시작');
    
    const page = figma.currentPage;
    const frames = page.findAll(node => node.type === 'FRAME');
    
    console.log('📊 [Admin Plugin] 찾은 프레임 수:', frames.length);
    
    let target = null;
    
    // 프레임 찾기
    if (frames.length > 0) {
      target = frames.find(frame => 
        frame.name.toLowerCase().includes('main') || 
        frame.name.toLowerCase().includes('template') ||
        frame.name.toLowerCase().includes('artboard')
      ) || frames[0];
      
      console.log('🎯 [Admin Plugin] 선택된 프레임:', target ? target.name : '없음');
    }
    
    if (!target) {
      console.log('⚠️ [Admin Plugin] 프레임이 없어서 페이지 전체 사용');
      // 프레임이 없으면 페이지 전체를 대상으로
      target = page;
    }
    
    // PNG로 내보내기 - 더 안전한 설정
    console.log('📸 [Admin Plugin] 이미지 내보내기 시작');
    const bytes = await target.exportAsync({ 
      format: "PNG", 
      constraint: { type: "SCALE", value: 1 } // 해상도를 낮춰서 안정성 확보
    });
    
    console.log('✅ [Admin Plugin] 이미지 내보내기 완료, 크기:', bytes.length);
    
    const base64 = figma.base64Encode(bytes);
    const thumbnail = `data:image/png;base64,${base64}`;
    
    console.log('🎉 [Admin Plugin] 썸네일 생성 완료');
    return thumbnail;
    
  } catch (error) {
    console.warn('❌ [Admin Plugin] 썸네일 생성 오류:', error);
    // 썸네일 생성 실패 시 기본 이미지 반환
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFByZXZpZXc8L3RleHQ+PC9zdmc+';
  }
}

// 템플릿 ID 생성
function generateTemplateId(name) {
  const timestamp = Date.now();
  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${sanitizedName}-${timestamp}`;
}

// 미리보기 URL 생성
function generatePreviewUrl(templateId) {
  return `https://detail-page-generator.vercel.app/edit?template=${templateId}`;
}

console.log('🚀 [Admin Plugin] 관리자용 템플릿 설정 플러그인 로드 완료');