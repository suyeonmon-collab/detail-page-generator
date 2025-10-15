const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화 (관리자용 - SERVICE_KEY 사용)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
    console.error('SUPABASE_URL:', supabaseUrl ? '설정됨' : '없음');
    console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '설정됨' : '없음');
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 디버깅 로그
    console.log('🔵 [Supabase API] 요청 시작:', req.method);
    console.log('🔵 [Supabase API] 환경 변수 확인:');
    console.log('  - SUPABASE_URL:', process.env.SUPABASE_URL ? '설정됨' : '없음');
    console.log('  - SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '설정됨' : '없음');

    try {
        if (req.method === 'GET') {
            // 데이터 조회
            return await getData(req, res);
        } else if (req.method === 'POST') {
            // 데이터 저장
            return await saveData(req, res);
        } else {
            return res.status(405).json({ 
                success: false, 
                error: 'Method not allowed' 
            });
        }
    } catch (error) {
        console.error('❌ Supabase API 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || '서버 오류가 발생했습니다.' 
        });
    }
};

// 데이터 조회
async function getData(req, res) {
    try {
        console.log('🔵 [Supabase] 데이터 조회 시작');

        // 카테고리 조회
        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('*')
            .order('created_at', { ascending: true });

        if (categoriesError) {
            throw new Error(`카테고리 조회 실패: ${categoriesError.message}`);
        }

        // 템플릿 조회
        const { data: templates, error: templatesError } = await supabase
            .from('templates')
            .select('*')
            .order('created_at', { ascending: true });

        if (templatesError) {
            throw new Error(`템플릿 조회 실패: ${templatesError.message}`);
        }

        console.log('✅ [Supabase] 데이터 조회 성공');
        console.log(`📊 카테고리: ${categories.length}개, 템플릿: ${templates.length}개`);

        return res.status(200).json({
            success: true,
            data: {
                categories: categories || [],
                templates: templates || []
            }
        });

    } catch (error) {
        console.error('❌ [Supabase] 데이터 조회 오류:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// 데이터 저장
async function saveData(req, res) {
    try {
        const { categories, templates } = req.body;

        if (!categories || !templates) {
            return res.status(400).json({ 
                success: false, 
                error: 'categories와 templates가 필요합니다.' 
            });
        }

        console.log('🔵 [Supabase] 데이터 저장 시작');
        console.log(`📊 저장할 데이터: 카테고리 ${categories.length}개, 템플릿 ${templates.length}개`);

        // 카테고리 저장 (upsert) - 개별 처리
        console.log('🔵 [Supabase] 카테고리 저장 시작');
        for (const category of categories) {
            console.log(`  - 카테고리 저장: ${category.id}`);
            const { error: categoryError } = await supabase
                .from('categories')
                .upsert(category, { 
                    onConflict: 'id',
                    ignoreDuplicates: false 
                });

            if (categoryError) {
                console.error('❌ [Supabase] 카테고리 저장 오류:', categoryError);
                throw new Error(`카테고리 저장 실패: ${categoryError.message}`);
            }
        }
        console.log('✅ [Supabase] 카테고리 저장 완료');

        // 템플릿 저장 (upsert) - 개별 처리
        console.log('🔵 [Supabase] 템플릿 저장 시작');
        for (const template of templates) {
            console.log(`  - 템플릿 저장: ${template.template_id}`);
            const { error: templateError } = await supabase
                .from('templates')
                .upsert(template, { 
                    onConflict: 'template_id',
                    ignoreDuplicates: false 
                });

            if (templateError) {
                console.error('❌ [Supabase] 템플릿 저장 오류:', templateError);
                throw new Error(`템플릿 저장 실패: ${templateError.message}`);
            }
        }
        console.log('✅ [Supabase] 템플릿 저장 완료');

        console.log('✅ [Supabase] 데이터 저장 성공');

        return res.status(200).json({ 
            success: true, 
            message: '데이터가 Supabase에 저장되었습니다.',
            data: {
                categories: categories.length,
                templates: templates.length
            }
        });

    } catch (error) {
        console.error('❌ [Supabase] 데이터 저장 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || '데이터 저장 중 오류가 발생했습니다.' 
        });
    }
}
