// Enhanced Figma Plugin for Template-based Design Generation with File Cloning

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

figma.on("run", ({ command }) => {
  figma.showUI(__html__, { width: 480, height: 600 });
  
  // Initialize plugin with current page analysis
  analyzeCurrentPage();
});

// Analyze current page to detect nodes
function analyzeCurrentPage() {
  try {
    const page = figma.currentPage;
    const frames = page.findAll(function(n) { return n.type === "FRAME"; });
    
    // 최상위 텍스트 노드만 수집 (부모가 FRAME, GROUP, PAGE, COMPONENT인 TEXT 노드)
    const textNodes = page.findAll(function(n) {
      if (n.type !== "TEXT") return false;
      // 부모가 FRAME이거나 GROUP인 TEXT 노드만 선택 (최상위 텍스트 레이어)
      const parentType = n.parent && n.parent.type;
      return parentType === "FRAME" || parentType === "GROUP" || parentType === "PAGE" || parentType === "COMPONENT";
    });
    
    // 이미지 노드 수집 (더 깊이 검색하고 이름/크기로 필터링)
    const imageNodes = page.findAll(function(n) {
      // RECTANGLE 또는 ELLIPSE이면서
      if (n.type !== "RECTANGLE" && n.type !== "ELLIPSE") return false;
      
      // 너무 작은 요소는 제외 (10px 이하)
      if (n.width <= 10 || n.height <= 10) return false;
      
      // 이미지 fill이 있거나, 이름에 이미지 관련 키워드가 있는 것
      const hasImageFill = n.fills && n.fills.some(function(fill) { return fill.type === "IMAGE"; });
      const hasImageName = n.name && (
        n.name.toLowerCase().indexOf('image') !== -1 || 
        n.name.toLowerCase().indexOf('img') !== -1 ||
        n.name.indexOf('이미지') !== -1 ||
        n.name.indexOf('사진') !== -1 ||
        n.name.indexOf('photo') !== -1 ||
        n.name.indexOf('picture') !== -1 ||
        n.name.indexOf('배경') !== -1 ||
        n.name.indexOf('background') !== -1 ||
        n.name.indexOf('hero') !== -1 ||
        n.name.indexOf('product') !== -1
      );
      
      // 이미지가 아니더라도 충분히 큰 사각형/원형은 포함 (사용자가 선택할 수 있도록)
      const isLargeEnough = n.width >= 50 && n.height >= 50;
      
      return hasImageFill || hasImageName || isLargeEnough;
    });
    
    // 디버깅을 위한 로그
    console.log('Found text nodes:', textNodes.length, textNodes.map(function(n) { return n.name; }));
    console.log('Found image nodes:', imageNodes.length, imageNodes.map(function(n) { return n.name; }));
    
    // 텍스트 노드 상세 정보 수집
    const textNodeDetails = textNodes.map(function(node) {
      return {
        id: node.id,
        name: node.name || 'unnamed',
        type: node.type,
        currentValue: node.characters || '',
        preview: node.characters ? node.characters.substring(0, 30) + (node.characters.length > 30 ? '...' : '') : '',
        fontSize: node.fontSize || 16,
        fontFamily: node.fontName ? node.fontName.family + ' ' + node.fontName.style : 'Unknown'
      };
    });
    
    // 이미지 노드 상세 정보 수집
    const imageNodeDetails = imageNodes.map(function(node) {
      return {
        id: node.id,
        name: node.name || 'unnamed',
        type: node.type,
        width: node.width,
        height: node.height,
        hasImage: node.fills && node.fills.some(function(fill) { return fill.type === "IMAGE"; })
      };
    });
    
    const analysisResult = {
      frames: frames.length,
      textNodes: textNodes.length,
      imageNodes: imageNodes.length,
      textNodeDetails: textNodeDetails,
      imageNodeDetails: imageNodeDetails,
      totalNodes: textNodes.length + imageNodes.length
    };
    
    figma.ui.postMessage({ 
      type: "page-analysis", 
      payload: analysisResult 
    });
  } catch (error) {
    console.error('Page analysis error:', error);
    figma.notify('페이지 분석 중 오류가 발생했습니다.');
  }
}


// Listen to messages from UI
figma.ui.onmessage = async (msg) => {
  try {
    if (!msg || !msg.type) {
      console.error('Invalid message received:', msg);
      return;
    }

    switch (msg.type) {
      case "update-nodes":
        await handleNodeUpdates(msg.payload);
        break;
      case "export-png":
        await handlePNGExport();
        break;
      case "analyze-page":
        analyzeCurrentPage();
        break;
      case "process-web-designs":
        await processWebDesigns();
        break;
      case "clone-file":
        await handleFileClone(msg.payload);
        break;
      case "check-update-requests":
        await checkAndProcessUpdateRequests();
        break;
      case "close":
        figma.closePlugin();
        break;
      default:
        console.warn('Unknown message type:', msg.type);
    }
  } catch (error) {
    console.error('Message handling error:', error);
    figma.notify(`오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    figma.ui.postMessage({ 
      type: "error", 
      payload: { message: String(error.message || error) } 
    });
  }
};

// Handle node updates with exact ID matching
async function handleNodeUpdates(payload) {
  try {
    const { textNodes, imageNodes } = payload || {};

    if (!textNodes && !imageNodes) {
      figma.notify("업데이트할 노드가 없습니다.");
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    // 텍스트 노드 업데이트
    if (textNodes && typeof textNodes === 'object') {
      for (const [nodeId, newValue] of Object.entries(textNodes)) {
        try {
          const node = figma.getNodeById(nodeId);
          if (node && node.type === "TEXT") {
            await ensureEditableText(node);
            node.characters = newValue || '';
            updatedCount++;
          } else {
            console.warn(`Node not found or not a text node: ${nodeId}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`Error updating text node ${nodeId}:`, error);
          errorCount++;
        }
      }
    }

    // 이미지 노드 업데이트
    if (imageNodes && typeof imageNodes === 'object') {
      for (const [nodeId, imageData] of Object.entries(imageNodes)) {
        try {
          const node = figma.getNodeById(nodeId);
          if (node && (node.type === "RECTANGLE" || node.type === "ELLIPSE") && imageData) {
            const imageBytes = figma.base64Decode(imageData);
            const imageFill = figma.createImage(imageBytes);
            
            node.fills = [{
              type: "IMAGE",
              imageHash: imageFill.hash,
              scaleMode: "FILL"
            }];
            updatedCount++;
          } else if (node && !imageData) {
            // 이미지 데이터가 없으면 기본 색상으로 설정
            node.fills = [{
              type: "SOLID",
              color: { r: 0.9, g: 0.9, b: 0.9 }
            }];
            updatedCount++;
          } else {
            console.warn(`Node not found or not an image node: ${nodeId}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`Error updating image node ${nodeId}:`, error);
          errorCount++;
        }
      }
    }

    // 결과 알림
    if (updatedCount > 0) {
      figma.notify(`${updatedCount}개 노드가 업데이트되었습니다.${errorCount > 0 ? ` (${errorCount}개 오류)` : ''}`);
    } else {
      figma.notify("업데이트된 노드가 없습니다.");
    }

    figma.ui.postMessage({ 
      type: "update-complete", 
      payload: { 
        updatedCount, 
        errorCount 
      } 
    });

  } catch (error) {
    console.error('Node updates error:', error);
    figma.notify(`노드 업데이트 중 오류: ${error.message}`);
  }
}

// Handle image update
async function handleImageUpdate(payload) {
  try {
    const { imageData, template } = payload || {};
    
    if (!imageData) return;

    // Find image placeholder nodes
    const imageNodes = figma.currentPage.findAll(function(n) { 
      return n.type === "RECTANGLE" || n.type === "ELLIPSE";
    });

    const imageMapping = getImageMapping(template || 'modern');
    const targetNode = findNodeByName(imageNodes, imageMapping.mainImage);

    if (targetNode && targetNode.type === "RECTANGLE") {
      try {
        // Convert base64 to Uint8Array
        const imageBytes = figma.base64Decode(imageData);
        
        // Create image fill
        const imageFill = figma.createImage(imageBytes);
        
        // Apply image fill to the node
        targetNode.fills = [{
          type: "IMAGE",
          imageHash: imageFill.hash,
          scaleMode: "FILL"
        }];

        figma.notify("이미지가 업데이트되었습니다.");
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        figma.notify("이미지 처리 중 오류가 발생했습니다.");
      }
    }
  } catch (error) {
    console.error('Image update error:', error);
    figma.notify(`이미지 업데이트 실패: ${error.message}`);
  }
}


// Handle PNG export with improved quality
async function handlePNGExport() {
  try {
    const selection = figma.currentPage.selection;
    let target = selection[0];

    if (!target) {
      // Find the main frame
      const frames = figma.currentPage.findAll(function(n) { return n.type === "FRAME"; });
      target = frames.find(function(f) { return f.name.indexOf("main") !== -1 || f.name.indexOf("template") !== -1; }) || frames[0];
    }

    if (!target || target.type === "PAGE") {
      figma.notify("내보낼 프레임을 선택하거나 페이지에 프레임이 있어야 합니다.");
      return;
    }

    // Export with high quality
    const bytes = await target.exportAsync({ 
      format: "PNG", 
      constraint: { type: "SCALE", value: 3 } // Higher resolution
    });
    const base64 = figma.base64Encode(bytes);
    
    figma.ui.postMessage({ 
      type: "export-done", 
      payload: { 
        base64,
        filename: `${target.name || 'export'}.png`
      } 
    });
    
    figma.notify("고품질 PNG 내보내기 완료");
  } catch (error) {
    console.error('PNG export error:', error);
    figma.notify(`내보내기 실패: ${error.message}`);
  }
}


// Ensure text node is editable
async function ensureEditableText(node) {
  if (!node || node.type !== "TEXT") return;
  
  try {
    const fontNames = node.getRangeAllFontNames(0, node.characters.length);
    for (const font of fontNames) {
      try {
        await figma.loadFontAsync(font);
      } catch (e) {
        // ignore missing fonts
        console.warn('Font not available:', font);
      }
    }
  } catch (error) {
    console.warn('Font loading error:', error);
  }
}

// ============================================
// 파일 복제 기능
// ============================================

/**
 * 파일 복제 처리
 */
async function handleFileClone(payload) {
  try {
    const { userId, templateId, templateName } = payload || {};
    
    if (!userId || !templateId || !templateName) {
      figma.notify('파일 복제에 필요한 정보가 부족합니다.');
      return;
    }

    figma.notify('파일을 복제하고 있습니다...');

    // 현재 파일의 모든 페이지와 노드 복제
    const clonedData = await cloneCurrentFile(userId, templateId, templateName);
    
    if (clonedData.success) {
      figma.notify('파일이 성공적으로 복제되었습니다!');
      
      // 웹앱에 복제 완료 알림
      await notifyCloneComplete(clonedData);
      
      figma.ui.postMessage({ 
        type: "clone-complete", 
        payload: clonedData 
      });
    } else {
      figma.notify('파일 복제에 실패했습니다: ' + clonedData.error);
    }

  } catch (error) {
    console.error('File clone error:', error);
    figma.notify(`파일 복제 중 오류: ${error.message}`);
    
    figma.ui.postMessage({ 
      type: "clone-error", 
      payload: { error: error.message } 
    });
  }
}

/**
 * 현재 파일 복제
 */
async function cloneCurrentFile(userId, templateId, templateName) {
  try {
    // 현재 파일의 모든 페이지 수집
    const pages = figma.root.children.filter(node => node.type === 'PAGE');
    
    if (pages.length === 0) {
      return { success: false, error: '복제할 페이지가 없습니다.' };
    }

    // 페이지별 노드 정보 수집
    const clonedPages = [];
    
    for (const page of pages) {
      const pageData = {
        id: page.id,
        name: page.name,
        nodes: await collectPageNodes(page)
      };
      clonedPages.push(pageData);
    }

    // 복제된 파일 정보 생성
    const timestamp = Date.now();
    const clonedFileId = `${figma.fileKey}-${userId}-${timestamp}`;
    
    const clonedData = {
      success: true,
      clonedFileId: clonedFileId,
      originalFileKey: figma.fileKey,
      userId: userId,
      templateId: templateId,
      templateName: templateName,
      pages: clonedPages,
      nodeCount: clonedPages.reduce((total, page) => total + page.nodes.length, 0),
      createdAt: new Date().toISOString()
    };

    console.log('파일 복제 완료:', clonedData);
    return clonedData;

  } catch (error) {
    console.error('Clone current file error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 페이지의 모든 노드 수집
 */
async function collectPageNodes(page) {
  const nodes = [];
  
  function traverseNode(node, depth = 0) {
    try {
      const nodeData = {
        id: node.id,
        name: node.name || 'unnamed',
        type: node.type,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        depth: depth,
        visible: node.visible !== false,
        locked: node.locked || false
      };

      // 텍스트 노드의 경우 추가 정보 수집
      if (node.type === 'TEXT') {
        nodeData.characters = node.characters || '';
        nodeData.fontSize = node.fontSize || 16;
        nodeData.fontFamily = node.fontName ? 
          `${node.fontName.family} ${node.fontName.style}` : 'Unknown';
        nodeData.textAlignHorizontal = node.textAlignHorizontal || 'LEFT';
        nodeData.textAlignVertical = node.textAlignVertical || 'TOP';
      }

      // 이미지 노드의 경우 추가 정보 수집
      if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
        nodeData.fills = node.fills || [];
        nodeData.hasImage = node.fills && node.fills.some(fill => fill.type === 'IMAGE');
      }

      // 프레임/컴포넌트의 경우 추가 정보 수집
      if (node.type === 'FRAME' || node.type === 'COMPONENT') {
        nodeData.layoutMode = node.layoutMode || 'NONE';
        nodeData.primaryAxisAlignItems = node.primaryAxisAlignItems || 'MIN';
        nodeData.counterAxisAlignItems = node.counterAxisAlignItems || 'MIN';
        nodeData.paddingLeft = node.paddingLeft || 0;
        nodeData.paddingRight = node.paddingRight || 0;
        nodeData.paddingTop = node.paddingTop || 0;
        nodeData.paddingBottom = node.paddingBottom || 0;
      }

      nodes.push(nodeData);

      // 자식 노드 재귀적으로 수집
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          traverseNode(child, depth + 1);
        }
      }

    } catch (error) {
      console.warn(`Error collecting node ${node.id}:`, error);
    }
  }

  // 페이지의 모든 노드 순회
  for (const child of page.children) {
    traverseNode(child);
  }

  return nodes;
}

/**
 * 복제 완료 알림을 웹앱에 전송
 */
async function notifyCloneComplete(clonedData) {
  try {
    const webAppUrl = 'https://detail-page-generator.vercel.app/api/clone-figma-file';
    
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: clonedData.userId,
        templateId: clonedData.templateId,
        templateName: clonedData.templateName,
        clonedFileId: clonedData.clonedFileId,
        originalFileKey: clonedData.originalFileKey,
        nodeCount: clonedData.nodeCount,
        pages: clonedData.pages.length
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('복제 완료 알림 전송 성공:', result);
    } else {
      console.error('복제 완료 알림 전송 실패:', response.status);
    }

  } catch (error) {
    console.error('복제 완료 알림 전송 오류:', error);
  }
}

// ============================================
// 웹앱 서버 연동 기능
// ============================================

/**
 * 웹앱 서버에서 대기 중인 디자인 요청 가져오기
 */
async function fetchPendingDesigns() {
  try {
    const webAppUrl = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec';
    
    const response = await fetch(webAppUrl + '?action=getPendingDesigns');
    const pendingDesigns = await response.json();
    
    console.log('대기 중인 디자인 요청:', pendingDesigns.length, '개');
    
    return pendingDesigns;
    
  } catch (error) {
    console.error('대기 중인 디자인 가져오기 실패:', error);
    figma.notify('웹앱 서버 연결 실패');
    return [];
  }
}

/**
 * 웹앱 서버에 완료 상태 전송
 */
async function notifyDesignComplete(rowNumber, figmaLink, pngLink) {
  try {
    const webAppUrl = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec';
    
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'designComplete',
        rowNumber: rowNumber,
        figmaLink: figmaLink,
        pngLink: pngLink
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('완료 상태 전송 성공');
      figma.notify('디자인 완료 상태가 업데이트되었습니다');
    } else {
      console.error('완료 상태 전송 실패:', result.error);
    }
    
  } catch (error) {
    console.error('완료 상태 전송 오류:', error);
  }
}

/**
 * 자동 디자인 처리 (웹앱 연동)
 */
async function processWebDesigns() {
  try {
    figma.notify('웹앱에서 대기 중인 디자인을 확인하고 있습니다...');
    
    const pendingDesigns = await fetchPendingDesigns();
    
    if (pendingDesigns.length === 0) {
      figma.notify('처리할 디자인이 없습니다');
      return;
    }
    
    figma.notify(`${pendingDesigns.length}개의 디자인을 처리합니다`);
    
    for (const design of pendingDesigns) {
      try {
        await processSingleDesign(design);
        
        // 완료 상태 전송
        const figmaLink = `https://www.figma.com/file/${figma.fileKey}`;
        const pngLink = 'PNG 링크는 별도 생성 필요'; // 실제로는 PNG 생성 후 링크
        
        await notifyDesignComplete(design.row, figmaLink, pngLink);
        
        figma.notify(`${design.productName} 디자인 완료`);
        
      } catch (error) {
        console.error(`디자인 처리 실패 (${design.productName}):`, error);
        figma.notify(`${design.productName} 처리 실패: ${error.message}`);
      }
    }
    
    figma.notify('모든 디자인 처리 완료');
    
  } catch (error) {
    console.error('웹 디자인 처리 오류:', error);
    figma.notify('웹 디자인 처리 중 오류 발생');
  }
}

/**
 * 단일 디자인 처리
 */
async function processSingleDesign(design) {
  try {
    // 현재 페이지의 텍스트 노드들 찾기
    const textNodes = figma.currentPage.findAll(function(n) {
      if (n.type !== "TEXT") return false;
      const parentType = n.parent && n.parent.type;
      return parentType === "FRAME" || parentType === "GROUP" || parentType === "PAGE" || parentType === "COMPONENT";
    });
    
    if (textNodes.length === 0) {
      throw new Error('텍스트 노드를 찾을 수 없습니다');
    }
    
    // 첫 번째 텍스트 노드에 상품명 설정
    if (textNodes.length > 0) {
      await ensureEditableText(textNodes[0]);
      textNodes[0].characters = design.productName;
    }
    
    // 두 번째 텍스트 노드에 상품 설명 설정
    if (textNodes.length > 1) {
      await ensureEditableText(textNodes[1]);
      textNodes[1].characters = design.content;
    }
    
    // 이미지가 있는 경우 처리
    if (design.imageData) {
      await updateImageNode(design.imageData);
    }
    
    console.log(`${design.productName} 디자인 업데이트 완료`);
    
  } catch (error) {
    console.error('단일 디자인 처리 오류:', error);
    throw error;
  }
}

/**
 * 이미지 노드 업데이트
 */
async function updateImageNode(imageData) {
  try {
    // 이미지 노드 찾기
    const imageNodes = figma.currentPage.findAll(function(n) {
      if (n.type !== "RECTANGLE" && n.type !== "ELLIPSE") return false;
      if (n.width <= 10 || n.height <= 10) return false;
      const hasImageFill = n.fills && n.fills.some(function(fill) { return fill.type === "IMAGE"; });
      const hasImageName = n.name && (
        n.name.toLowerCase().indexOf('image') !== -1 || 
        n.name.toLowerCase().indexOf('img') !== -1 ||
        n.name.indexOf('이미지') !== -1 ||
        n.name.indexOf('사진') !== -1
      );
      const isLargeEnough = n.width >= 50 && n.height >= 50;
      return hasImageFill || hasImageName || isLargeEnough;
    });
    
    if (imageNodes.length === 0) {
      console.log('이미지 노드를 찾을 수 없습니다');
      return;
    }
    
    // 첫 번째 이미지 노드에 새 이미지 설정
    const imageNode = imageNodes[0];
    
    // base64 이미지 데이터를 Figma 이미지로 변환
    const imageBytes = figma.base64Decode(imageData);
    const image = figma.createImage(imageBytes);
    
    // 이미지 fill 설정
    imageNode.fills = [{
      type: "IMAGE",
      imageHash: image.hash,
      scaleMode: "FILL"
    }];
    
    console.log('이미지 업데이트 완료');
    
  } catch (error) {
    console.error('이미지 업데이트 오류:', error);
    throw error;
  }
}

// Supabase에서 업데이트 요청 확인 및 처리
async function checkAndProcessUpdateRequests() {
  try {
    console.log('🔄 [checkAndProcessUpdateRequests] 시작');
    
    // 현재 파일 키 가져오기
    const currentFileKey = figma.fileKey;
    console.log('🟢 [checkAndProcessUpdateRequests] 현재 파일 키:', currentFileKey);
    
    // Supabase에서 대기 중인 업데이트 요청 가져오기
    const updateRequests = await fetchUpdateRequests(currentFileKey);
    
    if (!updateRequests || updateRequests.length === 0) {
      console.log('🟡 [checkAndProcessUpdateRequests] 처리할 업데이트 요청이 없습니다');
      return;
    }
    
    console.log(`🟢 [checkAndProcessUpdateRequests] ${updateRequests.length}개의 업데이트 요청 발견`);
    
    // 각 업데이트 요청 처리
    for (const request of updateRequests) {
      await processUpdateRequest(request);
    }
    
    figma.notify(`✅ ${updateRequests.length}개의 업데이트 요청을 처리했습니다!`);
    
  } catch (error) {
    console.error('❌ [checkAndProcessUpdateRequests] 오류:', error);
    figma.notify(`업데이트 요청 처리 중 오류: ${error.message}`);
  }
}

// Supabase에서 업데이트 요청 가져오기
async function fetchUpdateRequests(fileKey) {
  try {
    console.log('🔄 [fetchUpdateRequests] 시작:', fileKey);
    
    // 실제 Supabase API 호출
    const response = await fetch('https://geuboakvnddaaheahild.supabase.co/rest/v1/figma_update_requests', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file_key: fileKey,
        status: 'pending'
      })
    });

    if (!response.ok) {
      throw new Error(`Supabase API 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [fetchUpdateRequests] 성공:', data);
    
    return data;
  } catch (error) {
    console.error('❌ [fetchUpdateRequests] 오류:', error);
    
    // 오류 발생 시 빈 배열 반환
    return [];
  }
}

// 개별 업데이트 요청 처리
async function processUpdateRequest(request) {
  try {
    console.log('🔄 [processUpdateRequest] 시작:', request);
    
    // 요청 상태를 'processing'으로 업데이트
    await updateRequestStatus(request.id, 'processing');
    
    if (request.update_type === 'text') {
      await updateTextNodeInFigma(request.node_id, request.content);
    } else if (request.update_type === 'image') {
      await updateImageNodeInFigma(request.node_id, request.content);
    }
    
    // 요청 상태를 'completed'로 업데이트
    await updateRequestStatus(request.id, 'completed');
    
    console.log('✅ [processUpdateRequest] 완료:', request.id);
    
  } catch (error) {
    console.error('❌ [processUpdateRequest] 오류:', error);
    
    // 요청 상태를 'failed'로 업데이트
    await updateRequestStatus(request.id, 'failed', error.message);
  }
}

// Figma에서 텍스트 노드 업데이트
async function updateTextNodeInFigma(nodeId, textContent) {
  try {
    console.log('🔄 [updateTextNodeInFigma] 시작:', { nodeId, textContent });
    
    // 현재 페이지에서 해당 노드 찾기
    const page = figma.currentPage;
    const nodes = page.findAll(n => n.name === nodeId && n.type === 'TEXT');
    
    if (nodes.length === 0) {
      throw new Error(`노드 '${nodeId}'를 찾을 수 없습니다`);
    }
    
    // 첫 번째 매칭 노드 업데이트
    const textNode = nodes[0];
    
    // 폰트 로드 (필요한 경우)
    if (textNode.fontName && textNode.fontName.family) {
      await figma.loadFontAsync(textNode.fontName);
    }
    
    // 텍스트 내용 업데이트
    textNode.characters = textContent;
    
    console.log('✅ [updateTextNodeInFigma] 완료:', { nodeId, textContent });
    
  } catch (error) {
    console.error('❌ [updateTextNodeInFigma] 오류:', error);
    throw error;
  }
}

// Figma에서 이미지 노드 업데이트
async function updateImageNodeInFigma(nodeId, imageContent) {
  try {
    console.log('🔄 [updateImageNodeInFigma] 시작:', { nodeId });
    
    // 현재 페이지에서 해당 노드 찾기
    const page = figma.currentPage;
    const nodes = page.findAll(n => n.name === nodeId && (n.type === 'RECTANGLE' || n.type === 'ELLIPSE'));
    
    if (nodes.length === 0) {
      throw new Error(`이미지 노드 '${nodeId}'를 찾을 수 없습니다`);
    }
    
    // 첫 번째 매칭 노드 업데이트
    const imageNode = nodes[0];
    
    // Base64 이미지 디코딩 및 적용
    if (imageContent && imageContent.startsWith('data:image')) {
      const base64Data = imageContent.split(',')[1];
      const imageBytes = figma.base64Decode(base64Data);
      const image = figma.createImage(imageBytes);
      
      // 이미지 fill 적용
      imageNode.fills = [{
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: 'FILL'
      }];
    }
    
    console.log('✅ [updateImageNodeInFigma] 완료:', { nodeId });
    
  } catch (error) {
    console.error('❌ [updateImageNodeInFigma] 오류:', error);
    throw error;
  }
}

// 요청 상태 업데이트
async function updateRequestStatus(requestId, status, errorMessage = null) {
  try {
    console.log('🔄 [updateRequestStatus] 시작:', { requestId, status, errorMessage });
    
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    // 실제 Supabase API 호출
    const response = await fetch(`https://geuboakvnddaaheahild.supabase.co/rest/v1/figma_update_requests?id=eq.${requestId}`, {
      method: 'PATCH',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`Supabase API 오류: ${response.status}`);
    }

    console.log('✅ [updateRequestStatus] 성공:', { requestId, status });
    
  } catch (error) {
    console.error('❌ [updateRequestStatus] 오류:', error);
  }
}