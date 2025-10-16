-- Supabase 권한 정책 수정 - 템플릿 업데이트 권한 추가

-- 기존 정책 제거
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
DROP POLICY IF EXISTS "Templates are viewable by everyone" ON templates;

-- 새로운 정책 설정 - 모든 사용자가 읽기/쓰기 가능
CREATE POLICY "Categories full access for everyone" ON categories
    FOR ALL USING (true);

CREATE POLICY "Templates full access for everyone" ON templates
    FOR ALL USING (true);

-- 추가: 서비스 역할을 위한 정책 (더 안전한 방법)
DROP POLICY IF EXISTS "Enable all access for service role" ON templates;
CREATE POLICY "Enable all access for service role" ON templates
    FOR ALL USING (auth.role() = 'service_role');

-- 관리자 페이지에서 사용할 수 있도록 anon 역할에도 권한 부여
DROP POLICY IF EXISTS "Enable all access for anon" ON templates;
CREATE POLICY "Enable all access for anon" ON templates
    FOR ALL USING (true);

-- categories 테이블에도 동일하게 적용
DROP POLICY IF EXISTS "Enable all access for service role" ON categories;
CREATE POLICY "Enable all access for service role" ON categories
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Enable all access for anon" ON categories;
CREATE POLICY "Enable all access for anon" ON categories
    FOR ALL USING (true);

-- 완료 메시지
SELECT 'Supabase 권한 정책이 수정되었습니다!' as status;
