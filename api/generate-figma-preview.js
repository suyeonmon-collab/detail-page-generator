/**
 * Figma API를 사용하여 템플릿 미리보기 이미지 자동 생성
 * 
 * 사용법:
 * GET /api/generate-figma-preview?fileKey=abc123&nodeId=1:2
 * 
 * 필요한 환경 변수:
 * - FIGMA_ACCESS_TOKEN: Figma Personal Access Token
 */

module.exports = async (req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
  }

  try {
    let fileKey, nodeId, figmaUrl;
    
    if (req.method === 'POST') {
      // POST 요청: body에서 데이터 추출
      const body = req.body;
      console.log('🔵 [API] POST 요청 받음:', body);
      
      figmaUrl = body.figmaUrl;
      nodeId = body.nodeId;
      
      if (!figmaUrl || !nodeId) {
        return res.status(400).json({ 
          error: 'figmaUrl과 nodeId는 필수입니다',
          received: { figmaUrl, nodeId }
        });
      }
      
      // Figma URL에서 파일 ID 추출
      const fileIdMatch = figmaUrl.match(/design\/([a-zA-Z0-9]+)/);
      if (!fileIdMatch) {
        return res.status(400).json({ 
          error: '잘못된 Figma URL 형식입니다',
          figmaUrl: figmaUrl
        });
      }
      
      fileKey = fileIdMatch[1];
      console.log('🟢 [API] 추출된 파일 ID:', fileKey);
      console.log('🟢 [API] Node ID:', nodeId);
      
    } else {
      // GET 요청: query에서 데이터 추출
      fileKey = req.query.fileKey;
      nodeId = req.query.nodeId;
    }

    // 공통 검증
    if (!fileKey || !nodeId) {
      return res.status(400).json({ 
        error: 'fileKey and nodeId are required',
        example: '/api/generate-figma-preview?fileKey=abc123&nodeId=1:2'
      });
    }

    const figmaToken = process.env.FIGMA_ACCESS_TOKEN;
    
    if (!figmaToken) {
      console.error('🔴 [API] FIGMA_ACCESS_TOKEN 환경 변수 없음');
      return res.status(500).json({ 
        error: 'FIGMA_ACCESS_TOKEN not configured in environment variables' 
      });
    }

    // Node ID 형식 정규화 (하이픈을 콜론으로 변환)
    const normalizedNodeId = nodeId.replace('-', ':');
    console.log('🟢 [API] 정규화된 Node ID:', normalizedNodeId);

    // 1. Figma API로 이미지 생성 요청
    const imageUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${normalizedNodeId}&scale=2&format=png`;
    
    console.log('📸 [API] Figma API 호출:', imageUrl);

    const figmaResponse = await fetch(imageUrl, {
      headers: {
        'X-Figma-Token': figmaToken
      }
    });

    if (!figmaResponse.ok) {
      const errorData = await figmaResponse.text();
      console.error('❌ [API] Figma API 오류:', figmaResponse.status, errorData);
      return res.status(figmaResponse.status).json({
        success: false,
        error: `Figma API 오류: ${figmaResponse.status}`,
        details: errorData
      });
    }

    const data = await figmaResponse.json();
    console.log('🟢 [API] Figma 응답:', data);
    
    if (data.err) {
      console.error('❌ [API] Figma 에러:', data.err);
      return res.status(500).json({
        success: false,
        error: `Figma 에러: ${data.err}`,
        figmaResponse: data
      });
    }

    const imageDownloadUrl = data.images[normalizedNodeId];

    if (!imageDownloadUrl) {
      console.error('❌ [API] 이미지 URL 없음. Figma 응답:', data);
      console.error('❌ [API] 찾고 있는 Node ID:', normalizedNodeId);
      console.error('❌ [API] 사용 가능한 Node IDs:', Object.keys(data.images || {}));
      
      return res.status(500).json({
        success: false,
        error: '이미지를 생성할 수 없습니다',
        details: {
          requestedNodeId: normalizedNodeId,
          availableNodeIds: Object.keys(data.images || {}),
          figmaResponse: data
        }
      });
    }

    console.log('✅ [API] Figma 이미지 생성 성공:', imageDownloadUrl);

    return res.status(200).json({
      success: true,
      imageUrl: imageDownloadUrl,
      fileKey: fileKey,
      nodeId: normalizedNodeId,
      expiresIn: '14 days',
      note: 'URL expires after 14 days. Consider uploading to permanent storage (Cloudinary, S3, etc.)'
    });

  } catch (error) {
    console.error('❌ Error in generate-figma-preview:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

