const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // 서비스 키 사용 (관리자 권한)

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 기존 JSON 데이터
const categories = [
    {
        "id": "shopping-template",
        "name": "쇼핑몰 템플릿",
        "description": "온라인 쇼핑몰용 디자인 템플릿",
        "icon": "🛍️",
        "color": "#667eea",
        "templates": ["shopping-minimal", "shopping-premium"]
    },
    {
        "id": "business-template",
        "name": "비즈니스 템플릿",
        "description": "기업 및 비즈니스용 디자인 템플릿",
        "icon": "💼",
        "color": "#4facfe",
        "templates": ["business-corporate", "business-startup"]
    },
    {
        "id": "event-template",
        "name": "이벤트 템플릿",
        "description": "행사 및 이벤트용 디자인 템플릿",
        "icon": "🎉",
        "color": "#43e97b",
        "templates": ["event-wedding", "event-party"]
    },
    {
        "id": "food-template",
        "name": "푸드 템플릿",
        "description": "음식점 및 카페용 디자인 템플릿",
        "icon": "🍽️",
        "color": "#fa709a",
        "templates": ["food-restaurant", "food-cafe"]
    },
    {
        "id": "youtube-template",
        "name": "유튜브 템플릿",
        "description": "유튜브 썸네일 및 채널 아트 디자인",
        "icon": "📺",
        "color": "#FF0000",
        "templates": ["youtube-thumbnail-test"]
    }
];

const templates = [
    {
        "templateId": "shopping-minimal",
        "categoryId": "shopping-template",
        "name": "미니멀 쇼핑몰",
        "description": "깔끔하고 심플한 쇼핑몰 디자인",
        "previewImage": "https://placehold.co/400x500/667eea/ffffff?text=Minimal+Shopping",
        "figmaUrl": "",
        "figmaNodeId": "",
        "figmaFileKey": "",
        "price": 0,
        "enabled": true,
        "nodes": [
            {"id": "title", "type": "text", "placeholder": "상품명", "maxLength": 50},
            {"id": "image", "type": "image", "placeholder": "상품 이미지"}
        ]
    },
    {
        "templateId": "shopping-premium",
        "categoryId": "shopping-template",
        "name": "프리미엄 쇼핑몰",
        "description": "고급스러운 프리미엄 쇼핑몰 디자인",
        "previewImage": "https://placehold.co/400x500/667eea/ffffff?text=Premium+Shopping",
        "figmaUrl": "",
        "figmaNodeId": "",
        "figmaFileKey": "",
        "price": 0,
        "enabled": true,
        "nodes": [
            {"id": "title", "type": "text", "placeholder": "상품명", "maxLength": 50},
            {"id": "image", "type": "image", "placeholder": "상품 이미지"}
        ]
    },
    {
        "templateId": "business-corporate",
        "categoryId": "business-template",
        "name": "기업용 디자인",
        "description": "대기업 및 기관용 비즈니스 디자인",
        "previewImage": "https://placehold.co/400x500/4facfe/ffffff?text=Corporate+Business",
        "figmaUrl": "",
        "figmaNodeId": "",
        "figmaFileKey": "",
        "price": 0,
        "enabled": true,
        "nodes": [
            {"id": "title", "type": "text", "placeholder": "회사명", "maxLength": 50},
            {"id": "image", "type": "image", "placeholder": "회사 이미지"}
        ]
    },
    {
        "templateId": "business-startup",
        "categoryId": "business-template",
        "name": "스타트업 디자인",
        "description": "스타트업 및 신생기업용 디자인",
        "previewImage": "https://placehold.co/400x500/4facfe/ffffff?text=Startup+Business",
        "figmaUrl": "",
        "figmaNodeId": "",
        "figmaFileKey": "",
        "price": 0,
        "enabled": true,
        "nodes": [
            {"id": "title", "type": "text", "placeholder": "회사명", "maxLength": 50},
            {"id": "image", "type": "image", "placeholder": "회사 이미지"}
        ]
    },
    {
        "templateId": "event-wedding",
        "categoryId": "event-template",
        "name": "웨딩 이벤트",
        "description": "결혼식 및 웨딩 관련 이벤트 디자인",
        "previewImage": "https://placehold.co/400x500/43e97b/ffffff?text=Wedding+Event",
        "figmaUrl": "",
        "figmaNodeId": "",
        "figmaFileKey": "",
        "price": 0,
        "enabled": true,
        "nodes": [
            {"id": "title", "type": "text", "placeholder": "이벤트명", "maxLength": 50},
            {"id": "image", "type": "image", "placeholder": "이벤트 이미지"}
        ]
    },
    {
        "templateId": "event-party",
        "categoryId": "event-template",
        "name": "파티 이벤트",
        "description": "생일파티 및 기념일 이벤트 디자인",
        "previewImage": "https://placehold.co/400x500/43e97b/ffffff?text=Party+Event",
        "figmaUrl": "",
        "figmaNodeId": "",
        "figmaFileKey": "",
        "price": 0,
        "enabled": true,
        "nodes": [
            {"id": "title", "type": "text", "placeholder": "이벤트명", "maxLength": 50},
            {"id": "image", "type": "image", "placeholder": "이벤트 이미지"}
        ]
    },
    {
        "templateId": "food-restaurant",
        "categoryId": "food-template",
        "name": "레스토랑 디자인",
        "description": "레스토랑 및 고급 식당용 디자인",
        "previewImage": "https://placehold.co/400x500/fa709a/ffffff?text=Restaurant+Food",
        "figmaUrl": "",
        "figmaNodeId": "",
        "figmaFileKey": "",
        "price": 0,
        "enabled": true,
        "nodes": [
            {"id": "title", "type": "text", "placeholder": "음식명", "maxLength": 50},
            {"id": "image", "type": "image", "placeholder": "음식 이미지"}
        ]
    },
    {
        "templateId": "food-cafe",
        "categoryId": "food-template",
        "name": "카페 디자인",
        "description": "카페 및 디저트샵용 디자인",
        "previewImage": "https://placehold.co/400x500/fa709a/ffffff?text=Cafe+Food",
        "figmaUrl": "",
        "figmaNodeId": "",
        "figmaFileKey": "",
        "price": 0,
        "enabled": true,
        "nodes": [
            {"id": "title", "type": "text", "placeholder": "음료명", "maxLength": 50},
            {"id": "image", "type": "image", "placeholder": "음료 이미지"}
        ]
    },
    {
        "templateId": "youtube-thumbnail-test",
        "categoryId": "youtube-template",
        "name": "유튜브 썸네일 테스트",
        "description": "유튜브 썸네일 디자인 템플릿 (테스트용)",
        "previewImage": "https://placehold.co/1280x720/ff0000/ffffff?text=YouTube+Thumbnail+Test",
        "figmaUrl": "https://www.figma.com/design/abc123def456/Test-Design?node-id=1-1",
        "figmaNodeId": "1-1",
        "figmaFileKey": "abc123def456",
        "price": 0,
        "enabled": true,
        "nodes": [
            {"id": "title", "type": "text", "placeholder": "썸네일 제목", "maxLength": 50},
            {"id": "subtitle", "type": "text", "placeholder": "부제목", "maxLength": 30},
            {"id": "background-image", "type": "image", "placeholder": "배경 이미지"},
            {"id": "accent-text", "type": "text", "placeholder": "강조 텍스트", "maxLength": 20}
        ]
    }
];

async function migrateData() {
    console.log('🚀 데이터 마이그레이션 시작...');
    
    try {
        // 1. 카테고리 데이터 삽입
        console.log('📂 카테고리 데이터 삽입 중...');
        const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .upsert(categories, { onConflict: 'id' });
            
        if (categoriesError) {
            throw new Error(`카테고리 삽입 실패: ${categoriesError.message}`);
        }
        
        console.log(`✅ 카테고리 ${categories.length}개 삽입 완료`);
        
        // 2. 템플릿 데이터 삽입
        console.log('📄 템플릿 데이터 삽입 중...');
        const { data: templatesData, error: templatesError } = await supabase
            .from('templates')
            .upsert(templates, { onConflict: 'template_id' });
            
        if (templatesError) {
            throw new Error(`템플릿 삽입 실패: ${templatesError.message}`);
        }
        
        console.log(`✅ 템플릿 ${templates.length}개 삽입 완료`);
        
        // 3. 결과 확인
        const { data: finalCategories } = await supabase.from('categories').select('count');
        const { data: finalTemplates } = await supabase.from('templates').select('count');
        
        console.log('🎉 마이그레이션 완료!');
        console.log(`📊 최종 결과: 카테고리 ${finalCategories?.length || 0}개, 템플릿 ${finalTemplates?.length || 0}개`);
        
    } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        process.exit(1);
    }
}

// 마이그레이션 실행
migrateData();
