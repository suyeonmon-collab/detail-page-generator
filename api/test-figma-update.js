import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
    try {
        console.log('🔄 [Test] 시작');
        console.log('🔄 [Test] SUPABASE_URL:', SUPABASE_URL ? '설정됨' : '없음');
        console.log('🔄 [Test] SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '설정됨' : '없음');
        
        // 간단한 Supabase 연결 테스트
        const { data, error } = await supabase
            .from('templates')
            .select('template_id')
            .limit(1);
            
        if (error) {
            console.error('❌ [Test] Supabase 오류:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Supabase 연결 실패',
                details: error.message 
            });
        }
        
        console.log('✅ [Test] Supabase 연결 성공:', data);
        
        return res.status(200).json({ 
            success: true, 
            message: '테스트 성공',
            data: data
        });
        
    } catch (error) {
        console.error('❌ [Test] 전체 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
}
