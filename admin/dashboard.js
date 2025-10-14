// 로그인 체크
if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = '/admin/index.html';
}

// 전역 변수
let categories = [];
let templates = [];
let currentEditingCategoryIndex = null;
let currentEditingTemplateIndex = null;

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

// 데이터 로드
async function loadData() {
    showLoading();
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
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        showToast('데이터를 불러오는데 실패했습니다.', 'error');
    } finally {
        hideLoading();
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
    
    categories.splice(index, 1);
    
    // 해당 카테고리의 템플릿도 삭제
    templates = templates.filter(t => t.categoryId !== cat.id);
    
    await saveData();
    renderCategories();
    renderTemplates();
    showToast('카테고리가 삭제되었습니다.', 'success');
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
        document.getElementById('templatePreviewImage').value = template.previewImage || '';
        document.getElementById('templateFigmaUrl').value = template.figmaUrl || '';
        document.getElementById('templateFigmaNodeId').value = template.figmaNodeId || '';
        document.getElementById('templateFigmaFileKey').value = template.figmaFileKey || template.figmaTemplateId || '';
        document.getElementById('templatePrice').value = template.price || 0;
        document.getElementById('templateCafe24Link').value = template.cafe24PaymentLink || '';
        document.getElementById('templateEnabled').checked = template.enabled !== false;
    } else {
        title.textContent = '템플릿 추가';
        document.getElementById('templatePrice').value = 0;
        document.getElementById('templateFigmaFileKey').value = 'TEST';
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
    
    templates.splice(index, 1);
    
    await saveData();
    renderTemplates();
    showToast('템플릿이 삭제되었습니다.', 'success');
}

async function saveTemplate() {
    const templateId = document.getElementById('templateId').value.trim();
    const categoryId = document.getElementById('templateCategoryId').value;
    const name = document.getElementById('templateName').value.trim();
    const description = document.getElementById('templateDescription').value.trim();
    const previewImage = document.getElementById('templatePreviewImage').value.trim();
    const figmaUrl = document.getElementById('templateFigmaUrl').value.trim();
    const figmaNodeId = document.getElementById('templateFigmaNodeId').value.trim();
    const figmaFileKey = document.getElementById('templateFigmaFileKey').value.trim();
    const price = parseInt(document.getElementById('templatePrice').value) || 0;
    const cafe24Link = document.getElementById('templateCafe24Link').value.trim();
    const enabled = document.getElementById('templateEnabled').checked;
    
    if (!templateId || !categoryId || !name) {
        alert('필수 항목을 모두 입력하세요.');
        return;
    }
    
    const templateData = {
        templateId,
        categoryId,
        name,
        description,
        previewImage: previewImage || `https://via.placeholder.com/400x500/667eea/ffffff?text=${encodeURIComponent(name)}`,
        figmaUrl,
        figmaNodeId,
        figmaFileKey: figmaFileKey || 'TEST',
        price,
        cafe24PaymentLink: cafe24Link,
        enabled,
        nodes: [
            { id: 'title', type: 'text', placeholder: '제목', maxLength: 50 },
            { id: 'image', type: 'image', placeholder: '이미지' }
        ]
    };
    
    if (currentEditingTemplateIndex !== null) {
        // 수정 - 기존 nodes 유지
        const existingTemplate = templates[currentEditingTemplateIndex];
        templateData.nodes = existingTemplate.nodes || templateData.nodes;
        templates[currentEditingTemplateIndex] = templateData;
    } else {
        // 추가
        // ID 중복 체크
        if (templates.some(t => t.templateId === templateId)) {
            alert('이미 존재하는 템플릿 ID입니다.');
            return;
        }
        templates.push(templateData);
    }
    
    await saveData();
    closeTemplateModal();
    renderTemplates();
    showToast(currentEditingTemplateIndex !== null ? '템플릿이 수정되었습니다.' : '템플릿이 추가되었습니다.', 'success');
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
        // API로 저장
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
            throw new Error('저장 실패');
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || '저장 실패');
        }
        
        console.log('데이터 저장 성공');
    } catch (error) {
        console.error('저장 오류:', error);
        showToast('저장에 실패했습니다: ' + error.message, 'error');
    } finally {
        hideLoading();
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

