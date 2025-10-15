-- 기존 테이블 확인 및 안전한 스키마 업데이트

-- 1. 기존 테이블 구조 확인
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('categories', 'templates', 'designs')
ORDER BY table_name, ordinal_position;

-- 2. 기존 트리거 확인
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND event_object_table IN ('categories', 'templates', 'designs');

-- 3. 기존 데이터 확인
SELECT 'categories' as table_name, count(*) as row_count FROM categories
UNION ALL
SELECT 'templates' as table_name, count(*) as row_count FROM templates
UNION ALL
SELECT 'designs' as table_name, count(*) as row_count FROM designs;
