const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { projectId, editedContent } = req.body;

        if (!projectId || !editedContent) {
            return res.status(400).json({ 
                success: false, 
                error: '프로젝트 ID와 편집된 콘텐츠가 필요합니다' 
            });
        }

        // Authorization 헤더에서 토큰 추출
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authorization token required' 
            });
        }

        const token = authHeader.split(' ')[1];
        
        // TODO: Clerk 토큰 검증 및 사용자 ID 추출
        // const clerkUser = await verifyClerkToken(token);
        // const userId = clerkUser.sub;

        // Supabase에서 프로젝트 업데이트
        const { data: updatedProject, error } = await supabase
            .from('detail_requests')
            .update({
                edited_content: editedContent,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectId)
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase update error:', error);
            return res.status(500).json({ 
                success: false, 
                error: '데이터베이스 업데이트 실패' 
            });
        }

        if (!updatedProject) {
            return res.status(404).json({ 
                success: false, 
                error: '프로젝트를 찾을 수 없습니다' 
            });
        }

        return res.status(200).json({
            success: true,
            message: '콘텐츠가 성공적으로 업데이트되었습니다',
            project: updatedProject
        });

    } catch (error) {
        console.error('❌ API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || '서버 오류가 발생했습니다' 
        });
    }
};
