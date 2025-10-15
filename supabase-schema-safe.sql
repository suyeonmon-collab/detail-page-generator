-- 안전한 Supabase 스키마 업데이트 (기존 테이블 고려)

-- 1. 기존 트리거 제거 (있는 경우에만)
DROP TRIGGER IF EXISTS update_designs_updated_at ON designs;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;

-- 2. 기존 함수 제거 (있는 경우에만)
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 3. 업데이트 시간 자동 갱신 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. categories 테이블 생성 (기존 데이터 보존)
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

-- 5. templates 테이블 생성 (기존 데이터 보존)
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

-- 6. 기존 designs 테이블에 updated_at 컬럼 추가 (없는 경우에만)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'designs' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE designs ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 7. 인덱스 생성 (중복 방지)
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_enabled ON templates(enabled);

-- 8. 트리거 설정 (중복 방지)
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_designs_updated_at ON designs;
CREATE TRIGGER update_designs_updated_at 
    BEFORE UPDATE ON designs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. RLS (Row Level Security) 설정
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 10. 정책 설정 (모든 사용자가 읽기 가능)
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Templates are viewable by everyone" ON templates;
CREATE POLICY "Templates are viewable by everyone" ON templates
    FOR SELECT USING (true);

-- 11. 완료 메시지
SELECT 'Schema update completed successfully!' as status;
