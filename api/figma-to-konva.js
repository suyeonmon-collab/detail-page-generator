const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const { figmaUrl, nodeId } = req.body;

        console.log('🔵 [figma-to-konva] 시작:', { figmaUrl, nodeId });

        if (!figmaUrl || !nodeId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Figma URL과 Node ID가 필요합니다.' 
            });
        }

        // Figma URL에서 파일 키 추출
        const fileKey = extractFileIdFromUrl(figmaUrl);
        if (!fileKey) {
            return res.status(400).json({ 
                success: false, 
                error: '유효하지 않은 Figma URL입니다.' 
            });
        }

        console.log('🟢 [figma-to-konva] 파일 키 추출:', fileKey);

        // Figma REST API를 통해 이미지 가져오기
        const figmaToken = process.env.FIGMA_ACCESS_TOKEN;
        if (!figmaToken) {
            return res.status(500).json({ 
                success: false, 
                error: 'Figma Access Token이 설정되지 않았습니다.' 
            });
        }

        const figmaApiUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=2`;
        
        console.log('🟢 [figma-to-konva] Figma API 호출:', figmaApiUrl);

        const figmaResponse = await fetch(figmaApiUrl, {
            headers: {
                'X-Figma-Token': figmaToken,
            },
        });

        if (!figmaResponse.ok) {
            const errorText = await figmaResponse.text();
            console.error('🔴 [figma-to-konva] Figma API 오류:', errorText);
            return res.status(500).json({ 
                success: false, 
                error: `Figma API 오류: ${figmaResponse.status} ${errorText}` 
            });
        }

        const figmaData = await figmaResponse.json();
        console.log('🟢 [figma-to-konva] Figma API 응답:', figmaData);

        if (!figmaData.images || !figmaData.images[nodeId]) {
            return res.status(404).json({ 
                success: false, 
                error: 'Figma 이미지를 찾을 수 없습니다.' 
            });
        }

        const imageUrl = figmaData.images[nodeId];
        console.log('🟢 [figma-to-konva] 이미지 URL:', imageUrl);

        // Konva에서 사용할 기본 템플릿 구조 생성
        const konvaTemplate = {
            type: 'template',
            name: 'Figma Template',
            width: 1920,
            height: 1080,
            backgroundImage: imageUrl,
            elements: [
                {
                    id: 'background',
                    type: 'image',
                    src: imageUrl,
                    x: 0,
                    y: 0,
                    width: 1920,
                    height: 1080,
                    draggable: false,
                    selectable: false
                },
                {
                    id: 'title',
                    type: 'text',
                    text: '제목을 입력하세요',
                    x: 100,
                    y: 100,
                    fontSize: 48,
                    fontFamily: 'Arial',
                    fill: '#ffffff',
                    draggable: true,
                    selectable: true
                },
                {
                    id: 'subtitle',
                    type: 'text',
                    text: '부제목을 입력하세요',
                    x: 100,
                    y: 200,
                    fontSize: 24,
                    fontFamily: 'Arial',
                    fill: '#ffffff',
                    draggable: true,
                    selectable: true
                }
            ]
        };

        return res.status(200).json({ 
            success: true, 
            template: konvaTemplate,
            imageUrl: imageUrl,
            fileKey: fileKey,
            nodeId: nodeId
        });

    } catch (error) {
        console.error('🔴 [figma-to-konva] 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || '서버 오류가 발생했습니다.' 
        });
    }
};

// Figma URL에서 파일 키 추출
function extractFileIdFromUrl(figmaUrl) {
    try {
        // URL 패턴: https://www.figma.com/design/FILE_KEY/...
        const match = figmaUrl.match(/figma\.com\/design\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    } catch (error) {
        console.error('URL 파싱 오류:', error);
        return null;
    }
}
