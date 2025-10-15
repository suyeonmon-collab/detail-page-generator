-- designs 테이블은 건드리지 않고 관리자 페이지용 테이블만 생성 (간단 버전)

-- 1. 관리자 페이지용 테이블 생성 (기존 designs 테이블과 완전히 별개)

-- categories 테이블 생성
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    templates TEXT[], -- 템플릿 ID 배열
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- templates 테이블 생성
CREATE TABLE IF NOT EXISTS templates (
    template_id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    preview_image TEXT,
    figma_url TEXT,
    figma_node_id TEXT,
    figma_file_key TEXT,
    price INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    nodes JSONB, -- 템플릿 노드 구조 (JSON)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성 (중복 방지)
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_enabled ON templates(enabled);

-- 3. 함수 생성 (간단하게)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 관리자 테이블용 트리거 생성 (designs 테이블은 건드리지 않음)
-- categories 테이블 트리거
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- templates 테이블 트리거
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS (Row Level Security) 설정
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 6. 정책 설정 (모든 사용자가 읽기 가능)
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Templates are viewable by everyone" ON templates;
CREATE POLICY "Templates are viewable by everyone" ON templates
    FOR SELECT USING (true);

-- 7. 완료 메시지
SELECT 'Admin tables created successfully!' as status;
