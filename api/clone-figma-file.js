const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { templateId, userId, templateName } = req.body;

        if (!templateId || !userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'templateId와 userId가 필요합니다' 
            });
        }

        console.log('🔄 [Figma Clone] 파일 복제 시작:', { templateId, userId, templateName });

        // 1. 템플릿 정보 가져오기
        const { data: template, error: templateError } = await supabase
            .from('templates')
            .select('figma_url, figma_file_key, figma_node_id, name')
            .eq('template_id', templateId)
            .single();

        if (templateError || !template) {
            console.error('❌ [Figma Clone] 템플릿 조회 실패:', templateError);
            return res.status(404).json({ 
                success: false, 
                error: '템플릿을 찾을 수 없습니다' 
            });
        }

        console.log('🟢 [Figma Clone] 템플릿 정보:', template);

        // 2. Figma API로 파일 복제
        const figmaAccessToken = process.env.FIGMA_ACCESS_TOKEN;
        if (!figmaAccessToken) {
            console.error('❌ [Figma Clone] Figma Access Token이 설정되지 않았습니다');
            return res.status(500).json({ 
                success: false, 
                error: 'Figma 설정 오류' 
            });
        }

        // Figma API로 파일 복제 요청
        const cloneResponse = await fetch(`https://api.figma.com/v1/files/${template.figma_file_key}/copy`, {
            method: 'POST',
            headers: {
                'X-Figma-Token': figmaAccessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `${templateName || template.name} - ${userId}`,
                description: `복제된 템플릿 파일 - 사용자: ${userId}`
            })
        });

        if (!cloneResponse.ok) {
            const errorData = await cloneResponse.text();
            console.error('❌ [Figma Clone] Figma API 오류:', cloneResponse.status, errorData);
            return res.status(500).json({ 
                success: false, 
                error: `Figma 파일 복제 실패: ${cloneResponse.status}`,
                details: errorData
            });
        }

        const cloneData = await cloneResponse.json();
        console.log('🟢 [Figma Clone] 복제 성공:', cloneData);

        // 3. 복제된 파일 정보를 Supabase에 저장
        const { data: userFile, error: saveError } = await supabase
            .from('user_figma_files')
            .insert({
                user_id: userId,
                template_id: templateId,
                original_file_key: template.figma_file_key,
                cloned_file_key: cloneData.key,
                cloned_file_url: `https://www.figma.com/file/${cloneData.key}`,
                file_name: cloneData.name,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (saveError) {
            console.error('❌ [Figma Clone] Supabase 저장 실패:', saveError);
            return res.status(500).json({ 
                success: false, 
                error: '파일 정보 저장 실패',
                details: saveError.message
            });
        }

        console.log('✅ [Figma Clone] 완료:', userFile);

        // 4. 응답 반환
        return res.status(200).json({
            success: true,
            data: {
                fileId: userFile.id,
                clonedFileKey: cloneData.key,
                clonedFileUrl: `https://www.figma.com/file/${cloneData.key}`,
                fileName: cloneData.name,
                templateId: templateId,
                userId: userId
            },
            message: 'Figma 파일이 성공적으로 복제되었습니다'
        });

    } catch (error) {
        console.error('❌ [Figma Clone] 예상치 못한 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: '서버 오류',
            details: error.message
        });
    }
}
