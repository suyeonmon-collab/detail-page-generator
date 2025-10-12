# 🔧 Vercel 404 오류 해결 가이드

## 문제: 배포 후 404 오류

---

## ✅ 해결 방법

### 1. Vercel 대시보드 설정 확인

**https://vercel.com/dashboard** 접속 → 프로젝트 선택

#### Settings → General

```
Framework Preset: Other
Root Directory: ./  (또는 비워두기)
Build Command: npm run build  (또는 비워두기)
Output Directory: .  (점 하나, 또는 비워두기)
Install Command: npm install
```

#### 중요: Output Directory
- **"." (점 하나)** 입력
- 또는 완전히 **비워두기**
- `public`이나 `dist` 같은 값이 있으면 제거!

### 2. 재배포

Settings에서 수정했다면:

1. **Deployments** 탭으로 이동
2. 최신 배포 클릭
3. **...** 메뉴 → **Redeploy** 클릭
4. **Redeploy** 확인

---

## 🔍 추가 확인 사항

### Build 로그 확인

**Deployments** → 최신 배포 클릭 → **Building** 단계 확인

**성공적인 빌드 로그:**
```
✓ Installing dependencies...
✓ Building...
✓ Uploading...
✓ Deployment ready
```

### 파일 구조 확인

**Deployment** → **Source** 탭에서:
```
✓ index.html (루트에 있어야 함)
✓ pages/
✓ data/
✓ api/
```

---

## 🚀 빠른 해결: 수동 재배포

### GitHub 연동이 안 되어 있다면:

**Vercel CLI 사용:**

```bash
# 1. Vercel CLI 설치 (권한 문제 없는 버전)
npm install vercel --save-dev

# 2. Vercel 로그인
npx vercel login

# 3. 배포
npx vercel --prod

# 4. 지시사항 따라하기
# - Set up and deploy? Y
# - Which scope? (계정 선택)
# - Link to existing project? Y
# - Project name: detail-page-generator
# - Override settings? N
```

---

## 🔧 vercel.json 최종 버전

```json
{
  "version": 2,
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

---

## 📋 체크리스트

- [ ] Vercel Settings → Output Directory = "." (또는 비워두기)
- [ ] vercel.json 파일이 루트에 있음
- [ ] index.html 파일이 루트에 있음
- [ ] 환경 변수 모두 설정됨
- [ ] 재배포 실행

---

## ⚡ 가장 빠른 해결책

1. **Vercel 대시보드** → 프로젝트 → **Settings**
2. **General** → 아래로 스크롤
3. **Root Directory** 확인: 비워두기 또는 `.`
4. **Output Directory** 확인: 비워두기 또는 `.`
5. **Framework Preset** → **Other** 선택
6. **Save** 클릭
7. **Deployments** → **Redeploy** 클릭

완료! 🎉

