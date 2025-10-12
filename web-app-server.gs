/**
 * 웹사이트 기반 상세페이지 자동 생성 시스템
 * Google Apps Script 웹앱 서버
 */

// ============================================
// 1. 웹앱 진입점 (doPost)
// ============================================
function doPost(e) {
  try {
    // CORS 헤더 설정
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
    let formData;
    
    // JSON 데이터인지 확인
    if (e.postData && e.postData.type === 'application/json') {
      try {
        const jsonData = JSON.parse(e.postData.contents);
        
        // 디자인 요청인지 확인
        if (jsonData.action === 'requestDesign') {
          const result = handleDesignRequest(jsonData);
          return output.setContent(JSON.stringify(result));
        }
        
        // 상태 확인 요청인지 확인
        if (jsonData.action === 'checkStatus') {
          const result = checkDesignStatus(jsonData.row, jsonData.sessionId);
          return output.setContent(JSON.stringify(result));
        }
        
        // 기타 JSON 요청은 폼 데이터로 변환
        formData = jsonData;
      } catch (parseError) {
        return output.setContent(JSON.stringify({
          success: false,
          error: 'JSON 데이터 파싱 실패'
        }));
      }
    } else {
      // 기존 폼 데이터 파싱
      formData = parseFormData(e);
    }
    
    if (!formData) {
      return output.setContent(JSON.stringify({
        success: false,
        error: '폼 데이터를 파싱할 수 없습니다.'
      }));
    }
    
    // 필수 필드 검증
    const validation = validateFormData(formData);
    if (!validation.valid) {
      return output.setContent(JSON.stringify({
        success: false,
        error: validation.error
      }));
    }
    
    // 상세페이지 생성 프로세스 시작
    const result = processWebRequest(formData);
    
    return output.setContent(JSON.stringify(result));
    
  } catch (error) {
    Logger.log(`WebApp Error: ${error.message}`);
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    return output.setContent(JSON.stringify({
      success: false,
      error: `서버 오류: ${error.message}`
    }));
  }
}

// ============================================
// 1-1. 웹앱 진입점 (doGet) - 피그마 플러그인용
// ============================================
function doGet(e) {
  try {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
    const action = e.parameter.action;
    
    if (action === 'getPendingDesigns') {
      return getPendingDesignsForPlugin();
    }
    
    return output.setContent(JSON.stringify({
      success: false,
      error: '지원하지 않는 액션입니다.'
    }));
    
  } catch (error) {
    Logger.log(`doGet Error: ${error.message}`);
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    return output.setContent(JSON.stringify({
      success: false,
      error: `서버 오류: ${error.message}`
    }));
  }
}

// ============================================
// 2. 폼 데이터 파싱
// ============================================
function parseFormData(e) {
  try {
    const formData = {};
    
    // 일반 텍스트 필드들
    const textFields = ['productName', 'productDescription', 'targetAudience', 'productCategory', 'template', 'customerEmail'];
    
    textFields.forEach(field => {
      if (e.parameter[field]) {
        formData[field] = e.parameter[field];
      }
    });
    
    // 이미지 파일 처리
    if (e.parameter.productImage) {
      formData.productImage = e.parameter.productImage;
    }
    
    return formData;
  } catch (error) {
    Logger.log(`Form parsing error: ${error.message}`);
    return null;
  }
}

// ============================================
// 3. 폼 데이터 검증
// ============================================
function validateFormData(formData) {
  const requiredFields = ['productName', 'productDescription', 'customerEmail'];
  
  for (const field of requiredFields) {
    if (!formData[field] || formData[field].trim() === '') {
      return {
        valid: false,
        error: `${field} 필드는 필수입니다.`
      };
    }
  }
  
  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.customerEmail)) {
    return {
      valid: false,
      error: '올바른 이메일 주소를 입력해주세요.'
    };
  }
  
  return { valid: true };
}

// ============================================
// 4. 웹 요청 처리 (메인 로직)
// ============================================
function processWebRequest(formData) {
  try {
    // 상태 시트에 새 요청 추가
    const requestId = addRequestToSheet(formData);
    
    // AI 콘텐츠 생성
    const aiContent = generateAIContent(
      formData.productName, 
      formData.productDescription,
      formData.targetAudience,
      formData.productCategory
    );
    
    if (!aiContent) {
      throw new Error('AI 콘텐츠 생성에 실패했습니다.');
    }
    
    // 시트 업데이트 (AI 생성 완료 상태로)
    updateSheetWithAIContent(requestId, aiContent);
    
    // AI 미리보기 응답 반환 (디자인 생성은 나중에)
    return {
      success: true,
      sessionId: requestId,
      rowNumber: getRowNumberByRequestId(requestId),
      aiContent: aiContent,
      message: 'AI 콘텐츠가 생성되었습니다. 미리보기를 확인하고 수정하세요.'
    };
    
  } catch (error) {
    Logger.log(`Process error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// 5. 시트에 새 요청 추가
// ============================================
function addRequestToSheet(formData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const timestamp = new Date();
  const requestId = Utilities.getUuid();
  
  // 새 행 추가
  const newRow = [
    timestamp,                    // A열: 타임스탬프
    formData.customerEmail,       // B열: 고객 이메일
    formData.productName,         // C열: 상품명
    formData.productDescription,  // D열: 상품 설명
    '',                           // E열: AI 생성글 (나중에 채움)
    '',                           // F열: 고객 수정글
    '',                           // G열: Figma 링크
    '',                           // H열: PNG 링크
    '처리중'                      // I열: 상태
  ];
  
  sheet.appendRow(newRow);
  
  // 요청 ID를 J열에 저장 (추가 컬럼)
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 10).setValue(requestId);
  
  return requestId;
}

// ============================================
// 6. AI 콘텐츠 생성 (개선된 버전)
// ============================================
function generateAIContent(productName, description, targetAudience, category) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다.');
  }
  
  const prompt = `
당신은 전문 쇼핑몰 상세페이지 카피라이터입니다.
다음 상품에 대한 매력적인 상세 설명을 작성해주세요.

상품명: ${productName}
상품 설명: ${description}
타겟 고객층: ${targetAudience}
카테고리: ${category}

요구사항:
1. 고객의 고민/문제점 제시 (2-3줄)
2. 이 제품이 해결책인 이유 (3-4줄)
3. 주요 특징/장점 3가지 (각 2줄)
4. 사용 방법/활용 팁 (2-3줄)
5. 구매 결정을 돕는 마무리 멘트 (1-2줄)

톤앤매너:
- 친근하고 공감 가는 말투
- 과장 없이 진정성 있게
- ${targetAudience} 타겟에 맞는 언어
- 전체 500-800자

형식:
명확한 단락 구분 (줄바꿈 2번)
이모지 적절히 활용
`;

  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: '당신은 전문 쇼핑몰 카피라이터입니다. 감성적이고 구매 전환율이 높은 상세페이지 설명을 작성합니다.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1500
  };
  
  const options = {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseText = response.getContentText();
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP ${response.getResponseCode()}: ${responseText}`);
    }
    
    const result = JSON.parse(responseText);
    
    if (result.error) {
      throw new Error(`OpenAI API Error: ${result.error.message}`);
    }
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('OpenAI API 응답 형식이 올바르지 않습니다.');
    }
    
    return result.choices[0].message.content.trim();
    
  } catch (error) {
    Logger.log(`OpenAI API Error: ${error.message}`);
    throw new Error(`AI 생성 실패: ${error.message}`);
  }
}

// ============================================
// 7. 시트에 AI 콘텐츠 업데이트
// ============================================
function updateSheetWithAIContent(requestId, aiContent) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // 요청 ID로 행 찾기
  for (let i = 1; i < data.length; i++) {
    if (data[i][9] === requestId) { // J열 (10번째 컬럼)
      sheet.getRange(i + 1, 5).setValue(aiContent); // E열에 AI 생성글 저장
      sheet.getRange(i + 1, 9).setValue('AI생성완료'); // I열 상태 업데이트
      break;
    }
  }
}

// ============================================
// 8. 피그마 디자인 생성 (개선된 버전)
// ============================================
function processFigmaDesign(requestId, formData, aiContent) {
  try {
    // 템플릿 선택에 따른 파일 키 결정
    const templateFileKey = getTemplateFileKey(formData.template);
    
    if (!templateFileKey) {
      throw new Error('선택된 템플릿 파일을 찾을 수 없습니다.');
    }
    
    // 피그마 텍스트 업데이트
    const updateResult = updateFigmaText(templateFileKey, formData.productName, aiContent);
    
    if (!updateResult.success) {
      throw new Error(updateResult.error);
    }
    
    // 잠시 대기 (피그마 처리 시간)
    Utilities.sleep(3000);
    
    // 피그마에서 이미지 Export
    const imageUrl = exportFigmaAsPNG(templateFileKey);
    
    if (!imageUrl) {
      throw new Error('피그마 이미지 내보내기에 실패했습니다.');
    }
    
    // 구글 드라이브에 저장
    const driveLink = saveImageToDrive(imageUrl, formData.productName, requestId);
    
    // 시트 업데이트
    updateSheetWithDesignResult(requestId, templateFileKey, driveLink);
    
    return {
      success: true,
      figmaLink: `https://www.figma.com/file/${templateFileKey}`,
      pngLink: driveLink
    };
    
  } catch (error) {
    Logger.log(`Figma Design Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// 9. 템플릿별 파일 키 반환
// ============================================
function getTemplateFileKey(template) {
  const templateKeys = PropertiesService.getScriptProperties().getProperties();
  
  switch (template) {
    case 'minimal':
      return templateKeys['FIGMA_TEMPLATE_MINIMAL'] || templateKeys['FIGMA_FILE_KEY'];
    case 'modern':
      return templateKeys['FIGMA_TEMPLATE_MODERN'] || templateKeys['FIGMA_FILE_KEY'];
    case 'luxury':
      return templateKeys['FIGMA_TEMPLATE_LUXURY'] || templateKeys['FIGMA_FILE_KEY'];
    default:
      return templateKeys['FIGMA_FILE_KEY'];
  }
}

// ============================================
// 10. 피그마 텍스트 업데이트 (플러그인 연동)
// ============================================
function updateFigmaText(fileKey, productName, content) {
  try {
    // 피그마 플러그인을 통한 텍스트 업데이트
    // 실제 구현에서는 피그마 플러그인 API를 호출하거나
    // 피그마 REST API를 사용하여 텍스트 노드를 찾아 업데이트
    
    Logger.log(`Figma 업데이트 시작: ${productName}`);
    Logger.log(`내용: ${content.substring(0, 100)}...`);
    
    // 여기서는 시뮬레이션으로 성공 반환
    // 실제로는 피그마 API 호출 필요
    return { success: true };
    
  } catch (error) {
    Logger.log(`Figma 업데이트 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ============================================
// 11. 피그마 PNG Export (기존 함수 재사용)
// ============================================
function exportFigmaAsPNG(fileKey) {
  const token = PropertiesService.getScriptProperties()
    .getProperty('FIGMA_ACCESS_TOKEN');
    
  if (!token) {
    throw new Error('FIGMA_ACCESS_TOKEN이 설정되지 않았습니다.');
  }
  
  // 먼저 파일에서 노드 ID 가져오기
  const fileUrl = `https://api.figma.com/v1/files/${fileKey}`;
  const fileOptions = {
    method: 'get',
    headers: {
      'X-Figma-Token': token
    },
    muteHttpExceptions: true
  };
  
  const fileResponse = UrlFetchApp.fetch(fileUrl, fileOptions);
  
  if (fileResponse.getResponseCode() !== 200) {
    throw new Error(`Figma API Error: ${fileResponse.getResponseCode()}`);
  }
  
  const fileData = JSON.parse(fileResponse.getContentText());
  
  if (!fileData.document || !fileData.document.children || fileData.document.children.length === 0) {
    throw new Error('Figma 파일 구조가 올바르지 않습니다.');
  }
  
  // 메인 페이지의 첫 번째 프레임 가져오기
  const firstPage = fileData.document.children[0];
  if (!firstPage.children || firstPage.children.length === 0) {
    throw new Error('Figma 페이지에 프레임이 없습니다.');
  }
  
  const nodeId = firstPage.children[0].id;
  
  // Export URL 생성
  const exportUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=2`;
  const exportOptions = {
    method: 'get',
    headers: {
      'X-Figma-Token': token
    },
    muteHttpExceptions: true
  };
  
  const exportResponse = UrlFetchApp.fetch(exportUrl, exportOptions);
  
  if (exportResponse.getResponseCode() !== 200) {
    throw new Error(`Figma Export API Error: ${exportResponse.getResponseCode()}`);
  }
  
  const exportData = JSON.parse(exportResponse.getContentText());
  
  if (exportData.err) {
    throw new Error(`Figma Export 실패: ${exportData.err}`);
  }
  
  if (!exportData.images || !exportData.images[nodeId]) {
    throw new Error('Figma 이미지 URL을 가져올 수 없습니다.');
  }
  
  // 이미지 URL 반환
  return exportData.images[nodeId];
}

// ============================================
// 12. 이미지를 구글 드라이브에 저장 (기존 함수 재사용)
// ============================================
function saveImageToDrive(imageUrl, productName, requestId) {
  try {
    // 이미지 다운로드
    const imageResponse = UrlFetchApp.fetch(imageUrl);
    
    if (imageResponse.getResponseCode() !== 200) {
      throw new Error(`이미지 다운로드 실패: ${imageResponse.getResponseCode()}`);
    }
    
    const imageBlob = imageResponse.getBlob();
    
    // 파일명 생성 (특수문자 제거)
    const cleanProductName = productName.replace(/[^\w\s가-힣]/g, '');
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmmss');
    const filename = `${cleanProductName}_${timestamp}.png`;
    
    // 폴더 찾기 또는 생성
    const folders = DriveApp.getFoldersByName('상세페이지_완성본');
    let folder;
    
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder('상세페이지_완성본');
    }
    
    // 파일 저장
    const file = folder.createFile(imageBlob.setName(filename));
    
    // 공유 권한 설정 (링크 있는 사람 누구나 볼 수 있음)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // 파일 URL 반환
    return file.getUrl();
    
  } catch (error) {
    Logger.log(`Drive 저장 실패: ${error.message}`);
    throw new Error(`이미지 저장 실패: ${error.message}`);
  }
}

// ============================================
// 13. 시트에 디자인 결과 업데이트
// ============================================
function updateSheetWithDesignResult(requestId, figmaFileKey, driveLink) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // 요청 ID로 행 찾기
  for (let i = 1; i < data.length; i++) {
    if (data[i][9] === requestId) { // J열 (10번째 컬럼)
      sheet.getRange(i + 1, 7).setValue(`https://www.figma.com/file/${figmaFileKey}`); // G열: Figma링크
      sheet.getRange(i + 1, 8).setValue(driveLink); // H열: PNG링크
      sheet.getRange(i + 1, 9).setValue('완료'); // I열: 상태
      break;
    }
  }
}

// ============================================
// 14. 완료 이메일 발송 (기존 함수 재사용)
// ============================================
function sendCompletionEmail(email, productName, figmaLink, driveLink) {
  try {
    const subject = `[완성!] ${productName} 상세페이지가 준비되었습니다`;
    
    const body = `
안녕하세요!

${productName}의 상세페이지 디자인이 완성되었습니다! 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Figma 파일 (편집 가능):
${figmaLink}

📥 PNG 다운로드 (바로 사용):
${driveLink}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 활용 방법:
1. PNG 파일을 스마트스토어 상세페이지에 업로드
2. Figma에서 추가 수정 가능 (색상, 레이아웃 등)
3. 수정 후 다시 Export 가능

만족하셨다면 다음 상품도 신청해주세요! 😊

감사합니다.
`;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body
    });
    
    Logger.log(`완료 이메일 발송: ${email}`);
  } catch (error) {
    Logger.log(`완료 이메일 발송 실패: ${error.message}`);
    throw error;
  }
}

// ============================================
// 15. 설정 함수들 (개선된 버전)
// ============================================

/**
 * 웹앱용 API 키 설정 함수
 */
function setupWebAppAPIKeys() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // 이 값들을 실제 값으로 변경하세요
  scriptProperties.setProperties({
    'OPENAI_API_KEY': 'your-openai-api-key-here',
    'FIGMA_FILE_KEY': 'your-default-figma-file-key-here',
    'FIGMA_TEMPLATE_MINIMAL': 'your-minimal-template-key-here',
    'FIGMA_TEMPLATE_MODERN': 'your-modern-template-key-here',
    'FIGMA_TEMPLATE_LUXURY': 'your-luxury-template-key-here',
    'FIGMA_ACCESS_TOKEN': 'your-figma-access-token-here'
  });
  
  Logger.log('웹앱용 API 키 설정이 완료되었습니다.');
}

/**
 * 웹앱 배포 함수
 */
function deployWebApp() {
  const scriptId = ScriptApp.getScriptId();
  Logger.log(`웹앱 스크립트 ID: ${scriptId}`);
  Logger.log('Google Apps Script 에디터에서 "배포" > "새 배포"를 통해 웹앱을 배포하세요.');
  Logger.log('웹앱 URL을 web-ui.html의 YOUR_SCRIPT_ID 부분에 입력하세요.');
}

/**
 * 테스트 함수
 */
function testWebAppFunctions() {
  try {
    Logger.log('=== 웹앱 함수 테스트 시작 ===');
    
    // API 키 확인
    const scriptProperties = PropertiesService.getScriptProperties();
    const openaiKey = scriptProperties.getProperty('OPENAI_API_KEY');
    const figmaKey = scriptProperties.getProperty('FIGMA_FILE_KEY');
    const figmaToken = scriptProperties.getProperty('FIGMA_ACCESS_TOKEN');
    
    Logger.log(`OpenAI API Key 설정됨: ${openaiKey ? 'Yes' : 'No'}`);
    Logger.log(`Figma File Key 설정됨: ${figmaKey ? 'Yes' : 'No'}`);
    Logger.log(`Figma Access Token 설정됨: ${figmaToken ? 'Yes' : 'No'}`);
    
    // 시트 확인
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    Logger.log(`현재 시트: ${sheet.getName()}`);
    Logger.log(`마지막 행: ${sheet.getLastRow()}`);
    
    Logger.log('=== 웹앱 함수 테스트 완료 ===');
    
  } catch (error) {
    Logger.log(`테스트 실패: ${error.message}`);
  }
}

// ============================================
// 새로운 함수들: AI 미리보기 및 수정 기능
// ============================================

/**
 * 요청 ID로 행 번호 찾기
 */
function getRowNumberByRequestId(requestId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][9] === requestId) { // J열 (10번째 컬럼)
      return i + 1;
    }
  }
  return null;
}

/**
 * 디자인 요청 처리 (수정된 내용으로)
 */
function handleDesignRequest(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = data.rowNumber;
  
  // 세션 검증
  const storedSessionId = sheet.getRange(row, 10).getValue();
  if (storedSessionId !== data.sessionId) {
    return {
      success: false,
      error: '권한이 없습니다'
    };
  }
  
  try {
    // 고객이 수정한 최종 내용을 F열(고객수정글)에 저장
    if (data.finalContent) {
      sheet.getRange(row, 6).setValue(data.finalContent);
    }
    
    // 새 이미지가 있으면 K열에 저장
    if (data.hasNewImage && data.newImageData) {
      sheet.getRange(row, 11).setValue(data.newImageData);
    }
    
    // 상태를 디자인생성중으로 변경
    sheet.getRange(row, 9).setValue('디자인생성중');
    
    // 비동기로 디자인 생성 시작
    Utilities.sleep(1000); // 잠시 대기 후 시작
    
    return {
      success: true,
      message: '수정하신 내용으로 디자인이 생성됩니다',
      pollUrl: `웹앱URL?action=checkStatus&row=${row}&sessionId=${data.sessionId}`
    };
    
  } catch (error) {
    Logger.log(`디자인 요청 처리 오류: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 디자인 상태 확인
 */
function checkDesignStatus(row, sessionId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  try {
    // 세션 검증
    const storedSessionId = sheet.getRange(row, 10).getValue();
    if (storedSessionId !== sessionId) {
      return {
        status: 'error',
        error: '권한이 없습니다'
      };
    }
    
    const status = sheet.getRange(row, 9).getValue();
    
    if (status === '완료') {
      // 완료된 경우 링크 반환
      const figmaLink = sheet.getRange(row, 7).getValue();
      const pngLink = sheet.getRange(row, 8).getValue();
      
      return {
        status: 'completed',
        figmaLink: figmaLink,
        pngLink: pngLink
      };
    } else if (status === '오류' || status.indexOf('오류:') === 0) {
      return {
        status: 'error',
        error: status
      };
    } else {
      return {
        status: 'processing',
        message: '디자인을 생성하고 있습니다...'
      };
    }
    
  } catch (error) {
    Logger.log(`상태 확인 오류: ${error.message}`);
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * 피그마 플러그인용 대기 중인 디자인 목록 반환
 */
function getPendingDesignsForPlugin() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const pending = [];
  
  for (let row = 2; row <= lastRow; row++) {
    const status = sheet.getRange(row, 9).getValue();
    
    if (status === '디자인생성중') {
      const finalContent = sheet.getRange(row, 6).getValue(); // 고객수정글 (F열)
      const aiContent = sheet.getRange(row, 5).getValue(); // AI생성글 (E열)
      
      pending.push({
        row: row,
        productName: sheet.getRange(row, 3).getValue(),
        content: finalContent || aiContent, // 수정본 우선, 없으면 AI 원본
        imageData: sheet.getRange(row, 11).getValue() // K열 이미지
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(pending))
    .setMimeType(ContentService.MimeType.JSON);
}
