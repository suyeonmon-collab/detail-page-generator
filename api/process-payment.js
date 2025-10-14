const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { projectId, paymentMethod, amount } = req.body;

        // 필수 필드 검증
        if (!projectId || !paymentMethod || !amount) {
            return res.status(400).json({ 
                success: false, 
                error: '필수 필드가 누락되었습니다' 
            });
        }

        // Authorization 헤더에서 토큰 추출
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authorization token required' 
            });
        }

        const token = authHeader.split(' ')[1];
        
        // TODO: Clerk 토큰 검증 및 사용자 ID 추출
        // const clerkUser = await verifyClerkToken(token);
        // const userId = clerkUser.sub;

        // 프로젝트 존재 확인
        const { data: project, error: projectError } = await supabase
            .from('detail_requests')
            .select('*')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({ 
                success: false, 
                error: '프로젝트를 찾을 수 없습니다' 
            });
        }

        // 결제 처리 (실제로는 Stripe, PayPal 등 사용)
        const paymentResult = await processPayment({
            amount: amount,
            method: paymentMethod,
            projectId: projectId,
            customerEmail: project.customer_email
        });

        if (!paymentResult.success) {
            return res.status(400).json({ 
                success: false, 
                error: paymentResult.error 
            });
        }

        // 결제 성공 시 프로젝트 상태 업데이트
        const { error: updateError } = await supabase
            .from('detail_requests')
            .update({ 
                status: 'paid',
                payment_id: paymentResult.paymentId,
                payment_method: paymentMethod,
                payment_amount: amount,
                payment_date: new Date().toISOString()
            })
            .eq('id', projectId);

        if (updateError) {
            console.error('❌ 프로젝트 업데이트 실패:', updateError);
            // 결제는 성공했지만 DB 업데이트 실패 - 롤백 필요
        }

        // 결제 완료 이메일 발송
        await sendPaymentConfirmationEmail({
            email: project.customer_email,
            projectId: projectId,
            amount: amount,
            paymentId: paymentResult.paymentId
        });

        return res.status(200).json({
            success: true,
            paymentId: paymentResult.paymentId,
            message: '결제가 완료되었습니다',
            projectId: projectId
        });

    } catch (error) {
        console.error('❌ 결제 처리 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || '결제 처리 중 오류가 발생했습니다' 
        });
    }
};

// 결제 처리 함수 (실제 구현 필요)
async function processPayment({ amount, method, projectId, customerEmail }) {
    try {
        // 실제로는 Stripe, PayPal, 카카오페이 등과 연동
        // 지금은 시뮬레이션
        
        console.log(`💳 결제 처리: ${amount}원, 방법: ${method}, 프로젝트: ${projectId}`);
        
        // 결제 성공 시뮬레이션
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            success: true,
            paymentId: paymentId,
            transactionId: `txn_${Date.now()}`
        };
        
    } catch (error) {
        console.error('❌ 결제 처리 실패:', error);
        return {
            success: false,
            error: '결제 처리에 실패했습니다'
        };
    }
}

// 결제 완료 이메일 발송
async function sendPaymentConfirmationEmail({ email, projectId, amount, paymentId }) {
    try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const emailContent = `
            <h2>🎉 결제가 완료되었습니다!</h2>
            <p>안녕하세요! 신디야 디자인 자동 생성기입니다.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3>결제 정보</h3>
                <ul>
                    <li><strong>프로젝트 ID:</strong> ${projectId}</li>
                    <li><strong>결제 금액:</strong> ${amount.toLocaleString()}원</li>
                    <li><strong>결제 ID:</strong> ${paymentId}</li>
                    <li><strong>결제 일시:</strong> ${new Date().toLocaleString('ko-KR')}</li>
                </ul>
            </div>
            
            <p>이제 디자인 생성이 시작됩니다. 완료되면 이메일로 알려드리겠습니다.</p>
            <p>감사합니다! 🎨</p>
        `;

        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: email,
            subject: '🎉 결제 완료 - 신디야 디자인 자동 생성기',
            html: emailContent
        });

        console.log(`✅ 결제 완료 이메일 발송: ${email}`);
        
    } catch (error) {
        console.error('❌ 이메일 발송 실패:', error);
        // 이메일 발송 실패는 결제에 영향을 주지 않음
    }
}
