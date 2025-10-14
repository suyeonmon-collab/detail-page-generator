const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // DELETE만 허용
    if (req.method !== 'DELETE') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        // URL에서 프로젝트 ID 추출
        const projectId = req.url.split('?id=')[1];
        
        if (!projectId) {
            return res.status(400).json({ 
                success: false, 
                error: '프로젝트 ID가 필요합니다' 
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

        // 먼저 프로젝트가 존재하는지 확인
        const { data: existingProject, error: fetchError } = await supabase
            .from('detail_requests')
            .select('id, customer_email')
            .eq('id', projectId)
            .single();

        if (fetchError || !existingProject) {
            return res.status(404).json({ 
                success: false, 
                error: '프로젝트를 찾을 수 없습니다' 
            });
        }

        // TODO: 사용자 권한 확인 (본인의 프로젝트만 삭제 가능)
        // if (existingProject.customer_email !== userEmail) {
        //     return res.status(403).json({ 
        //         success: false, 
        //         error: '삭제 권한이 없습니다' 
        //     });
        // }

        // 프로젝트 삭제
        const { error: deleteError } = await supabase
            .from('detail_requests')
            .delete()
            .eq('id', projectId);

        if (deleteError) {
            console.error('❌ Supabase delete error:', deleteError);
            return res.status(500).json({ 
                success: false, 
                error: '데이터베이스 삭제 실패' 
            });
        }

        return res.status(200).json({
            success: true,
            message: '프로젝트가 성공적으로 삭제되었습니다'
        });

    } catch (error) {
        console.error('❌ API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || '서버 오류가 발생했습니다' 
        });
    }
};
