import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const { templateId, userId, contentUpdates } = req.body;

    if (!templateId || !userId || !contentUpdates) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing templateId, userId, or contentUpdates' 
        });
    }

    try {
        console.log('🔄 [Figma Update] 시작:', { templateId, userId, contentUpdates });
        
        // 환경변수 확인
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            console.error('❌ [Figma Update] 환경변수 누락');
            return res.status(500).json({ 
                success: false, 
                error: '환경변수 설정 오류' 
            });
        }

        // 1. 템플릿 정보 가져오기
        const { data: template, error: templateError } = await supabase
            .from('templates')
            .select('figma_file_key, figma_node_id, name')
            .eq('template_id', templateId)
            .single();

        if (templateError || !template) {
            console.error('❌ [Figma Update] 템플릿 정보 조회 오류:', templateError);
            return res.status(404).json({ 
                success: false, 
                error: 'Template not found' 
            });
        }

        console.log('🟢 [Figma Update] 템플릿 정보:', template);

        // 2. 사용자별 파일 정보 가져오기
        const { data: userFile, error: userFileError } = await supabase
            .from('user_figma_files')
            .select('*')
            .eq('user_id', userId)
            .eq('template_id', templateId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (userFileError || !userFile) {
            console.error('❌ [Figma Update] 사용자 파일 정보 조회 오류:', userFileError);
            return res.status(404).json({ 
                success: false, 
                error: 'User file not found' 
            });
        }

        console.log('🟢 [Figma Update] 사용자 파일 정보:', userFile);

        // 3. 콘텐츠 업데이트 처리 (간단한 버전)
        const updateResults = [];
        
        for (const [nodeId, updates] of Object.entries(contentUpdates)) {
            try {
                console.log(`🔄 [Figma Update] 노드 ${nodeId} 업데이트 시작:`, updates);
                
                // 텍스트 노드 업데이트
                if (updates.text) {
                    const textUpdateResult = await updateTextNodeViaPlugin(
                        template.figma_file_key, 
                        nodeId, 
                        updates.text,
                        userId
                    );
                    updateResults.push({
                        nodeId,
                        type: 'text',
                        success: textUpdateResult.success,
                        message: textUpdateResult.message
                    });
                }
            } catch (error) {
                console.error(`❌ [Figma Update] 노드 ${nodeId} 업데이트 오류:`, error);
                updateResults.push({
                    nodeId,
                    type: 'unknown',
                    success: false,
                    message: error.message
                });
            }
        }

        // 5. 결과 반환
        const successCount = updateResults.filter(r => r.success).length;
        const totalCount = updateResults.length;

        console.log('✅ [Figma Update] 완료:', { successCount, totalCount, updateResults });

        return res.status(200).json({
            success: true,
            message: `Figma 콘텐츠가 성공적으로 업데이트되었습니다 (${successCount}/${totalCount})`,
            data: {
                updateResults,
                template: template.name,
                userFile: userFile.file_name
            }
        });

    } catch (error) {
        console.error('❌ [Figma Update] 전체 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
}

// Plugin을 통한 Figma 텍스트 노드 수정
async function updateTextNodeViaPlugin(fileKey, nodeId, textContent, userId) {
    try {
        console.log(`🔄 [updateTextNodeViaPlugin] 시작:`, { fileKey, nodeId, textContent, userId });
        
        // 1. 업데이트 요청을 Supabase에 저장 (Plugin이 읽을 수 있도록)
        const { data: updateRequest, error: saveError } = await supabase
            .from('figma_update_requests')
            .insert({
                user_id: userId,
                file_key: fileKey,
                node_id: nodeId,
                update_type: 'text',
                content: textContent,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (saveError) {
            console.error('❌ [updateTextNodeViaPlugin] Supabase 저장 오류:', saveError);
            return {
                success: false,
                message: saveError.message
            };
        }

        console.log('✅ [updateTextNodeViaPlugin] 업데이트 요청 저장 완료:', updateRequest);
        
        return {
            success: true,
            message: '텍스트 업데이트 요청이 성공적으로 저장되었습니다',
            requestId: updateRequest.id
        };
    } catch (error) {
        console.error('❌ [updateTextNodeViaPlugin] 오류:', error);
        return {
            success: false,
            message: error.message
        };
    }
}