# 🎨 신디야 (CINDYA) - AI 디자인 자동 생성기

> 카테고리별 템플릿 기반 AI 디자인 자동 생성 플랫폼

---

## 📖 프로젝트 개요

신디야는 사용자가 간단한 텍스트와 이미지를 입력하면 AI가 전문적인 디자인을 자동으로 생성해주는 SaaS 플랫폼입니다.

### 주요 기능

- ✅ **카테고리 선택**: SNS, 쇼핑몰, 블로그, 광고, 이메일 템플릿
- ✅ **AI 콘텐츠 생성**: OpenAI/Claude를 활용한 마케팅 카피 자동 생성
- ✅ **실시간 편집**: 생성된 콘텐츠를 바로 수정 가능
- ✅ **워터마크 미리보기**: 결제 전 워터마크 포함 미리보기 제공
- ✅ **자동 결제 감지**: Gmail API를 통한 결제 자동 확인
- ✅ **최종 파일 전달**: Figma 편집 파일 + 고해상도 PNG/JPG 제공

---

## 🛠️ 기술 스택

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- 반응형 디자인
- 드래그앤드롭 이미지 업로드

### Backend
- **Netlify Functions** (Serverless)
- Node.js
- Supabase (PostgreSQL) 또는 MongoDB

### API 연동
- **OpenAI API** / **Claude API** - AI 콘텐츠 생성
- **Figma API** - 디자인 템플릿 적용
- **Gmail API** - 결제 확인 자동화
- **SendGrid** - 이메일 발송

---

## 📁 프로젝트 구조

```
cindya/
├── index.html                  # 카테고리 선택 메인 페이지
├── pages/
│   ├── templates.html          # 템플릿 갤러리
│   ├── form.html              # 동적 입력 폼
│   ├── edit.html              # AI 미리보기 & 편집
│   └── payment.html           # 결제 페이지
├── data/
│   ├── categories.json        # 카테고리 데이터
│   └── templates.json         # 템플릿 데이터
├── netlify/functions/
│   ├── generate-content.js    # AI 콘텐츠 생성
│   ├── request-design.js      # 디자인 요청
│   ├── check-status.js        # 상태 확인
│   └── check-payment.js       # (TODO) 결제 확인
├── database/
│   ├── supabase-schema.sql    # Supabase 스키마
│   └── mongoose-schema.js     # MongoDB 스키마
├── netlify.toml               # Netlify 설정
├── package.json
└── README-cindya.md
```

---

## 🚀 시작하기

### 1. 환경 변수 설정

`env.example`을 참고하여 `.env` 파일을 생성하세요:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# OpenAI
OPENAI_API_KEY=sk-...

# Figma
FIGMA_ACCESS_TOKEN=figd_...

# SendGrid
SENDGRID_API_KEY=SG...

# Gmail API
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
```

### 2. 데이터베이스 설정

**Supabase 사용 시:**

```sql
-- Supabase SQL Editor에서 실행
-- database/supabase-schema.sql 파일 내용 복사하여 실행
```

**MongoDB 사용 시:**

```bash
npm install mongoose
# database/mongoose-schema.js를 functions에서 import하여 사용
```

### 3. 로컬 개발

```bash
# 의존성 설치
npm install

# Netlify CLI 설치
npm install -g netlify-cli

# 로컬 서버 실행
netlify dev

# http://localhost:8888 접속
```

### 4. Netlify 배포

```bash
# Netlify에 로그인
netlify login

# 프로젝트 초기화
netlify init

# 환경 변수 설정
netlify env:set SUPABASE_URL "your-url"
netlify env:set OPENAI_API_KEY "your-key"
# ... (모든 환경 변수 설정)

# 배포
netlify deploy --prod
```

---

## 💳 결제 시스템

### 결제 흐름

1. 사용자가 디자인 편집 완료 후 "결제하기" 클릭
2. Cafe24 결제 페이지로 이동 (고유 design_id 파라미터 포함)
3. 결제 완료 시 Cafe24에서 관리자 이메일로 결제 알림 발송
4. **Gmail API**가 1분마다 새 이메일 확인
5. 결제 이메일 감지 시 고객 이메일 추출
6. 해당 고객의 pending 디자인 찾기
7. 워터마크 제거 → 최종 파일 생성 → 고객에게 이메일 발송

### 미결제 알림

- 디자인 생성 후 30분이 지나도 결제하지 않은 경우
- SendGrid로 자동 알림 이메일 발송
- 결제 링크 포함 (7일간 유효)

---

## 🎨 템플릿 추가 방법

`data/templates.json` 파일에 새 템플릿 추가:

```json
{
  "templateId": "new-template-id",
  "categoryId": "sns-template",
  "name": "새 템플릿 이름",
  "description": "템플릿 설명",
  "previewImage": "https://...",
  "figmaTemplateId": "figma-...",
  "price": 9900,
  "cafe24PaymentLink": "https://cafe24.com/product/...",
  "nodes": [
    {"id": "title", "type": "text", "placeholder": "제목", "maxLength": 30},
    {"id": "body", "type": "textarea", "placeholder": "본문", "maxLength": 200}
  ]
}
```

---

## 🔐 보안 & 복사 방지

### 워터마크

- CSS 기반 대각선 반복 패턴
- 텍스트 워터마크 3개 배치
- 투명도 0.1-0.15

### 복사 방지

```javascript
- user-select: none
- contextmenu 이벤트 차단
- copy 이벤트 차단
- dragstart 이벤트 차단
- PrintScreen 키 감지 시 경고
```

---

## 📊 데이터베이스 스키마

### designs 테이블

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary Key |
| customer_email | TEXT | 고객 이메일 |
| category_id | TEXT | 카테고리 ID |
| template_id | TEXT | 템플릿 ID |
| ai_generated_content | JSONB | AI 생성 콘텐츠 |
| edited_content | JSONB | 편집된 콘텐츠 |
| payment_status | TEXT | 결제 상태 |
| preview_with_watermark | TEXT | 미리보기 URL |
| final_figma_url | TEXT | 최종 Figma URL |
| final_png_url | TEXT | PNG 다운로드 URL |

전체 스키마: `database/supabase-schema.sql` 참고

---

## 🔄 API 엔드포인트

### POST /api/generate-content
AI 콘텐츠 생성

**Request:**
```json
{
  "templateId": "sns-minimal",
  "categoryId": "sns-template",
  "targetAudience": "20-30대 여성",
  "customerEmail": "user@example.com",
  "content": {
    "main-title": "사용자 입력",
    "body-text": "사용자 입력"
  },
  "images": {}
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "uuid",
  "aiContent": {...},
  "previewUrl": "https://..."
}
```

### POST /api/request-design
디자인 생성 요청

### GET /api/check-status?requestId=xxx
디자인 상태 확인

---

## 📧 이메일 템플릿

### 미결제 알림 (30분 후)

```
제목: 🎨 디자인 생성 완료! 결제 후 다운로드하세요

안녕하세요,

신디야에서 요청하신 디자인이 완성되었습니다!
아래 링크를 통해 결제하시면 워터마크 없는 최종 파일을 받으실 수 있습니다.

[결제하고 다운로드하기]

유효기간: 7일
디자인 ID: xxx-xxx-xxx

감사합니다.
```

### 최종 파일 전송 (결제 완료 후)

```
제목: ✅ CINDYA 디자인 파일이 도착했습니다!

안녕하세요,

결제가 완료되었습니다!
아래 링크에서 최종 파일을 다운로드하실 수 있습니다.

📁 Figma 편집 파일: [링크]
🖼️ PNG 다운로드: [링크]
🖼️ JPG 다운로드: [링크]

다운로드 링크 유효기간: 30일

감사합니다!
```

---

## ⚙️ GitHub Actions (자동화)

`.github/workflows/payment-check.yml` 생성:

```yaml
name: Payment Check

on:
  schedule:
    - cron: '*/1 * * * *'  # 1분마다 실행

jobs:
  check-payments:
    runs-on: ubuntu-latest
    steps:
      - name: Check Payment Emails
        run: |
          curl -X POST https://cindya.netlify.app/api/check-payment-emails

      - name: Check Unpaid Designs
        run: |
          curl -X POST https://cindya.netlify.app/api/check-unpaid-designs
```

---

## 📝 TODO (고급 기능)

- [ ] 6단계: 모듈 추가 기능 (상세페이지 카테고리)
- [ ] 7단계: Fabric.js 캔버스 편집기
- [ ] 10단계: Gmail 결제 확인 자동화 완성
- [ ] 11단계: Figma 최종 파일 생성
- [ ] 14단계: Framer Motion 애니메이션
- [ ] 15단계: 성능 최적화 & 테스트

---

## 🤝 기여

1. Fork the Project
2. Create your Feature Branch
3. Commit your Changes
4. Push to the Branch
5. Open a Pull Request

---

## 📄 라이센스

Proprietary - All Rights Reserved

---

## 📞 문의

- 이메일: support@cindya.com
- 웹사이트: https://cindya.netlify.app

---

**Made with ❤️ by CINDYA Team**


