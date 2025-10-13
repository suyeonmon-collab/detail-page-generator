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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileKey, nodeId } = req.query;

    if (!fileKey || !nodeId) {
      return res.status(400).json({ 
        error: 'fileKey and nodeId are required',
        example: '/api/generate-figma-preview?fileKey=abc123&nodeId=1:2'
      });
    }

    const figmaToken = process.env.FIGMA_ACCESS_TOKEN;
    
    if (!figmaToken) {
      return res.status(500).json({ 
        error: 'FIGMA_ACCESS_TOKEN not configured in environment variables' 
      });
    }

    // 1. Figma API로 이미지 생성 요청
    const imageUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&scale=2&format=png`;
    
    console.log('📸 Requesting Figma image:', imageUrl);

    const figmaResponse = await fetch(imageUrl, {
      headers: {
        'X-Figma-Token': figmaToken
      }
    });

    if (!figmaResponse.ok) {
      const errorData = await figmaResponse.text();
      console.error('❌ Figma API error:', errorData);
      throw new Error(`Figma API error: ${figmaResponse.status} ${errorData}`);
    }

    const data = await figmaResponse.json();
    
    if (data.err) {
      throw new Error(`Figma error: ${data.err}`);
    }

    const imageDownloadUrl = data.images[nodeId];

    if (!imageDownloadUrl) {
      throw new Error('Image URL not found in Figma response');
    }

    console.log('✅ Figma image generated:', imageDownloadUrl);

    return res.status(200).json({
      success: true,
      imageUrl: imageDownloadUrl,
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

