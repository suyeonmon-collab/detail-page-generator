const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET만 허용
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        // Authorization 헤더에서 토큰 추출
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authorization token required' 
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Clerk 토큰 검증 (실제로는 Clerk SDK를 사용해야 함)
        // 지금은 간단히 토큰이 있는지만 확인
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid token' 
            });
        }

        // TODO: Clerk 토큰 검증 및 사용자 ID 추출
        // const clerkUser = await verifyClerkToken(token);
        // const userId = clerkUser.sub;

        // 임시로 모든 프로젝트를 반환 (나중에 사용자별 필터링)
        const { data: projects, error } = await supabase
            .from('detail_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase query error:', error);
            return res.status(500).json({ 
                success: false, 
                error: '데이터베이스 조회 실패' 
            });
        }

        // 프로젝트 데이터 변환
        const formattedProjects = projects.map(project => ({
            id: project.id,
            title: project.product_name || '제목 없음',
            category: project.product_category || '기타',
            template: project.template || 'default',
            status: getProjectStatus(project),
            createdAt: project.created_at,
            updatedAt: project.updated_at,
            previewUrl: project.figma_link || null,
            customerEmail: project.customer_email
        }));

        return res.status(200).json({
            success: true,
            projects: formattedProjects,
            total: formattedProjects.length
        });

    } catch (error) {
        console.error('❌ API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || '서버 오류가 발생했습니다' 
        });
    }
};

// 프로젝트 상태 결정
function getProjectStatus(project) {
    if (project.status === 'ai_completed' && project.figma_link) {
        return 'completed';
    } else if (project.status === 'ai_completed') {
        return 'processing';
    } else if (project.status === 'pending') {
        return 'pending';
    } else {
        return 'failed';
    }
}
