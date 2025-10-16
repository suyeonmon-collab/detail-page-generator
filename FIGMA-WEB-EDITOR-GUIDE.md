# 피그마 템플릿 웹 편집 시스템

관리자가 피그마 템플릿을 웹에서 편집 가능한 형태로 변환하고, 고객이 웹에서 직접 편집할 수 있는 시스템입니다.

## 🎯 시스템 개요

### 기존 방식
- 고객이 직접 피그마 플러그인으로 파일 수정
- 복잡한 피그마 사용법 학습 필요

### 새로운 방식
- 관리자가 템플릿 설정 → 고객은 웹에서만 편집
- 직관적인 웹 인터페이스로 간편한 편집

## 🏗️ 시스템 구조

```
피그마 플러그인 (관리자용)
    ↓ 템플릿 설정
Supabase 데이터베이스
    ↓ 템플릿 데이터
웹 편집 페이지 (고객용)
```

## 📁 파일 구조

### 피그마 플러그인
- `figma-plugin/code.js` - 관리자용 플러그인 메인 코드
- `figma-plugin/ui.html` - 관리자용 플러그인 UI
- `figma-plugin/manifest.json` - 플러그인 설정

### API 엔드포인트
- `api/templates.js` - 템플릿 목록 조회
- `api/templates/[templateId].js` - 특정 템플릿 조회
- `api/save-template.js` - 새 템플릿 저장
- `api/update-template/[templateId].js` - 템플릿 업데이트
- `api/register-figma-template.js` - 피그마 URL 등록
- `api/template-web-data/[templateId].js` - 웹 편집용 데이터 변환

### 웹 페이지
- `pages/template-editor.html` - 고객용 웹 편집 페이지
- `pages/templates.html` - 템플릿 선택 페이지 (수정됨)
- `admin/dashboard.html` - 관리자 대시보드 (수정됨)

## 🚀 사용 방법

### 1. 관리자 - 템플릿 등록

1. **관리자 대시보드 접속**
   - `/admin/dashboard.html` 접속
   - 템플릿 관리 섹션으로 이동

2. **템플릿 추가**
   - "템플릿 추가" 버튼 클릭
   - 템플릿 정보 입력:
     - 템플릿 이름
     - 카테고리 선택
     - 설명
     - **피그마 URL** (필수)
     - 가격

3. **피그마 플러그인 실행**
   - 피그마 URL 입력 후 "피그마 플러그인 실행" 버튼 클릭
   - 새 창에서 피그마 플러그인이 실행됨

4. **플러그인에서 템플릿 설정**
   - "새 템플릿 만들기" 선택
   - 편집 가능한 레이어 선택:
     - 텍스트 레이어 → "텍스트 수정 가능"
     - 이미지 레이어 → "이미지 교체 가능"
     - 도형 레이어 → "색상 변경 가능" 또는 "크기 변경 가능"
   - 각 레이어에 라벨 이름 부여 (예: "상품명", "가격", "메인이미지")
   - "저장 및 업로드" 클릭

5. **완료 확인**
   - 관리자 대시보드에서 상태 확인
   - "설정 완료" 상태가 되면 템플릿 등록 완료

### 2. 고객 - 템플릿 편집

1. **템플릿 선택**
   - `/pages/templates.html` 접속
   - 카테고리 선택
   - 원하는 템플릿 선택
   - "웹에서 편집" 버튼 클릭

2. **웹 편집**
   - `/pages/template-editor.html`로 이동
   - 편집 가능한 요소 클릭
   - 우측 속성 패널에서 수정:
     - 텍스트: 내용 직접 수정
     - 이미지: 파일 업로드
     - 색상: 색상 선택기 사용
     - 크기: 숫자 입력으로 조절

3. **저장**
   - "저장하기" 버튼 클릭
   - 변경사항이 로컬에 저장됨

## 🔧 기술 스택

### 프론트엔드
- HTML5, CSS3, JavaScript (Vanilla)
- 반응형 디자인
- 모던 UI/UX

### 백엔드
- Vercel Functions (Serverless)
- Supabase (PostgreSQL 데이터베이스)
- RESTful API

### 피그마 플러그인
- Figma Plugin API
- TypeScript
- Supabase 클라이언트

## 📊 데이터베이스 스키마

### templates 테이블
```sql
CREATE TABLE templates (
    template_id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    preview_image TEXT,
    figma_url TEXT,
    figma_file_key TEXT,
    price INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    nodes JSONB, -- 편집 가능한 노드 정보
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### nodes JSONB 구조
```json
{
  "node_id": {
    "editable": true,
    "label": "상품명",
    "editType": "text",
    "type": "TEXT",
    "position": { "x": 100, "y": 50, "width": 200, "height": 30 },
    "styles": { "fontSize": 16, "color": "#000000" }
  }
}
```

## 🎨 편집 타입

### 텍스트 수정 (text)
- 텍스트 내용 변경
- 폰트 크기, 색상, 정렬 유지
- 실시간 편집 가능

### 이미지 교체 (image)
- 이미지 파일 업로드
- 위치, 크기 유지
- 미리보기 제공

### 색상 변경 (color)
- 색상 선택기 사용
- 배경색, 테두리색 등 변경
- HEX, RGB 지원

### 크기 변경 (size)
- 너비, 높이 조절
- 비율 유지 옵션
- 실시간 미리보기

## 🔒 보안 및 권한

### 관리자 권한
- 템플릿 생성, 수정, 삭제
- 피그마 플러그인 실행
- 데이터베이스 직접 접근

### 고객 권한
- 템플릿 조회 및 편집
- 로컬 저장소 사용
- 제한된 API 접근

## 🚨 에러 처리

### 플러그인 에러
- 네트워크 연결 실패
- 피그마 API 오류
- 데이터베이스 오류

### 웹 편집 에러
- 템플릿 로드 실패
- 이미지 업로드 오류
- 저장 실패

### 사용자 친화적 메시지
- 한국어 오류 메시지
- 해결 방법 안내
- 자동 재시도 기능

## 📈 향후 개선 사항

### 기능 확장
- 더 많은 편집 타입 지원
- 템플릿 버전 관리
- 협업 편집 기능

### 성능 최적화
- 이미지 압축
- 캐싱 시스템
- CDN 활용

### 사용자 경험
- 드래그 앤 드롭 편집
- 키보드 단축키
- 실시간 미리보기

## 🛠️ 개발자 가이드

### 로컬 개발 환경 설정
1. Vercel CLI 설치
2. Supabase 프로젝트 설정
3. 환경 변수 설정
4. 로컬 서버 실행

### API 테스트
- Postman 또는 curl 사용
- 각 엔드포인트별 테스트 케이스
- 에러 시나리오 테스트

### 피그마 플러그인 개발
- Figma Plugin API 문서 참조
- 로컬 개발 환경 설정
- 디버깅 도구 활용

## 📞 지원 및 문의

- 기술 지원: 개발팀 문의
- 버그 리포트: GitHub Issues
- 기능 요청: 관리자 문의

---

**시스템 버전**: 1.0.0  
**최종 업데이트**: 2024년 12월  
**개발팀**: Admin Team
