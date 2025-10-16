# Supabase 접근 문제 해결 방법

## 🚨 현재 상황
Supabase 대시보드에 접근할 수 없어서 권한 정책을 직접 수정할 수 없는 상황입니다.

## 🔧 해결 방법들

### 방법 1: 관리자 대시보드에서 권한 수정 (추천)

1. **관리자 대시보드 접속**
   - `/admin/dashboard.html` 접속
   - 템플릿 관리 섹션으로 이동

2. **권한 수정 버튼 클릭**
   - "🔧 권한 수정" 버튼 클릭
   - 확인 다이얼로그에서 "확인" 클릭

3. **완료 확인**
   - 성공 메시지 확인
   - 템플릿 수정/삭제 기능 테스트

### 방법 2: 직접 API 호출

브라우저 개발자 도구 콘솔에서 실행:

```javascript
// 권한 정책 수정 API 호출
fetch('/api/fix-supabase-permissions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
})
.then(response => response.json())
.then(data => {
    console.log('권한 정책 수정 결과:', data);
    if (data.success) {
        alert('✅ Supabase 권한 정책이 성공적으로 수정되었습니다!');
        location.reload(); // 페이지 새로고침
    } else {
        alert('❌ 권한 정책 수정에 실패했습니다: ' + data.error);
    }
})
.catch(error => {
    console.error('오류:', error);
    alert('❌ 오류가 발생했습니다: ' + error.message);
});
```

### 방법 3: Supabase 대시보드 접근 시도

1. **다른 브라우저/시크릿 모드 시도**
   - Chrome 시크릿 모드
   - Firefox 시크릿 모드
   - Safari 시크릿 모드

2. **다른 네트워크에서 시도**
   - 모바일 핫스팟
   - 다른 WiFi 네트워크
   - VPN 사용

3. **Supabase 로그인 정보 확인**
   - 이메일: 등록된 이메일 주소
   - 비밀번호: 설정한 비밀번호
   - 2FA: 활성화된 경우 인증 코드

### 방법 4: 임시 해결책 - 로컬 모드

Supabase 접근이 불가능한 경우, 임시로 로컬 모드로 작동하도록 설정:

```javascript
// 관리자 대시보드에서 로컬 모드 활성화
localStorage.setItem('admin_local_mode', 'true');
location.reload();
```

## 🔍 문제 진단

### 현재 API 상태 확인

브라우저 콘솔에서 실행:

```javascript
// Supabase 연결 상태 확인
fetch('https://geuboakvnddaaheahild.supabase.co/rest/v1/templates?select=count', {
    headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldWJvYWt2bmRkYWFoZWFoaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU5OTUsImV4cCI6MjA3NTU5MTk5NX0.MOa29kzB6vQ4cR7hHJAHRKUKA5kGBQdr15_-2hdOVds'
    }
})
.then(response => {
    console.log('Supabase 연결 상태:', response.status);
    if (response.status === 200) {
        console.log('✅ Supabase 연결 정상');
    } else {
        console.log('❌ Supabase 연결 문제:', response.status);
    }
})
.catch(error => {
    console.log('❌ Supabase 연결 오류:', error);
});
```

## 📞 추가 지원

위 방법들로도 해결되지 않으면:

1. **Supabase 지원팀 문의**
   - 이메일: support@supabase.com
   - 프로젝트 ID: geuboakvnddaaheahild

2. **임시 해결책**
   - 로컬 JSON 파일 사용
   - 다른 데이터베이스 서비스 사용

3. **개발자 문의**
   - 기술 지원 요청
   - 원격 지원 요청

## 🎯 권한 수정 후 확인사항

권한 정책이 수정되면 다음 기능들이 정상 작동해야 합니다:

- ✅ 템플릿 수정
- ✅ 템플릿 삭제  
- ✅ 피그마 플러그인 업데이트
- ✅ 웹 편집 페이지 로드
- ✅ 콘솔 권한 오류 사라짐
