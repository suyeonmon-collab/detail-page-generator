const fs = require('fs').promises;
const path = require('path');

module.exports = async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { categories, templates } = req.body;

        if (!categories || !templates) {
            return res.status(400).json({ 
                success: false, 
                error: 'categories와 templates가 필요합니다.' 
            });
        }

        // Vercel에서는 파일 시스템에 쓰기가 불가능하므로,
        // 개발 환경에서만 작동하도록 합니다.
        if (process.env.NODE_ENV === 'development') {
            const dataDir = path.join(process.cwd(), 'data');
            
            // categories.json 저장
            await fs.writeFile(
                path.join(dataDir, 'categories.json'),
                JSON.stringify({ categories }, null, 2),
                'utf-8'
            );

            // templates.json 저장
            await fs.writeFile(
                path.join(dataDir, 'templates.json'),
                JSON.stringify({ templates }, null, 2),
                'utf-8'
            );

            console.log('✅ 데이터 저장 완료');
            
            return res.status(200).json({ 
                success: true, 
                message: '데이터가 저장되었습니다.' 
            });
        } else {
            // 프로덕션 환경에서는 데이터를 반환만 하고
            // 실제 저장은 GitHub를 통해 수동으로 관리
            console.log('⚠️ 프로덕션 환경에서는 파일 저장이 불가능합니다.');
            console.log('📋 변경된 데이터:');
            console.log('categories:', JSON.stringify(categories, null, 2));
            console.log('templates:', JSON.stringify(templates, null, 2));
            
            return res.status(200).json({ 
                success: true, 
                message: '프로덕션 환경입니다. 데이터를 콘솔에서 확인하세요.',
                data: { categories, templates }
            });
        }
    } catch (error) {
        console.error('❌ 데이터 저장 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || '데이터 저장 중 오류가 발생했습니다.' 
        });
    }
}

