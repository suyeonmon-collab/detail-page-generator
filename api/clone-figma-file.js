import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const { templateId, userId, templateName } = req.body;

    if (!templateId || !userId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing templateId or userId' 
        });
    }

    try {
        console.log('🔄 [Figma Clone] 시작:', { templateId, userId, templateName });

        // 1. 템플릿 정보 가져오기
        const { data: template, error: templateError } = await supabase
            .from('templates')
            .select('figma_file_key, figma_node_id, name')
            .eq('template_id', templateId)
            .single();

        if (templateError || !template) {
            console.error('❌ [Figma Clone] 템플릿 정보 조회 오류:', templateError);
            return res.status(404).json({ 
                success: false, 
                error: 'Template not found' 
            });
        }

        console.log('🟢 [Figma Clone] 템플릿 정보:', template);

        // 2. 실제 Figma API로 파일 복제 시도
        console.log('🔄 [Figma Clone] 실제 Figma API 복제 시도');
        
        try {
            // Figma API로 파일 복제 시도
            const cloneResponse = await fetch(`https://api.figma.com/v1/files/${template.figma_file_key}/copy`, {
                method: 'POST',
                headers: {
                    'X-Figma-Token': FIGMA_ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: `${templateName || template.name} - ${userId}`,
                    description: `복제된 파일 - ${new Date().toISOString()}`
                })
            });

            if (cloneResponse.ok) {
                const cloneData = await cloneResponse.json();
                console.log('✅ [Figma Clone] 실제 복제 성공:', cloneData);
                
                const clonedFileKey = cloneData.file.key;
                const clonedFileName = cloneData.file.name;
                const clonedFileUrl = `https://www.figma.com/file/${clonedFileKey}?node-id=${template.figma_node_id}`;
                
                console.log('🟢 [Figma Clone] 실제 복제된 파일 정보:', {
                    clonedFileKey,
                    clonedFileName,
                    clonedFileUrl
                });
                
                // 3. 복제된 파일 정보를 Supabase에 저장
                const { data: userFile, error: saveError } = await supabase
                    .from('user_figma_files')
                    .insert({
                        user_id: userId,
                        template_id: templateId,
                        original_file_key: template.figma_file_key,
                        cloned_file_key: clonedFileKey,
                        cloned_file_url: clonedFileUrl,
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

                return res.status(200).json({
                    success: true,
                    message: 'Figma 파일이 성공적으로 복제되었습니다',
                    data: {
                        fileId: userFile.id,
                        clonedFileKey: clonedFileKey,
                        clonedFileUrl: clonedFileUrl,
                        fileName: clonedFileName,
                        templateId: templateId,
                        userId: userId,
                        realClone: true
                    }
                });
                
            } else {
                const errorText = await cloneResponse.text();
                console.warn('⚠️ [Figma Clone] 실제 복제 실패, 시뮬레이션 모드로 전환:', errorText);
                
                // 실제 복제가 실패하면 시뮬레이션 모드
                // URL에서 실제 파일 키 추출
                const actualFileKey = template.figma_file_key; // 원본 파일 키 사용
                const timestamp = Date.now();
                const clonedFileKey = `${actualFileKey}-${userId}-${timestamp}`;
                const clonedFileName = `${templateName || template.name} - ${userId}`;
                const clonedFileUrl = `https://www.figma.com/file/${actualFileKey}?node-id=${template.figma_node_id}`;
                
                console.log('🟡 [Figma Clone] 시뮬레이션 모드 파일 정보:', {
                    actualFileKey,
                    clonedFileKey,
                    clonedFileName,
                    clonedFileUrl
                });
                
                const { data: userFile, error: saveError } = await supabase
                    .from('user_figma_files')
                    .insert({
                        user_id: userId,
                        template_id: templateId,
                        original_file_key: template.figma_file_key,
                        cloned_file_key: actualFileKey, // 실제 파일 키 사용
                        cloned_file_url: clonedFileUrl,
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

                console.log('✅ [Figma Clone] 시뮬레이션 모드 완료:', userFile);

                return res.status(200).json({
                    success: true,
                    message: 'Figma 파일 복제가 시뮬레이션 모드로 완료되었습니다 (실제 복제는 실패)',
                    data: {
                        fileId: userFile.id,
                        clonedFileKey: actualFileKey, // 실제 파일 키 사용
                        clonedFileUrl: clonedFileUrl,
                        fileName: clonedFileName,
                        templateId: templateId,
                        userId: userId,
                        simulationMode: true
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ [Figma Clone] 복제 오류:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Figma 파일 복제 실패',
                details: error.message
            });
        }

    } catch (error) {
        console.error('❌ [Figma Clone] 서버 오류:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}