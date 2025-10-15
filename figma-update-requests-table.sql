-- Figma 업데이트 요청 테이블 생성
CREATE TABLE public.figma_update_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    file_key text NOT NULL,
    node_id text NOT NULL,
    update_type text NOT NULL CHECK (update_type IN ('text', 'image')),
    content text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_figma_update_requests_user_id ON public.figma_update_requests(user_id);
CREATE INDEX idx_figma_update_requests_file_key ON public.figma_update_requests(file_key);
CREATE INDEX idx_figma_update_requests_status ON public.figma_update_requests(status);
CREATE INDEX idx_figma_update_requests_created_at ON public.figma_update_requests(created_at);

-- Row Level Security (RLS) 활성화
ALTER TABLE public.figma_update_requests ENABLE ROW LEVEL SECURITY;

-- 정책 생성
-- 사용자는 자신의 업데이트 요청만 볼 수 있음
CREATE POLICY "Users can view their own update requests" ON public.figma_update_requests
    FOR SELECT USING (auth.uid()::text = user_id);

-- 사용자는 자신의 업데이트 요청만 생성할 수 있음
CREATE POLICY "Users can create their own update requests" ON public.figma_update_requests
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 사용자는 자신의 업데이트 요청만 수정할 수 있음
CREATE POLICY "Users can update their own update requests" ON public.figma_update_requests
    FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- 사용자는 자신의 업데이트 요청만 삭제할 수 있음
CREATE POLICY "Users can delete their own update requests" ON public.figma_update_requests
    FOR DELETE USING (auth.uid()::text = user_id);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_figma_update_requests_updated_at 
    BEFORE UPDATE ON public.figma_update_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
