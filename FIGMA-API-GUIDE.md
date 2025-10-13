# 🎨 Figma API 자동 미리보기 이미지 가이드

템플릿 미리보기 이미지를 Figma에서 자동으로 생성하는 방법입니다.

---

## 📋 준비물

### 1️⃣ Figma Personal Access Token 발급

1. **Figma 계정 설정 페이지 접속:**
   - https://www.figma.com/settings

2. **"Personal access tokens" 섹션으로 이동**

3. **"Generate new token" 클릭**
   - Token name: `Cindya Design Generator`
   - Scopes: `File content` (읽기 권한만 필요)

4. **토큰 복사** (한 번만 표시됨!)
   - 예: `figd_abc123...xyz789`

5. **Vercel 환경 변수에 추가:**
   - Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
   - Name: `FIGMA_ACCESS_TOKEN`
   - Value: `figd_abc123...xyz789`
   - 저장 후 재배포

---

### 2️⃣ Figma 파일 정보 확인

Figma 템플릿 URL 구조:
```
https://www.figma.com/design/FILE_KEY/File-Name?node-id=NODE_ID
                              ^^^^^^^^              ^^^^^^^
                              이것 필요!            이것도 필요!
```

**예시:**
```
URL: https://www.figma.com/design/abc123xyz/Shopping-Template?node-id=1-2

→ fileKey: abc123xyz
→ nodeId: 1:2 (하이픈을 콜론으로 변경!)
```

---

## 🚀 사용 방법

### 방법 1: API 직접 호출

```bash
curl "https://detail-page-generator.vercel.app/api/generate-figma-preview?fileKey=abc123xyz&nodeId=1:2"
```

**응답:**
```json
{
  "success": true,
  "imageUrl": "https://figma-alpha-api.s3.us-west-2.amazonaws.com/...",
  "expiresIn": "14 days",
  "note": "URL expires after 14 days..."
}
```

### 방법 2: 관리자 페이지에서 사용 (미래 기능)

```javascript
// admin/dashboard.js에 버튼 추가:

async function generateFigmaPreview(templateId) {
  const template = templates.find(t => t.id === templateId);
  const fileKey = template.figmaFileKey;
  const nodeId = template.figmaNodeId;
  
  const response = await fetch(
    `/api/generate-figma-preview?fileKey=${fileKey}&nodeId=${nodeId}`
  );
  
  const result = await response.json();
  
  if (result.success) {
    // 생성된 이미지 URL을 템플릿에 저장
    template.previewImage = result.imageUrl;
    await saveTemplates();
  }
}
```

---

## ⚠️ 중요 사항

### 1. **이미지 URL 만료**
- Figma API가 생성한 이미지 URL은 **14일 후 만료**됩니다
- 영구적으로 사용하려면 Cloudinary/S3에 업로드 필요

### 2. **Rate Limiting**
- Figma API는 분당 요청 제한이 있습니다
- 너무 많은 템플릿을 한 번에 생성하지 마세요

### 3. **파일 접근 권한**
- Figma 파일이 **Public** 또는 토큰 소유자가 **접근 가능**해야 합니다
- 비공개 파일은 팀 멤버로 추가되어야 합니다

---

## 🔄 전체 자동화 워크플로우

```
1. Figma에서 템플릿 디자인
         ↓
2. 템플릿 URL 복사
         ↓
3. 관리자 페이지에서 템플릿 정보 입력
   - figmaFileKey: abc123xyz
   - figmaNodeId: 1:2
         ↓
4. "미리보기 생성" 버튼 클릭
         ↓
5. /api/generate-figma-preview 호출
         ↓
6. 생성된 URL을 Cloudinary에 업로드 (선택)
         ↓
7. 영구 URL을 template.previewImage에 저장
```

---

## 📝 templates.json 구조

```json
{
  "templateId": "sns-minimal",
  "figmaFileKey": "abc123xyz",
  "figmaNodeId": "1:2",
  "previewImage": "https://res.cloudinary.com/.../sns-minimal.png",
  ...
}
```

---

## 🛠️ 트러블슈팅

### ❌ "Invalid token"
- Figma 토큰이 올바른지 확인
- Vercel 환경 변수 재확인

### ❌ "404: File not found"
- fileKey가 올바른지 확인
- Figma 파일 접근 권한 확인

### ❌ "Node not found"
- nodeId 형식 확인 (하이픈 대신 콜론: `1:2`)
- Figma에서 해당 노드가 존재하는지 확인

---

## 💡 추천 워크플로우

**개발 단계 (지금):**
```json
"previewImage": "https://placehold.co/400x500/667eea/fff?text=Template"
```

**테스트 단계:**
```json
"previewImage": "/images/templates/sns-minimal.png"
```

**프로덕션:**
```json
"previewImage": "https://res.cloudinary.com/.../sns-minimal.png"
```

---

**지금은 Figma API 설정이 필요하므로, 로컬 이미지나 플레이스홀더를 계속 사용하시는 걸 추천드립니다!** 😊

