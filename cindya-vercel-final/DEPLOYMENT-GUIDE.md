# 🚀 신디야 배포 가이드

## ✅ 완료된 기능

### 핵심 기능 (Production Ready)
- ✅ 카테고리 선택 화면 (5개 카테고리)
- ✅ 템플릿 갤러리 (8개 템플릿)
- ✅ 동적 입력 폼 생성 (템플릿 기반)
- ✅ AI 콘텐츠 생성 (OpenAI/Claude)
- ✅ 실시간 편집 & 미리보기
- ✅ 워터마크 적용 (CSS + JS)
- ✅ 복사 방지 기능
- ✅ 결제 페이지
- ✅ Supabase 데이터베이스 스키마
- ✅ Netlify Functions API
- ✅ 환경 설정 파일

### 추가 개발 필요 (Optional)
- ⏳ 모듈 추가 기능 (상세페이지 카테고리만)
- ⏳ Fabric.js 캔버스 편집기
- ⏳ Gmail API 결제 자동 확인
- ⏳ Figma API 완전 연동
- ⏳ Framer Motion 애니메이션

---

## 📋 배포 체크리스트

### 1. Supabase 설정

```sql
-- 1. Supabase 프로젝트 생성
-- 2. SQL Editor에서 database/supabase-schema.sql 실행
-- 3. API Keys 확인
--    - Settings > API > Project URL
--    - Settings > API > service_role key
```

### 2. OpenAI API 키 발급

```
1. https://platform.openai.com/ 접속
2. API Keys 메뉴에서 새 키 생성
3. 키 저장 (sk-로 시작)
```

### 3. SendGrid 설정 (이메일 발송용)

```
1. https://sendgrid.com/ 가입
2. API Key 생성
3. From Email 인증
```

### 4. Netlify 배포

```bash
# 1. Netlify CLI 설치
npm install -g netlify-cli

# 2. Netlify 로그인
netlify login

# 3. 프로젝트 초기화
netlify init

# 4. 환경 변수 설정
netlify env:set SUPABASE_URL "https://your-project.supabase.co"
netlify env:set SUPABASE_SERVICE_KEY "your-service-key"
netlify env:set OPENAI_API_KEY "sk-your-key"
netlify env:set SENDGRID_API_KEY "SG-your-key"
netlify env:set SENDGRID_FROM_EMAIL "noreply@yourdomain.com"

# 5. 배포
netlify deploy --prod

# 배포 URL 확인
# https://your-site-name.netlify.app
```

### 5. Figma 템플릿 준비 (선택사항)

```
1. Figma에서 각 카테고리별 템플릿 디자인
2. 각 템플릿에 노드 이름 설정 (예: "main-title", "body-text")
3. Figma API Token 발급
4. File Key 확인
5. 환경 변수에 추가:
   netlify env:set FIGMA_ACCESS_TOKEN "figd-your-token"
```

---

## 🧪 테스트 시나리오

### 시나리오 1: SNS 템플릿 생성

1. 메인 페이지에서 "SNS 템플릿" 선택
2. "미니멀 스타일" 템플릿 선택
3. 폼 입력:
   - 메인 제목: "여름 신상 출시"
   - 서브 제목: "지금 바로 만나보세요"
   - 본문: "시원한 여름을 위한..."
   - 타겟: "20-30대 여성"
   - 이메일: your@email.com
4. "AI 콘텐츠 생성하기" 클릭
5. AI 생성 결과 확인
6. 텍스트 수정
7. "디자인 생성하기" 클릭
8. 결제 페이지 확인

### 시나리오 2: 쇼핑몰 상세페이지

1. "쇼핑몰 상세페이지" 선택
2. "럭셔리 스타일" 선택
3. 상품 정보 입력 + 이미지 업로드
4. AI 생성 후 편집
5. 워터마크 미리보기 확인
6. 결제 진행

---

## 🔧 환경 변수 전체 목록

### 필수 환경 변수

```bash
# 데이터베이스
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# AI API (둘 중 하나)
OPENAI_API_KEY=sk-...
# 또는
CLAUDE_API_KEY=sk-ant-...

# 이메일
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### 선택적 환경 변수

```bash
# Figma (나중에 추가)
FIGMA_ACCESS_TOKEN=figd_...
FIGMA_FILE_KEY=xxx

# Gmail API (결제 자동화)
GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=xxx
GMAIL_REFRESH_TOKEN=xxx

# Cafe24
CAFE24_BASE_URL=https://yourstore.cafe24.com
```

---

## 🐛 문제 해결

### 1. AI 생성 실패

**문제:** "AI 콘텐츠 생성 실패"
**해결:**
- OpenAI API 키 확인
- API 사용량 확인 (한도 초과 여부)
- Netlify Functions 로그 확인

### 2. 데이터베이스 연결 실패

**문제:** "데이터베이스 저장 실패"
**해결:**
- SUPABASE_URL 확인
- SUPABASE_SERVICE_KEY 확인 (anon key가 아님!)
- Supabase 프로젝트가 활성화되어 있는지 확인

### 3. 이미지 업로드 안됨

**문제:** 이미지 선택 후 미리보기 없음
**해결:**
- 파일 크기 10MB 이하 확인
- 이미지 파일 형식 확인 (JPG, PNG만)
- 브라우저 콘솔 에러 확인

### 4. 결제 페이지 이동 안됨

**문제:** "결제 정보가 없습니다"
**해결:**
- 세션 스토리지 확인
- requestId가 제대로 전달되었는지 확인
- 브라우저 개인정보 보호 모드는 세션 스토리지 제한

---

## 📊 모니터링

### Netlify Functions 로그 확인

```bash
# CLI로 실시간 로그 확인
netlify functions:log

# 또는 Netlify Dashboard
# Functions > 함수 선택 > Logs 탭
```

### Supabase 데이터 확인

```sql
-- 최근 디자인 확인
SELECT * FROM designs 
ORDER BY created_at DESC 
LIMIT 10;

-- 결제 대기 중인 디자인
SELECT * FROM designs 
WHERE payment_status = 'pending';

-- 오류 발생한 디자인
SELECT * FROM designs 
WHERE status = 'error';
```

---

## 🚀 최적화 팁

### 1. 이미지 최적화

```javascript
// 이미지 압축 라이브러리 추가
npm install sharp

// Functions에서 이미지 리사이즈
const sharp = require('sharp');
await sharp(buffer)
  .resize(1200, 1200, { fit: 'inside' })
  .jpeg({ quality: 85 })
  .toBuffer();
```

### 2. API 응답 캐싱

```javascript
// Netlify Functions에 캐시 헤더 추가
return {
  statusCode: 200,
  headers: {
    'Cache-Control': 'public, max-age=3600'
  },
  body: JSON.stringify(data)
};
```

### 3. 템플릿 데이터 CDN 활용

```javascript
// data/*.json 파일을 CDN에 업로드
// 예: Cloudinary, AWS S3 + CloudFront
const TEMPLATE_CDN = 'https://cdn.yourdomain.com/templates.json';
```

---

## 📈 다음 단계

### Phase 1: MVP 런칭 (현재 완료 ✅)
- 기본 카테고리 & 템플릿
- AI 콘텐츠 생성
- 수동 결제 확인

### Phase 2: 자동화 (선택)
- Gmail API 결제 자동 확인
- Figma API 완전 연동
- 최종 파일 자동 생성

### Phase 3: 고급 기능 (선택)
- 캔버스 편집기
- 모듈 시스템
- 애니메이션

### Phase 4: 스케일링 (선택)
- MongoDB 마이그레이션
- Redis 캐싱
- CDN 활용
- 성능 최적화

---

## 📞 지원

배포 중 문제가 발생하면:
1. README-cindya.md 참고
2. Netlify 로그 확인
3. Supabase 로그 확인
4. GitHub Issues 생성

---

**배포를 축하합니다! 🎉**


