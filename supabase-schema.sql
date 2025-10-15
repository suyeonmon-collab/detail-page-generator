-- Supabase 테이블 스키마 설계

-- 1. 카테고리 테이블
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

-- 2. 템플릿 테이블
CREATE TABLE IF NOT EXISTS templates (
    template_id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
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

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_enabled ON templates(enabled);

-- 4. 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. 트리거 설정
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS (Row Level Security) 설정
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 7. 정책 설정 (모든 사용자가 읽기 가능, 관리자만 쓰기 가능)
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Templates are viewable by everyone" ON templates
    FOR SELECT USING (true);

-- 관리자 정책 (향후 인증 시스템과 연동)
-- CREATE POLICY "Only admins can modify categories" ON categories
--     FOR ALL USING (auth.role() = 'admin');

-- CREATE POLICY "Only admins can modify templates" ON templates
--     FOR ALL USING (auth.role() = 'admin');
