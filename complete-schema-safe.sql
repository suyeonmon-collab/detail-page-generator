-- 기존 트리거 안전하게 제거 후 재생성 (순서 수정)

-- =====================================================
-- 1단계: 기존 트리거와 함수 안전하게 제거
-- =====================================================

-- 기존 트리거들 제거 (테이블이 존재할 때만)
DO $$ 
BEGIN
    -- designs 테이블 트리거 제거
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'designs') THEN
        DROP TRIGGER IF EXISTS update_designs_updated_at ON designs;
    END IF;
    
    -- modules 테이블 트리거 제거
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules') THEN
        DROP TRIGGER IF EXISTS update_modules_updated_at ON modules;
    END IF;
    
    -- categories 테이블 트리거 제거
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') THEN
        DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
    END IF;
    
    -- templates 테이블 트리거 제거
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates') THEN
        DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
    END IF;
END $$;

-- 기존 함수 제거
DROP FUNCTION IF EXISTS update_updated_at_column();

-- =====================================================
-- 2단계: detail_requests 테이블 컬럼 수정
-- =====================================================

-- ai_content 컬럼이 NULL을 허용하도록 변경
ALTER TABLE detail_requests 
ALTER COLUMN ai_content DROP NOT NULL;

-- 1. template 컬럼 추가
ALTER TABLE detail_requests 
ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'modern';

-- 2. image_data 컬럼 추가 (혹시 없을 수도 있으니)
ALTER TABLE detail_requests 
ADD COLUMN IF NOT EXISTS image_data TEXT;

-- 3. edited_content를 NULL 허용으로 변경
ALTER TABLE detail_requests 
ALTER COLUMN edited_content DROP NOT NULL;

-- 4. ai_content도 NULL 허용으로 변경 (이전에 했지만 다시 확인)
ALTER TABLE detail_requests 
ALTER COLUMN ai_content DROP NOT NULL;

-- target_audience 컬럼 추가
ALTER TABLE detail_requests 
ADD COLUMN IF NOT EXISTS target_audience TEXT;

-- product_category 컬럼 추가
ALTER TABLE detail_requests 
ADD COLUMN IF NOT EXISTS product_category TEXT;

-- template 컬럼 추가
ALTER TABLE detail_requests 
ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'modern';

-- image_data 컬럼 추가
ALTER TABLE detail_requests 
ADD COLUMN IF NOT EXISTS image_data TEXT;

-- =====================================================
-- 3단계: 메인 테이블들 생성
-- =====================================================

-- 1. designs 테이블 (메인 디자인 정보)
CREATE TABLE IF NOT EXISTS designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_email TEXT NOT NULL,
  category_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_name TEXT,
  target_audience TEXT,
  
  -- 입력 데이터
  input_data JSONB,
  
  -- AI 생성 콘텐츠
  ai_generated_content JSONB,
  
  -- 최종 편집된 콘텐츠
  edited_content JSONB,
  
  -- 이미지 데이터
  images JSONB,
  
  -- 레이아웃 정보 (모듈 시스템용)
  layout JSONB,
  
  -- 결제 정보
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'expired')),
  payment_link TEXT,
  payment_link_expiry TIMESTAMP,
  payment_completed_at TIMESTAMP,
  
  -- 알림 정보
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP,
  
  -- 파일 URLs
  preview_with_watermark TEXT,
  figma_file_id TEXT,
  final_figma_url TEXT,
  final_png_url TEXT,
  final_jpg_url TEXT,
  
  -- 상태
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ai_completed', 'design_pending', 'design_completed', 'completed', 'error')),
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 2. modules 테이블 (재사용 가능한 디자인 모듈)
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  
  -- Figma 정보
  figma_component_id TEXT,
  figma_file_id TEXT,
  
  -- 모듈 속성
  height INTEGER,
  width INTEGER,
  
  -- 노드 정보
  nodes JSONB,
  
  -- 메타데이터
  tags TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. payment_emails 테이블 (Gmail 결제 확인용)
CREATE TABLE IF NOT EXISTS payment_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gmail_message_id TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  design_id UUID REFERENCES designs(id),
  
  -- 이메일 정보
  email_subject TEXT,
  email_body TEXT,
  email_received_at TIMESTAMP,
  
  -- 처리 정보
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  processing_error TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 4단계: 관리자 페이지용 테이블 생성
-- =====================================================

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

-- =====================================================
-- 5단계: 인덱스 생성
-- =====================================================

-- 메인 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_designs_email ON designs(customer_email);
CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(payment_status);
CREATE INDEX IF NOT EXISTS idx_designs_created ON designs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_emails_gmail_id ON payment_emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_payment_emails_processed ON payment_emails(processed);

-- 관리자 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id);
CREATE INDEX IF NOT EXISTS idx_templates_enabled ON templates(enabled);

-- =====================================================
-- 6단계: 함수와 트리거 생성 (새로 생성)
-- =====================================================

-- 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_designs_updated_at 
  BEFORE UPDATE ON designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at 
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7단계: RLS (Row Level Security) 정책
-- =====================================================

ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 관리자만 모든 접근 가능
CREATE POLICY "Enable all access for service role"
  ON designs
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service role"
  ON modules
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service role"
  ON payment_emails
  FOR ALL
  USING (auth.role() = 'service_role');

-- 관리자 테이블 정책 (모든 사용자가 읽기 가능)
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Templates are viewable by everyone" ON templates;
CREATE POLICY "Templates are viewable by everyone" ON templates
    FOR SELECT USING (true);

-- =====================================================
-- 8단계: 샘플 데이터 (선택사항)
-- =====================================================

INSERT INTO modules (name, category, description, figma_component_id, height, nodes) VALUES
  ('히어로 섹션', 'hero', '강렬한 첫인상을 주는 히어로 섹션', 'figma-hero-001', 800, '{"title": {"type": "text"}, "subtitle": {"type": "text"}, "image": {"type": "image"}}'::jsonb),
  ('특징 그리드', 'features', '3열 특징 그리드', 'figma-features-001', 600, '{"feature1": {"type": "text"}, "feature2": {"type": "text"}, "feature3": {"type": "text"}}'::jsonb),
  ('CTA 섹션', 'cta', '행동 유도 섹션', 'figma-cta-001', 400, '{"heading": {"type": "text"}, "button_text": {"type": "text"}}'::jsonb);

COMMENT ON TABLE designs IS '고객이 생성한 디자인 정보';
COMMENT ON TABLE modules IS '재사용 가능한 디자인 모듈';
COMMENT ON TABLE payment_emails IS 'Gmail에서 수신한 결제 확인 이메일';

-- =====================================================
-- 9단계: 완료 메시지
-- =====================================================

SELECT 'Complete schema with admin tables created successfully!' as status;
