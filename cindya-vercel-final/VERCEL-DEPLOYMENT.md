# 🚀 Vercel 배포 가이드

## ✅ 완료된 작업

- ✅ package.json build 스크립트 수정
- ✅ vercel.json 설정 파일 생성
- ✅ Netlify Functions → Vercel Functions 변환 (api/ 폴더)
- ✅ API URL 경로 수정 (/api로 상대 경로)

---

## 📋 Vercel 배포 단계

### 1. Vercel에 프로젝트 Import

1. **https://vercel.com** 접속
2. **Add New** → **Project** 클릭
3. **Import Git Repository** 선택
4. GitHub 저장소 연결: `suyeonmon-collab/detail-page-generator`
5. **Import** 클릭

### 2. 프로젝트 설정

**Configure Project** 화면에서:

```
Framework Preset: Other
Root Directory: ./
Build Command: npm run build (또는 비워두기)
Output Directory: . (현재 디렉토리)
Install Command: npm install
```

### 3. 환경 변수 설정

**Environment Variables** 섹션에서 다음 변수들 추가:

```bash
SUPABASE_URL
https://geuboakvnddaaheahild.supabase.co

SUPABASE_SERVICE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDAxNTk5NSwiZXhwIjoyMDc1NTkxOTk1fQ.WeHYlPVnXA2F2auSjOiPQLZI8tDmd4jaOvjNGqEFdMI

OPENAI_API_KEY
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

RESEND_API_KEY
re_ETYXa5xF_3F13mr4X5CAzqSndwuhBWc8R

RESEND_FROM_EMAIL
noreply@cindya.kr

FIGMA_ACCESS_TOKEN
figd_0efLdVUnX8lZrYPFK_Wv_kY7Y5ati4X25pNjqRLq

GMAIL_CLIENT_ID
355108512889-oair48qleh0o255nmnbi25q22peqqnpt.apps.googleusercontent.com

GMAIL_CLIENT_SECRET
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

GMAIL_REFRESH_TOKEN
1//04DggQIVFzZ8GCgYIARAAGAQSNwF-L9IrPoJ6shqfP0IbF5XcV_-ua-fEkZrh9lbGH0EEI5yVSzpc82srd1XmsMdmKC427DUSPSs

CAFE24_BASE_URL
https://suyeonmon1.cafe24.com/
```

### 4. 배포

**Deploy** 버튼 클릭!

---

## 🎯 배포 후 확인

배포가 완료되면:

1. **Vercel 대시보드**에서 배포 상태 확인
2. **Visit** 버튼을 클릭하여 사이트 열기
3. 카테고리 선택 → 템플릿 선택 → 폼 입력 테스트
4. API Functions 작동 확인

---

## 📁 프로젝트 구조 (Vercel 버전)

```
/
├── index.html              # 메인 페이지
├── pages/                  # 추가 페이지들
├── data/                   # JSON 데이터
├── api/                    # ⭐ Vercel Functions
│   ├── generate-content.js
│   ├── request-design.js
│   └── check-status.js
├── vercel.json            # ⭐ Vercel 설정
├── package.json           # ⭐ 수정됨
└── ...
```

---

## 🔧 Netlify vs Vercel 차이점

| 항목 | Netlify | Vercel |
|------|---------|--------|
| Functions 폴더 | `netlify/functions/` | `api/` |
| 함수 형식 | `exports.handler = async (event)` | `module.exports = async (req, res)` |
| 이벤트 객체 | `event.body`, `event.httpMethod` | `req.body`, `req.method` |
| 응답 | `return { statusCode, body }` | `res.status().json()` |
| 설정 파일 | `netlify.toml` | `vercel.json` |

---

## ⚠️ 주의사항

1. **환경 변수**를 반드시 Vercel 대시보드에서 설정하세요
2. **재배포**가 필요한 경우: Settings → Redeploy
3. **Functions 로그** 확인: Dashboard → Functions 탭

---

## 🐛 문제 해결

### 빌드 실패
```bash
# package.json의 build 스크립트 확인
"build": "echo 'No build needed - static site'"
```

### API 호출 실패
```javascript
// API_BASE 경로 확인 (pages/*.html 파일에서)
const API_BASE = '/api'; // ✅ 올바름
// const API_BASE = 'https://...'; // ❌ 절대 경로는 불필요
```

### Environment Variables 누락
- Vercel Dashboard → Project → Settings → Environment Variables 확인

---

**배포 완료!** 🎉

