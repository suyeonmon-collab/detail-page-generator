# Supabase 권한 정책 수정 가이드

## 문제 상황
현재 Supabase의 templates 테이블에 대한 권한 정책이 SELECT(읽기)만 허용하고 있어서, 템플릿 수정/삭제가 작동하지 않습니다.

## 해결 방법

### 1. Supabase 대시보드 접속
1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 프로젝트 선택: `geuboakvnddaaheahild`

### 2. SQL Editor에서 권한 정책 수정
1. 좌측 메뉴에서 "SQL Editor" 클릭
2. "New query" 버튼 클릭
3. 아래 SQL 코드를 복사하여 붙여넣기:

```sql
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
```

4. "Run" 버튼 클릭하여 실행

### 3. 실행 결과 확인
성공적으로 실행되면 다음과 같은 메시지가 표시됩니다:
```
Supabase 권한 정책이 수정되었습니다!
```

### 4. 테스트
1. 관리자 대시보드에서 템플릿 수정 시도
2. 템플릿 삭제 시도
3. 피그마 플러그인에서 템플릿 업데이트 시도

## 추가 확인사항

### RLS (Row Level Security) 상태 확인
```sql
-- RLS가 활성화되어 있는지 확인
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('templates', 'categories');
```

### 현재 정책 확인
```sql
-- 현재 적용된 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('templates', 'categories');
```

## 문제 해결 후 예상 결과

1. **관리자 대시보드**: 템플릿 수정/삭제가 정상 작동
2. **피그마 플러그인**: 템플릿 업데이트가 정상 작동
3. **웹 편집 페이지**: 템플릿 데이터 로드가 정상 작동
4. **콘솔 오류**: 권한 관련 오류가 사라짐

## 보안 고려사항

현재 설정은 개발/테스트 환경에 적합합니다. 프로덕션 환경에서는 더 엄격한 권한 정책을 적용하는 것을 권장합니다:

```sql
-- 프로덕션용 더 안전한 정책 (예시)
CREATE POLICY "Templates authenticated access" ON templates
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Templates service role access" ON templates
    FOR ALL USING (auth.role() = 'service_role');
```

## 문의사항

권한 정책 수정 후에도 문제가 지속되면:
1. Supabase 로그 확인
2. 브라우저 개발자 도구 콘솔 확인
3. API 응답 상태 코드 확인
