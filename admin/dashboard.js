// 로그인 체크
if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = '/admin/index.html';
}

// 전역 변수
let categories = [];
let templates = [];
let currentEditingCategoryIndex = null;
let currentEditingTemplateIndex = null;
let currentFigmaFileKey = null;
let currentTemplateId = null;

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 기존 메시지 리스너 정리 (Chrome Extension 오류 방지)
    window.removeEventListener('message', handlePluginMessage);
    
    loadData();
});

// 페이지 언로드 시 메시지 리스너 정리
window.addEventListener('beforeunload', () => {
    window.removeEventListener('message', handlePluginMessage);
});

// 데이터 로드
async function loadData() {
    showLoading();
    try {
        console.log('🔵 [Admin] 데이터 로드 시작');
        
        // Supabase API로 데이터 로드
        const response = await fetch('/api/admin/supabase-data', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || '데이터 로드 실패');
        }

        // Supabase 데이터를 관리자 페이지 형식으로 변환
        categories = (result.data.categories || []).map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            icon: cat.icon,
            color: cat.color,
            templates: cat.templates,
            created_at: cat.created_at,
            updated_at: cat.updated_at
        }));
        
        templates = (result.data.templates || []).map(template => ({
            templateId: template.template_id,
            categoryId: template.category_id,
            name: template.name,
            description: template.description,
            previewImage: template.preview_image,
            figmaUrl: template.figma_url,
            figmaNodeId: template.figma_node_id,
            figmaFileKey: template.figma_file_key,
            price: template.price,
            enabled: template.enabled,
            nodes: template.nodes,
            created_at: template.created_at,
            updated_at: template.updated_at
        }));

        console.log('✅ [Admin] 데이터 로드 성공');
        console.log(`📊 카테고리: ${categories.length}개, 템플릿: ${templates.length}개`);

        renderCategories();
        renderTemplates();
        populateCategorySelect();
        
    } catch (error) {
        console.error('❌ [Admin] 데이터 로드 실패:', error);
        showToast('데이터를 불러오는데 실패했습니다: ' + error.message, 'error');
        
        // Fallback: 기존 JSON 파일 로드
        console.log('🔄 [Admin] Fallback: JSON 파일 로드 시도');
        await loadDataFromJSON();
    } finally {
        hideLoading();
    }
}

// Fallback: JSON 파일에서 데이터 로드
async function loadDataFromJSON() {
    try {
        // categories.json 로드
        const categoriesResponse = await fetch('/data/categories.json');
        const categoriesData = await categoriesResponse.json();
        categories = categoriesData.categories || categoriesData;

        // templates.json 로드
        const templatesResponse = await fetch('/data/templates.json');
        const templatesData = await templatesResponse.json();
        templates = templatesData.templates || templatesData;

        renderCategories();
        renderTemplates();
        populateCategorySelect();
        
        console.log('✅ [Admin] JSON 파일 로드 성공');
    } catch (error) {
        console.error('❌ [Admin] JSON 파일 로드도 실패:', error);
        showToast('모든 데이터 로드 방법이 실패했습니다.', 'error');
    }
}

// ==================== 카테고리 관리 ====================

function renderCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    
    if (!categories || categories.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <div class="empty-state-text">카테고리가 없습니다</div>
                    <button class="btn-primary" onclick="openCategoryModal()">첫 카테고리 추가하기</button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = categories.map((cat, index) => `
        <tr>
            <td style="font-size: 24px;">${cat.icon || '📁'}</td>
            <td><code>${cat.id}</code></td>
            <td><strong>${cat.name}</strong></td>
            <td>${cat.description || ''}</td>
            <td>
                ${cat.enabled !== false 
                    ? '<span class="badge badge-success">활성</span>' 
                    : '<span class="badge badge-danger">비활성</span>'}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="editCategory(${index})" title="수정">✏️</button>
                    <button class="btn-icon" onclick="deleteCategory(${index})" title="삭제">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openCategoryModal(index = null) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const form = document.getElementById('categoryForm');
    
    form.reset();
    currentEditingCategoryIndex = index;
    
    if (index !== null) {
        title.textContent = '카테고리 수정';
        const cat = categories[index];
        document.getElementById('categoryIndex').value = index;
        document.getElementById('categoryId').value = cat.id;
        document.getElementById('categoryName').value = cat.name;
        document.getElementById('categoryDescription').value = cat.description || '';
        document.getElementById('categoryIcon').value = cat.icon || '';
        document.getElementById('categoryEnabled').checked = cat.enabled !== false;
    } else {
        title.textContent = '카테고리 추가';
    }
    
    modal.classList.add('show');
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    modal.classList.remove('show');
    currentEditingCategoryIndex = null;
}

function editCategory(index) {
    openCategoryModal(index);
}

async function deleteCategory(index) {
    const cat = categories[index];
    
    if (!confirm(`"${cat.name}" 카테고리를 정말 삭제하시겠습니까?\n\n⚠️ 이 카테고리에 속한 템플릿도 함께 삭제됩니다.`)) {
        return;
    }
    
    try {
        showLoading();
        console.log('🗑️ [Admin] 카테고리 삭제 시작:', cat.id);
        
        // Supabase에서 직접 삭제 (CASCADE로 템플릿도 자동 삭제)
        const response = await fetch('/api/templates', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'delete-category',
                categoryId: cat.id
            })
        });
        
        if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
        }
        
        // 로컬 데이터에서도 제거
        categories.splice(index, 1);
        templates = templates.filter(t => t.categoryId !== cat.id);
        
        renderCategories();
        renderTemplates();
        showToast('카테고리가 삭제되었습니다.', 'success');
        
        console.log('✅ [Admin] 카테고리 삭제 완료');
        
    } catch (error) {
        console.error('❌ [Admin] 카테고리 삭제 오류:', error);
        showToast('카테고리 삭제에 실패했습니다: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function saveCategory() {
    const id = document.getElementById('categoryId').value.trim();
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDescription').value.trim();
    const icon = document.getElementById('categoryIcon').value.trim();
    const enabled = document.getElementById('categoryEnabled').checked;
    
    if (!id || !name || !description) {
        alert('필수 항목을 모두 입력하세요.');
        return;
    }
    
    const categoryData = {
        id,
        name,
        description,
        icon: icon || '📁',
        enabled
    };
    
    if (currentEditingCategoryIndex !== null) {
        // 수정
        categories[currentEditingCategoryIndex] = categoryData;
    } else {
        // 추가
        // ID 중복 체크
        if (categories.some(c => c.id === id)) {
            alert('이미 존재하는 ID입니다.');
            return;
        }
        categories.push(categoryData);
    }
    
    await saveData();
    closeCategoryModal();
    renderCategories();
    populateCategorySelect();
    showToast(currentEditingCategoryIndex !== null ? '카테고리가 수정되었습니다.' : '카테고리가 추가되었습니다.', 'success');
}

// ==================== 템플릿 관리 ====================

// Figma URL에서 정보 추출
function extractFigmaInfo() {
    const figmaUrl = document.getElementById('templateFigmaUrl').value;
    const figmaInfo = document.getElementById('figmaInfo');
    const figmaPluginInfo = document.getElementById('figmaPluginInfo');
    
    console.log('🔍 [extractFigmaInfo] 함수 호출됨');
    console.log('🔍 [extractFigmaInfo] 입력된 URL:', figmaUrl);
    
    if (!figmaUrl) {
        console.log('⚠️ [extractFigmaInfo] URL이 비어있음');
        figmaInfo.style.display = 'none';
        figmaPluginInfo.style.display = 'none';
        return;
    }
    
    try {
        console.log('🔍 [extractFigmaInfo] URL 파싱 시작:', figmaUrl);
        
        // 간단하고 확실한 정규식 방식으로 파싱
        let fileId = '';
        let nodeId = '0-1';
        
        // Figma 파일 ID 추출 - 더 유연한 패턴
        const fileIdPatterns = [
            /\/file\/([a-zA-Z0-9]{20,25})/,  // /file/ID 형식
            /\/design\/([a-zA-Z0-9]{20,25})/, // /design/ID 형식
            /\/[a-zA-Z0-9]{20,25}/           // 직접 ID 형식
        ];
        
        console.log('🔍 [extractFigmaInfo] 파일 ID 패턴 테스트 시작');
        for (let i = 0; i < fileIdPatterns.length; i++) {
            const pattern = fileIdPatterns[i];
            console.log(`🔍 [extractFigmaInfo] 패턴 ${i + 1} 테스트:`, pattern);
            const match = figmaUrl.match(pattern);
            console.log(`🔍 [extractFigmaInfo] 패턴 ${i + 1} 매치 결과:`, match);
            
            if (match) {
                fileId = match[1] || match[0].substring(1); // 그룹이 있으면 그룹 사용, 없으면 전체에서 '/' 제거
                console.log('✅ [extractFigmaInfo] 파일 ID 추출 성공:', fileId);
                break;
            }
        }
        
        // Node ID 추출
        console.log('🔍 [extractFigmaInfo] Node ID 추출 시작');
        const nodeIdMatch = figmaUrl.match(/[?&]node-id=([0-9]+-[0-9]+)/);
        console.log('🔍 [extractFigmaInfo] Node ID 매치 결과:', nodeIdMatch);
        if (nodeIdMatch) {
            nodeId = nodeIdMatch[1];
            console.log('✅ [extractFigmaInfo] Node ID 추출 성공:', nodeId);
        }
        
        console.log('🔍 [extractFigmaInfo] 최종 추출 결과:', { fileId, nodeId });
        
        if (!fileId) {
            throw new Error('Figma 파일 ID를 찾을 수 없습니다. URL 형식을 확인해주세요.');
        }
        
        // 추출된 정보 표시
        document.getElementById('extractedFileId').textContent = fileId;
        document.getElementById('extractedNodeId').textContent = nodeId;
        
        figmaInfo.style.display = 'block';
        figmaPluginInfo.style.display = 'block';
        
        // 전역 변수에 저장
        currentFigmaFileKey = fileId;
        
        console.log('🎉 [extractFigmaInfo] 최종 결과:', { 
            fileId, 
            nodeId, 
            originalUrl: figmaUrl,
            success: true 
        });
        
    } catch (error) {
        console.error('❌ [extractFigmaInfo] Figma URL 파싱 오류:', error);
        console.error('❌ [extractFigmaInfo] 오류 스택:', error.stack);
        console.error('❌ [extractFigmaInfo] 입력된 URL:', figmaUrl);
        
        figmaInfo.style.display = 'none';
        figmaPluginInfo.style.display = 'none';
        
        // 사용자에게 친화적인 오류 메시지 표시
        const figmaPluginInfo = document.getElementById('figmaPluginInfo');
        if (figmaPluginInfo) {
            figmaPluginInfo.innerHTML = `
                <div class="info-item" style="color: #ef4444;">
                    <strong>오류:</strong> ${error.message}
                </div>
                <div class="info-item" style="font-size: 11px; color: #6b7280;">
                    입력된 URL: ${figmaUrl}
                </div>
                <div class="info-item" style="font-size: 11px; color: #6b7280;">
                    예: https://www.figma.com/design/5Ud17MlLvLtV8kT8zFdXiN/파일명?node-id=0-1
                </div>
                <div class="info-item" style="font-size: 11px; color: #6b7280;">
                    또는: https://www.figma.com/file/abc123/Design-Name?node-id=2-2
                </div>
            `;
            figmaPluginInfo.style.display = 'block';
        }
    }
}

// Figma 플러그인 실행
function openFigmaPlugin() {
    const figmaUrl = document.getElementById('templateFigmaUrl').value;
    
    if (!figmaUrl) {
        alert('먼저 Figma URL을 입력해주세요.');
        return;
    }
    
    try {
        // Figma URL을 플러그인 실행 URL로 변환
        const url = new URL(figmaUrl);
        const pathParts = url.pathname.split('/');
        const fileId = pathParts[pathParts.length - 1];
        
        // 플러그인 실행 URL 생성
        const pluginUrl = `https://www.figma.com/file/${fileId}?plugin=auto-sync-plugin`;
        
        console.log('🚀 [Admin] Figma 플러그인 실행:', pluginUrl);
        
        // 새 창에서 플러그인 실행
        const pluginWindow = window.open(pluginUrl, '_blank', 'width=1200,height=800');
        
        if (pluginWindow) {
            showToast('Figma 플러그인이 실행되었습니다. 템플릿을 설정한 후 저장해주세요.', 'info');
            
            // 기존 메시지 리스너 제거 후 새로 추가
            window.removeEventListener('message', handlePluginMessage);
            window.addEventListener('message', handlePluginMessage);
            
            // 5분 후 자동으로 리스너 제거 (메모리 누수 방지)
            setTimeout(() => {
                window.removeEventListener('message', handlePluginMessage);
            }, 300000);
        } else {
            alert('팝업이 차단되었습니다. 팝업을 허용하고 다시 시도해주세요.');
        }
        
    } catch (error) {
        console.error('❌ [Admin] Figma 플러그인 실행 오류:', error);
        alert('Figma 플러그인 실행 중 오류가 발생했습니다.');
    }
}

// 플러그인 메시지 처리
function handlePluginMessage(event) {
    try {
        // 안전한 origin 체크
        if (!event.origin || event.origin !== 'https://www.figma.com') {
            return;
        }
        
        // 안전한 데이터 체크
        if (!event.data || typeof event.data !== 'object') {
            return;
        }
        
        const message = event.data;
        
        if (message.type === 'template-saved' && message.payload) {
            console.log('✅ [Admin] 플러그인에서 템플릿 저장 완료:', message.payload);
            
            // 템플릿 정보를 폼에 자동으로 채우기
            const templateId = message.payload.templateId;
            const previewUrl = message.payload.previewUrl;
            
            if (templateId) {
                document.getElementById('templateId').value = templateId;
            }
            
            if (previewUrl) {
                const previewImageElement = document.getElementById('templatePreviewImage');
                if (previewImageElement) {
                    previewImageElement.value = previewUrl;
                }
            }
            
            showToast('템플릿이 성공적으로 생성되었습니다!', 'success');
            
            // 이벤트 리스너 제거
            window.removeEventListener('message', handlePluginMessage);
        }
    } catch (error) {
        console.error('❌ [Admin] 메시지 처리 오류:', error);
        // 오류 발생 시에도 리스너 제거
        window.removeEventListener('message', handlePluginMessage);
    }
}

function renderTemplates() {
    const tbody = document.getElementById('templatesTableBody');
    
    if (!templates || templates.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-state-icon">🎨</div>
                    <div class="empty-state-text">템플릿이 없습니다</div>
                    <button class="btn-primary" onclick="openTemplateModal()">첫 템플릿 추가하기</button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = templates.map((template, index) => {
        const category = categories.find(c => c.id === template.categoryId);
        const categoryName = category ? category.name : template.categoryId;
        
        return `
            <tr>
                <td>
                    <img src="${template.previewImage || 'https://via.placeholder.com/60'}" 
                         alt="${template.name}" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">
                </td>
                <td><code style="font-size: 11px;">${template.templateId}</code></td>
                <td><strong>${template.name}</strong></td>
                <td>${categoryName}</td>
                <td>${template.price ? template.price.toLocaleString() + '원' : '무료'}</td>
                <td>
                    ${template.enabled !== false 
                        ? '<span class="badge badge-success">활성</span>' 
                        : '<span class="badge badge-danger">비활성</span>'}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="editTemplate(${index})" title="수정">✏️</button>
                        <button class="btn-icon" onclick="deleteTemplate(${index})" title="삭제">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openTemplateModal(index = null) {
    const modal = document.getElementById('templateModal');
    const title = document.getElementById('templateModalTitle');
    const form = document.getElementById('templateForm');
    
    form.reset();
    currentEditingTemplateIndex = index;
    
    if (index !== null) {
        title.textContent = '템플릿 수정';
        const template = templates[index];
        document.getElementById('templateIndex').value = index;
        document.getElementById('templateId').value = template.templateId;
        document.getElementById('templateCategoryId').value = template.categoryId;
        document.getElementById('templateName').value = template.name;
        document.getElementById('templateDescription').value = template.description || '';
        document.getElementById('templateFigmaUrl').value = template.figmaUrl || '';
        document.getElementById('templatePrice').value = template.price || 0;
        document.getElementById('templateEnabled').checked = template.enabled !== false;
        
        // Figma 정보가 있으면 추출 표시
        if (template.figmaUrl) {
            extractFigmaInfo();
        }
    } else {
        title.textContent = '템플릿 추가';
        document.getElementById('templatePrice').value = 0;
    }
    
    modal.classList.add('show');
}

function closeTemplateModal() {
    const modal = document.getElementById('templateModal');
    modal.classList.remove('show');
    currentEditingTemplateIndex = null;
}

function editTemplate(index) {
    openTemplateModal(index);
}

async function deleteTemplate(index) {
    const template = templates[index];
    
    if (!confirm(`"${template.name}" 템플릿을 정말 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        showLoading();
        console.log('🗑️ [Admin] 템플릿 삭제 시작:', template.templateId);
        
        const response = await fetch('/api/templates', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'delete-template',
                templateId: template.templateId
            })
        });

        if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
        }

        // 로컬 데이터에서도 제거
        templates.splice(index, 1);
        renderTemplates();
        showToast('템플릿이 성공적으로 삭제되었습니다', 'success');
        
        console.log('✅ [Admin] 템플릿 삭제 완료');
        
    } catch (error) {
        console.error('❌ [Admin] 템플릿 삭제 오류:', error);
        showToast('템플릿 삭제에 실패했습니다: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 템플릿 ID 자동 생성
function generateTemplateId(name) {
    const timestamp = Date.now();
    const sanitizedName = name.toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    return `${sanitizedName}-${timestamp}`;
}

async function saveTemplate() {
    try {
        // 템플릿 ID 자동 생성 (새 템플릿인 경우)
        let templateId = document.getElementById('templateId').value.trim();
        if (!templateId || currentEditingTemplateIndex === null) {
            const name = document.getElementById('templateName').value.trim();
            if (name) {
                templateId = generateTemplateId(name);
                document.getElementById('templateId').value = templateId;
            }
        }
        const categoryId = document.getElementById('templateCategoryId').value;
        const name = document.getElementById('templateName').value.trim();
        const description = document.getElementById('templateDescription').value.trim();
        const figmaUrl = document.getElementById('templateFigmaUrl').value.trim();
        const price = parseInt(document.getElementById('templatePrice').value) || 0;
        const enabled = document.getElementById('templateEnabled').checked;

        // 필수 필드 검증
        if (!templateId || !categoryId || !name) {
            showToast('필수 필드를 모두 입력해주세요', 'error');
            return;
        }

        // 피그마 URL이 있으면 플러그인 연동 방식 사용
        if (figmaUrl && currentFigmaFileKey) {
            showToast('피그마 플러그인을 통해 템플릿을 등록해주세요', 'info');
            return;
        }

        // 수정 모드인지 확인
        if (currentEditingTemplateIndex !== null) {
            // 기존 템플릿 업데이트
            const existingTemplate = templates[currentEditingTemplateIndex];
            
            const updateData = {
                category_id: categoryId,
                name: name,
                description: description,
                figma_url: figmaUrl,
                price: price,
                enabled: enabled
            };

            const response = await fetch(`/api/update-template/${existingTemplate.templateId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '템플릿 업데이트에 실패했습니다');
            }

            showToast('템플릿이 성공적으로 업데이트되었습니다', 'success');
        } else {
            // 새 템플릿 저장
            const templateData = {
                template_id: templateId,
                category_id: categoryId,
                name: name,
                description: description,
                figma_url: figmaUrl,
                price: price,
                enabled: enabled
            };

            const response = await fetch('/api/save-template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(templateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '템플릿 저장에 실패했습니다');
            }

            showToast('템플릿이 성공적으로 저장되었습니다', 'success');
        }

        closeTemplateModal();
        await loadData(); // 데이터 새로고침

    } catch (error) {
        console.error('❌ [Admin] 템플릿 저장 오류:', error);
        showToast('템플릿 저장에 실패했습니다: ' + error.message, 'error');
    }
}

// Supabase 권한 정책 수정 함수
async function fixSupabasePermissions() {
    if (!confirm('Supabase 권한 정책을 수정하시겠습니까?\n\n이 작업은 템플릿 수정/삭제 기능을 활성화합니다.')) {
        return;
    }

    try {
        showToast('Supabase 권한 정책을 수정하는 중...', 'info');

        const response = await fetch('/api/fix-supabase-permissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '권한 정책 수정에 실패했습니다');
        }

        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Supabase 권한 정책이 성공적으로 수정되었습니다!', 'success');
            
            // 3초 후 데이터 새로고침
            setTimeout(async () => {
                await loadData();
            }, 3000);
        } else {
            throw new Error(result.error || '권한 정책 수정에 실패했습니다');
        }

    } catch (error) {
        console.error('❌ [Admin] 권한 정책 수정 오류:', error);
        showToast('권한 정책 수정에 실패했습니다: ' + error.message, 'error');
    }
}

function populateCategorySelect() {
    const select = document.getElementById('templateCategoryId');
    select.innerHTML = categories.map(cat => 
        `<option value="${cat.id}">${cat.name}</option>`
    ).join('');
}

// ==================== 데이터 저장 ====================

async function saveData() {
    showLoading();
    
    try {
        console.log('🔵 [Admin] 데이터 저장 시작');
        
        // Supabase 형식으로 데이터 변환
        const supabaseCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            icon: cat.icon,
            color: cat.color,
            templates: cat.templates,
            // 기존 데이터가 있으면 유지, 없으면 현재 시간 사용
            created_at: cat.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
        
        const supabaseTemplates = templates.map(template => ({
            template_id: template.templateId,
            category_id: template.categoryId,
            name: template.name,
            description: template.description,
            preview_image: template.previewImage,
            figma_url: template.figmaUrl,
            figma_node_id: template.figmaNodeId,
            figma_file_key: template.figmaFileKey,
            price: template.price,
            enabled: template.enabled,
            nodes: template.nodes,
            // 기존 데이터가 있으면 유지, 없으면 현재 시간 사용
            created_at: template.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
        
        console.log('🔵 [Admin] 변환된 데이터:', {
            categories: supabaseCategories.length,
            templates: supabaseTemplates.length
        });
        
        // Supabase API로 저장
        const response = await fetch('/api/admin/supabase-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                categories: supabaseCategories,
                templates: supabaseTemplates
            })
        });
        
        if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || '저장 실패');
        }
        
        console.log('✅ [Admin] Supabase 저장 성공:', result);
        showToast('✅ 데이터가 Supabase에 성공적으로 저장되었습니다!', 'success');
        
    } catch (error) {
        console.error('❌ [Admin] Supabase 저장 실패:', error);
        showToast('❌ Supabase 저장 실패: ' + error.message, 'error');
        
        // Fallback: 기존 파일 저장 API 시도
        console.log('🔄 [Admin] Fallback: 파일 저장 API 시도');
        await saveDataToFile();
    } finally {
        hideLoading();
    }
}

// Fallback: 기존 파일 저장 API 사용
async function saveDataToFile() {
    try {
        const response = await fetch('/api/admin/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                categories,
                templates
            })
        });
        
        if (!response.ok) {
            throw new Error('파일 저장 API 오류');
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || '파일 저장 실패');
        }
        
        console.log('✅ [Admin] 파일 저장 성공:', result);
        
        if (result.warning) {
            showToast('⚠️ ' + result.warning, 'error');
        } else {
            showToast('✅ 데이터가 파일에 저장되었습니다!', 'success');
        }
        
    } catch (error) {
        console.error('❌ [Admin] 파일 저장도 실패:', error);
        showToast('❌ 모든 저장 방법이 실패했습니다: ' + error.message, 'error');
    }
}

// ==================== UI 유틸리티 ====================

function showSection(section) {
    // 모든 섹션 숨기기
    document.getElementById('categoriesSection').style.display = 'none';
    document.getElementById('templatesSection').style.display = 'none';
    
    // 모든 네비게이션 비활성화
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    
    // 선택한 섹션 표시
    if (section === 'categories') {
        document.getElementById('categoriesSection').style.display = 'block';
        document.querySelector('.sidebar-nav a[href="#categories"]').classList.add('active');
    } else if (section === 'templates') {
        document.getElementById('templatesSection').style.display = 'block';
        document.querySelector('.sidebar-nav a[href="#templates"]').classList.add('active');
    }
    
    // URL 업데이트 (페이지 새로고침 없이)
    window.history.pushState({}, '', `#${section}`);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function logout() {
    if (confirm('로그아웃하시겠습니까?')) {
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminLoginTime');
        window.location.href = '/admin/index.html';
    }
}

// 네비게이션 클릭 이벤트
document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('href').substring(1);
        showSection(section);
    });
});

// 모달 외부 클릭시 닫기
document.getElementById('categoryModal').addEventListener('click', (e) => {
    if (e.target.id === 'categoryModal') {
        closeCategoryModal();
    }
});

document.getElementById('templateModal').addEventListener('click', (e) => {
    if (e.target.id === 'templateModal') {
        closeTemplateModal();
    }
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCategoryModal();
        closeTemplateModal();
    }
});

// URL 해시에 따라 섹션 표시
window.addEventListener('load', () => {
    const hash = window.location.hash.substring(1);
    if (hash === 'templates') {
        showSection('templates');
    }
});

// Figma URL에서 파일 ID와 Node ID 추출
function extractFigmaInfo() {
    const figmaUrl = document.getElementById('templateFigmaUrl').value.trim();
    const figmaInfo = document.getElementById('figmaInfo');
    const extractedFileId = document.getElementById('extractedFileId');
    const extractedNodeId = document.getElementById('extractedNodeId');
    
    if (!figmaUrl) {
        figmaInfo.style.display = 'none';
        return;
    }
    
    try {
        // 파일 ID 추출 (design/ 뒤의 문자열)
        const fileIdMatch = figmaUrl.match(/design\/([a-zA-Z0-9]+)/);
        const fileId = fileIdMatch ? fileIdMatch[1] : null;
        
        // Node ID 추출 (node-id= 파라미터)
        const nodeIdMatch = figmaUrl.match(/node-id=([^&]+)/);
        const nodeId = nodeIdMatch ? nodeIdMatch[1] : null;
        
        if (fileId && nodeId) {
            extractedFileId.textContent = fileId;
            extractedNodeId.textContent = nodeId;
            figmaInfo.style.display = 'block';
            
            // 성공 메시지
            showToast('✅ Figma 정보가 성공적으로 추출되었습니다!', 'success');
        } else {
            extractedFileId.textContent = '추출 실패';
            extractedNodeId.textContent = '추출 실패';
            figmaInfo.style.display = 'block';
            
            // 경고 메시지
            showToast('⚠️ Figma URL 형식을 확인해주세요. (design/파일ID?node-id=노드ID)', 'error');
        }
    } catch (error) {
        console.error('Figma 정보 추출 오류:', error);
        showToast('❌ Figma URL을 확인해주세요.', 'error');
    }
}

// Toast 메시지 표시 (간단한 버전)
function showToast(message, type = 'info') {
    // 기존 toast 제거
    const existingToast = document.querySelector('.admin-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
    `;

    document.body.appendChild(toast);

    // 3초 후 자동 제거
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// ============================================
// 피그마 플러그인 연동 기능
// ============================================

// 피그마 정보 추출 (기존 함수 수정)
function extractFigmaInfo() {
    const figmaUrl = document.getElementById('templateFigmaUrl').value;
    
    if (!figmaUrl) {
        document.getElementById('figmaInfo').style.display = 'none';
        document.getElementById('figmaPluginInfo').style.display = 'none';
        return;
    }

    // 피그마 URL에서 파일 키와 노드 ID 추출
    const fileKeyMatch = figmaUrl.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    const nodeIdMatch = figmaUrl.match(/node-id=([^&]+)/);
    
    if (fileKeyMatch) {
        currentFigmaFileKey = fileKeyMatch[1];
        document.getElementById('extractedFileId').textContent = currentFigmaFileKey;
        
        if (nodeIdMatch) {
            document.getElementById('extractedNodeId').textContent = nodeIdMatch[1];
        } else {
            document.getElementById('extractedNodeId').textContent = '전체 페이지';
        }
        
        document.getElementById('figmaInfo').style.display = 'block';
        document.getElementById('figmaPluginInfo').style.display = 'block';
        
        // 플러그인 상태 초기화
        updatePluginStatus('설정 대기 중', '#f59e0b');
    } else {
        document.getElementById('figmaInfo').style.display = 'none';
        document.getElementById('figmaPluginInfo').style.display = 'none';
        showToast('유효하지 않은 피그마 URL입니다', 'error');
    }
}

// 피그마 플러그인 실행
async function openFigmaPlugin() {
    try {
        const figmaUrl = document.getElementById('templateFigmaUrl').value;
        const templateName = document.getElementById('templateName').value;
        const categoryId = document.getElementById('templateCategoryId').value;
        
        if (!figmaUrl || !templateName || !categoryId) {
            showToast('템플릿 정보를 모두 입력해주세요', 'error');
            return;
        }

        if (!currentFigmaFileKey) {
            showToast('유효한 피그마 URL을 입력해주세요', 'error');
            return;
        }

        updatePluginStatus('템플릿 등록 중...', '#3b82f6');

        // 먼저 템플릿을 데이터베이스에 등록
        const templateData = {
            figma_url: figmaUrl,
            template_name: templateName,
            category_id: categoryId,
            description: document.getElementById('templateDescription').value || '',
            price: parseInt(document.getElementById('templatePrice').value) || 0
        };

        const response = await fetch('/api/register-figma-template', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(templateData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '템플릿 등록에 실패했습니다');
        }

        const result = await response.json();
        currentTemplateId = result.template.template_id;

        updatePluginStatus('플러그인 실행 중...', '#3b82f6');

        // 피그마 플러그인 실행 URL 생성
        const pluginUrl = `https://figma.com/file/${currentFigmaFileKey}?plugin=template-web-editor-admin&template=${currentTemplateId}`;
        
        // 새 창에서 피그마 플러그인 실행
        const figmaWindow = window.open(pluginUrl, '_blank', 'width=1200,height=800');
        
        if (!figmaWindow) {
            throw new Error('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
        }

        updatePluginStatus('플러그인 실행됨', '#10b981');
        
        // 플러그인 완료 상태 확인을 위한 폴링 시작
        startPluginStatusPolling();

        showToast('피그마 플러그인이 실행되었습니다. 플러그인에서 템플릿 설정을 완료해주세요.', 'success');

    } catch (error) {
        console.error('❌ [Admin] 피그마 플러그인 실행 오류:', error);
        updatePluginStatus('실행 실패', '#ef4444');
        showToast('피그마 플러그인 실행에 실패했습니다: ' + error.message, 'error');
    }
}

// 플러그인 상태 업데이트
function updatePluginStatus(status, color) {
    const statusElement = document.getElementById('pluginStatus');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.style.color = color;
    }
}

// 플러그인 상태 폴링
function startPluginStatusPolling() {
    if (!currentTemplateId) return;

    const pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/templates/${currentTemplateId}`);
            
            if (response.ok) {
                const result = await response.json();
                const template = result.template;
                
                // 노드 데이터가 있으면 플러그인 설정이 완료된 것으로 간주
                if (template.nodes && Object.keys(template.nodes).length > 0) {
                    updatePluginStatus('설정 완료', '#10b981');
                    showToast('템플릿 설정이 완료되었습니다!', 'success');
                    clearInterval(pollInterval);
                    
                    // 템플릿 목록 새로고침
                    await loadData();
                }
            }
        } catch (error) {
            console.warn('플러그인 상태 확인 오류:', error);
        }
    }, 5000); // 5초마다 확인

    // 5분 후 폴링 중지
    setTimeout(() => {
        clearInterval(pollInterval);
        if (document.getElementById('pluginStatus').textContent === '플러그인 실행됨') {
            updatePluginStatus('시간 초과', '#f59e0b');
        }
    }, 300000);
}

// 템플릿 저장 함수 수정 (피그마 연동 고려)
async function saveTemplate() {
    try {
        const templateId = document.getElementById('templateId').value;
        const categoryId = document.getElementById('templateCategoryId').value;
        const name = document.getElementById('templateName').value;
        const description = document.getElementById('templateDescription').value;
        const figmaUrl = document.getElementById('templateFigmaUrl').value;
        const price = parseInt(document.getElementById('templatePrice').value) || 0;
        const enabled = document.getElementById('templateEnabled').checked;

        // 필수 필드 검증
        if (!templateId || !categoryId || !name) {
            showToast('필수 필드를 모두 입력해주세요', 'error');
            return;
        }

        // 피그마 URL이 있으면 플러그인 연동 방식 사용
        if (figmaUrl && currentFigmaFileKey) {
            showToast('피그마 플러그인을 통해 템플릿을 등록해주세요', 'info');
            return;
        }

        // 기존 방식으로 템플릿 저장
        const templateData = {
            template_id: templateId,
            category_id: categoryId,
            name: name,
            description: description,
            figma_url: figmaUrl,
            price: price,
            enabled: enabled
        };

        const response = await fetch('/api/save-template', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(templateData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '템플릿 저장에 실패했습니다');
        }

        showToast('템플릿이 성공적으로 저장되었습니다', 'success');
        closeTemplateModal();
        await loadData();

    } catch (error) {
        console.error('❌ [Admin] 템플릿 저장 오류:', error);
        showToast('템플릿 저장에 실패했습니다: ' + error.message, 'error');
    }
}

// Supabase 권한 정책 수정 함수
async function fixSupabasePermissions() {
    if (!confirm('Supabase 권한 정책을 수정하시겠습니까?\n\n이 작업은 템플릿 수정/삭제 기능을 활성화합니다.')) {
        return;
    }

    try {
        showToast('Supabase 권한 정책을 수정하는 중...', 'info');

        const response = await fetch('/api/fix-supabase-permissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '권한 정책 수정에 실패했습니다');
        }

        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Supabase 권한 정책이 성공적으로 수정되었습니다!', 'success');
            
            // 3초 후 데이터 새로고침
            setTimeout(async () => {
                await loadData();
            }, 3000);
        } else {
            throw new Error(result.error || '권한 정책 수정에 실패했습니다');
        }

    } catch (error) {
        console.error('❌ [Admin] 권한 정책 수정 오류:', error);
        showToast('권한 정책 수정에 실패했습니다: ' + error.message, 'error');
    }
}

