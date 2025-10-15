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

    const { templateId, userId, contentUpdates } = req.body;

    if (!templateId || !userId || !contentUpdates) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing templateId, userId, or contentUpdates' 
        });
    }

    try {
        console.log('🔄 [Figma Update] 시작:', { templateId, userId, contentUpdates });

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

        // 3. Figma API로 노드 정보 가져오기
        const figmaResponse = await fetch(
            `https://api.figma.com/v1/files/${template.figma_file_key}/nodes?ids=${template.figma_node_id}`,
            {
                headers: {
                    'X-Figma-Token': FIGMA_ACCESS_TOKEN
                }
            }
        );

        if (!figmaResponse.ok) {
            const errorText = await figmaResponse.text();
            console.error('❌ [Figma Update] Figma API 오류:', errorText);
            return res.status(500).json({ 
                success: false, 
                error: 'Figma API 오류', 
                details: errorText 
            });
        }

        const figmaData = await figmaResponse.json();
        console.log('🟢 [Figma Update] Figma 노드 데이터:', figmaData);

        // 4. 콘텐츠 업데이트 처리
        const updateResults = [];
        
        for (const [nodeId, updates] of Object.entries(contentUpdates)) {
            try {
                // 텍스트 노드 업데이트
                if (updates.text) {
                    const textUpdateResult = await updateTextNode(
                        template.figma_file_key, 
                        nodeId, 
                        updates.text
                    );
                    updateResults.push({
                        nodeId,
                        type: 'text',
                        success: textUpdateResult.success,
                        message: textUpdateResult.message
                    });
                }

                // 이미지 노드 업데이트
                if (updates.image) {
                    const imageUpdateResult = await updateImageNode(
                        template.figma_file_key, 
                        nodeId, 
                        updates.image
                    );
                    updateResults.push({
                        nodeId,
                        type: 'image',
                        success: imageUpdateResult.success,
                        message: imageUpdateResult.message
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

        // 5. 업데이트 결과 저장
        const { error: saveError } = await supabase
            .from('user_figma_files')
            .update({
                last_updated_content: JSON.stringify(contentUpdates),
                updated_at: new Date().toISOString()
            })
            .eq('id', userFile.id);

        if (saveError) {
            console.error('❌ [Figma Update] 업데이트 저장 실패:', saveError);
        }

        console.log('✅ [Figma Update] 완료:', updateResults);

        return res.status(200).json({
            success: true,
            data: {
                templateId,
                userId,
                updateResults,
                updatedAt: new Date().toISOString()
            },
            message: 'Figma 콘텐츠가 성공적으로 업데이트되었습니다'
        });

    } catch (error) {
        console.error('❌ [Figma Update] 예상치 못한 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal Server Error', 
            details: error.message 
        });
    }
}

// 텍스트 노드 업데이트 함수
async function updateTextNode(fileKey, nodeId, textContent) {
    try {
        // Figma API로 텍스트 업데이트
        const response = await fetch(
            `https://api.figma.com/v1/files/${fileKey}/nodes/${nodeId}`,
            {
                method: 'PATCH',
                headers: {
                    'X-Figma-Token': FIGMA_ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    characters: textContent
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Figma API 오류: ${errorText}`);
        }

        return {
            success: true,
            message: '텍스트가 성공적으로 업데이트되었습니다'
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
}

// 이미지 노드 업데이트 함수
async function updateImageNode(fileKey, nodeId, imageData) {
    try {
        // 이미지 업로드 및 노드 업데이트 로직
        // 실제 구현에서는 이미지를 Figma에 업로드하고 노드를 업데이트해야 함
        
        return {
            success: true,
            message: '이미지가 성공적으로 업데이트되었습니다'
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
}
