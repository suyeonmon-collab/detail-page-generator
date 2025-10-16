// Supabase 권한 정책 수정을 위한 임시 API
// POST /api/fix-supabase-permissions

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://geuboakvnddaaheahild.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔧 [Fix Permissions API] Supabase 권한 정책 수정 시작');

    // 권한 정책 수정 SQL 실행
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- 기존 정책 제거
        DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
        DROP POLICY IF EXISTS "Templates are viewable by everyone" ON templates;

        -- 새로운 정책 설정
        CREATE POLICY "Categories full access for everyone" ON categories
            FOR ALL USING (true);

        CREATE POLICY "Templates full access for everyone" ON templates
            FOR ALL USING (true);
      `
    });

    if (error) {
      console.error('❌ [Fix Permissions API] SQL 실행 오류:', error);
      return res.status(500).json({ 
        error: '권한 정책 수정에 실패했습니다',
        details: error.message 
      });
    }

    console.log('✅ [Fix Permissions API] 권한 정책 수정 완료');

    return res.status(200).json({
      success: true,
      message: 'Supabase 권한 정책이 성공적으로 수정되었습니다'
    });

  } catch (error) {
    console.error('❌ [Fix Permissions API] 서버 오류:', error);
    return res.status(500).json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    });
  }
}
