-- =====================================================
-- 신디야 디자인 자동 생성기 - Supabase 데이터베이스 스키마
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

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_designs_email ON designs(customer_email);
CREATE INDEX IF NOT EXISTS idx_designs_status ON designs(payment_status);
CREATE INDEX IF NOT EXISTS idx_designs_created ON designs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_emails_gmail_id ON payment_emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_payment_emails_processed ON payment_emails(processed);

-- 5. 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 트리거 생성
CREATE TRIGGER update_designs_updated_at 
  BEFORE UPDATE ON designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at 
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS (Row Level Security) 정책
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_emails ENABLE ROW LEVEL SECURITY;

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

-- 8. 샘플 데이터 (선택사항)
INSERT INTO modules (name, category, description, figma_component_id, height, nodes) VALUES
  ('히어로 섹션', 'hero', '강렬한 첫인상을 주는 히어로 섹션', 'figma-hero-001', 800, '{"title": {"type": "text"}, "subtitle": {"type": "text"}, "image": {"type": "image"}}'::jsonb),
  ('특징 그리드', 'features', '3열 특징 그리드', 'figma-features-001', 600, '{"feature1": {"type": "text"}, "feature2": {"type": "text"}, "feature3": {"type": "text"}}'::jsonb),
  ('CTA 섹션', 'cta', '행동 유도 섹션', 'figma-cta-001', 400, '{"heading": {"type": "text"}, "button_text": {"type": "text"}}'::jsonb);

COMMENT ON TABLE designs IS '고객이 생성한 디자인 정보';
COMMENT ON TABLE modules IS '재사용 가능한 디자인 모듈';
COMMENT ON TABLE payment_emails IS 'Gmail에서 수신한 결제 확인 이메일';


