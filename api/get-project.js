const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
        // URL에서 프로젝트 ID 추출
        const projectId = req.url.split('/').pop();
        
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

        // Supabase에서 프로젝트 데이터 조회
        const { data: project, error } = await supabase
            .from('detail_requests')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error) {
            console.error('❌ Supabase query error:', error);
            return res.status(404).json({ 
                success: false, 
                error: '프로젝트를 찾을 수 없습니다' 
            });
        }

        if (!project) {
            return res.status(404).json({ 
                success: false, 
                error: '프로젝트가 존재하지 않습니다' 
            });
        }

        // 프로젝트 데이터 포맷팅
        const formattedProject = {
            id: project.id,
            productName: project.product_name,
            productDescription: project.product_description,
            aiContent: project.ai_content,
            targetAudience: project.target_audience,
            productCategory: project.product_category,
            template: project.template,
            status: project.status,
            customerEmail: project.customer_email,
            createdAt: project.created_at,
            updatedAt: project.updated_at,
            figmaLink: project.figma_link,
            pngLink: project.png_link,
            paymentId: project.payment_id,
            paymentMethod: project.payment_method,
            paymentAmount: project.payment_amount,
            paymentDate: project.payment_date
        };

        return res.status(200).json({
            success: true,
            project: formattedProject
        });

    } catch (error) {
        console.error('❌ API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || '서버 오류가 발생했습니다' 
        });
    }
};
