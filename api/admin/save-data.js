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

        // 개발 환경에서는 로컬 파일에 저장
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

            console.log('✅ 개발 환경: 데이터 저장 완료');
            
            return res.status(200).json({ 
                success: true, 
                message: '데이터가 저장되었습니다.' 
            });
        } else {
            // 프로덕션 환경에서는 GitHub API를 통해 저장
            console.log('🚀 프로덕션 환경: GitHub API를 통한 저장 시도');
            
            try {
                // GitHub API를 사용하여 파일 업데이트
                const githubToken = process.env.GITHUB_TOKEN;
                
                if (!githubToken) {
                    console.log('⚠️ GITHUB_TOKEN이 설정되지 않음. 로컬 저장으로 대체');
                    
                    // 임시로 로컬에 저장 (Vercel에서는 읽기 전용이므로 실제로는 저장되지 않음)
                    return res.status(200).json({ 
                        success: true, 
                        message: '프로덕션 환경입니다. 관리자에게 문의하세요.',
                        warning: '실제 파일 저장을 위해서는 GitHub Desktop을 사용하거나 수동으로 파일을 수정해야 합니다.'
                    });
                }

                // GitHub API 호출 (향후 구현)
                // const result = await updateGitHubFiles(categories, templates);
                
                return res.status(200).json({ 
                    success: true, 
                    message: '프로덕션 환경입니다. 관리자에게 문의하세요.',
                    data: { categories, templates }
                });
                
            } catch (githubError) {
                console.error('❌ GitHub API 오류:', githubError);
                
                return res.status(200).json({ 
                    success: true, 
                    message: '프로덕션 환경입니다. 관리자에게 문의하세요.',
                    warning: 'GitHub API 연결 실패. 수동으로 파일을 수정해야 합니다.',
                    data: { categories, templates }
                });
            }
        }
    } catch (error) {
        console.error('❌ 데이터 저장 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || '데이터 저장 중 오류가 발생했습니다.' 
        });
    }
}

