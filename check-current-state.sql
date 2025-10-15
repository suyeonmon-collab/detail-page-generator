-- 현재 Supabase 테이블 상태 확인

-- 1. 모든 테이블 목록 확인
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. 기존 트리거 확인
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 3. 기존 함수 확인
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 4. 기존 데이터 확인 (있는 테이블들)
SELECT 'categories' as table_name, count(*) as row_count FROM categories
UNION ALL
SELECT 'templates' as table_name, count(*) as row_count FROM templates
UNION ALL
SELECT 'designs' as table_name, count(*) as row_count FROM designs;
