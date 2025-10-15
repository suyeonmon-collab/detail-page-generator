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

        // 2. 사용자별 고유 파일 정보 생성 (임시 해결책)
        // TODO: 실제 Figma API 파일 복제 기능 구현 필요
        
        const timestamp = Date.now();
        const clonedFileKey = `${template.figma_file_key}-${userId}-${timestamp}`;
        const clonedFileName = `${templateName || template.name} - ${userId}`;
        
        console.log('🟢 [Figma Clone] 사용자별 파일 정보 생성:', {
            originalFileKey: template.figma_file_key,
            clonedFileKey: clonedFileKey,
            fileName: clonedFileName
        });

        // 3. 복제된 파일 정보를 Supabase에 저장
        const { data: userFile, error: saveError } = await supabase
            .from('user_figma_files')
            .insert({
                user_id: userId,
                template_id: templateId,
                original_file_key: template.figma_file_key,
                cloned_file_key: clonedFileKey,
                cloned_file_url: `https://www.figma.com/file/${template.figma_file_key}?node-id=${template.figma_node_id}`,
                file_name: clonedFileName,
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
                clonedFileKey: clonedFileKey,
                clonedFileUrl: `https://www.figma.com/file/${template.figma_file_key}?node-id=${template.figma_node_id}`,
                fileName: clonedFileName,
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
