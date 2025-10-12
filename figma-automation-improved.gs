/**
 * 개선된 메인 코드: 전체 구조
 */

// ============================================
// 1. 트리거: 새 행 추가 감지
// ============================================
function onEdit(e) {
  // 이벤트 객체가 없으면 종료 (수동 실행 방지)
  if (!e) {
    Logger.log('onEdit 함수는 트리거를 통해서만 실행되어야 합니다.');
    return;
  }
  
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  
  // A열(타임스탬프)에 새 데이터가 추가되면
  if (col === 1 && row > 1) {
    const status = sheet.getRange(row, 9).getValue(); // I열: 상태
    
    // 상태가 "대기중"이면 처리 시작
    if (status === "대기중" || status === "") {
      processNewRequest(sheet, row);
    }
  }
}

// ============================================
// 2. 신규 요청 처리 (개선된 에러 처리)
// ============================================
function processNewRequest(sheet, row) {
  try {
    // 상태 업데이트: AI생성중
    sheet.getRange(row, 9).setValue("AI생성중");
    SpreadsheetApp.flush();
    
    // 데이터 가져오기
    const customerEmail = sheet.getRange(row, 2).getValue();
    const productName = sheet.getRange(row, 3).getValue();
    const keywords = sheet.getRange(row, 4).getValue();
    
    // 필수 정보 체크
    if (!productName) {
      throw new Error("상품명이 없습니다.");
    }
    
    if (!customerEmail) {
      throw new Error("고객 이메일이 없습니다.");
    }
    
    // AI 콘텐츠 생성
    const aiContent = generateAIContent(productName, keywords);
    
    if (!aiContent) {
      throw new Error("AI 콘텐츠 생성에 실패했습니다.");
    }
    
    // E열에 AI 생성글 저장
    sheet.getRange(row, 5).setValue(aiContent);
    
    // 상태 업데이트: 검수대기
    sheet.getRange(row, 9).setValue("검수대기");
    
    // 고객에게 이메일 발송
    sendReviewEmail(customerEmail, productName, aiContent, row);
    
    Logger.log(`Row ${row}: AI 생성 완료`);
    
  } catch (error) {
    sheet.getRange(row, 9).setValue(`오류: ${error.message}`);
    Logger.log(`Error in row ${row}: ${error.message}`);
    
    // 오류 발생 시 고객에게 알림 이메일 발송
    try {
      const customerEmail = sheet.getRange(row, 2).getValue();
      if (customerEmail) {
        sendErrorEmail(customerEmail, error.message);
      }
    } catch (emailError) {
      Logger.log(`Error email failed: ${emailError.message}`);
    }
  }
}

// ============================================
// 3. OpenAI API로 콘텐츠 생성 (개선된 에러 처리)
// ============================================
function generateAIContent(productName, keywords) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다. 스크립트 속성에서 OPENAI_API_KEY를 설정해주세요.');
  }
  
  // 프롬프트 작성
  const prompt = `
당신은 전문 쇼핑몰 상세페이지 카피라이터입니다.
다음 상품에 대한 매력적인 상세 설명을 작성해주세요.

상품명: ${productName}
키워드: ${keywords || '키워드 없음'}

요구사항:
1. 고객의 고민/문제점 제시 (2-3줄)
2. 이 제품이 해결책인 이유 (3-4줄)
3. 주요 특징/장점 3가지 (각 2줄)
4. 사용 방법/활용 팁 (2-3줄)
5. 구매 결정을 돕는 마무리 멘트 (1-2줄)

톤앤매너:
- 친근하고 공감 가는 말투
- 과장 없이 진정성 있게
- 20-30대 여성 타겟
- 전체 500-800자

형식:
명확한 단락 구분 (줄바꿈 2번)
이모지 적절히 활용
`;

  // API 요청
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
// 4. 고객에게 검수 요청 이메일 발송
// ============================================
function sendReviewEmail(email, productName, content, rowNumber) {
  try {
    const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    
    const subject = `[상세페이지 생성 완료] ${productName} - 검수 요청`;
    
    const body = `
안녕하세요!

${productName}의 상세페이지 설명이 AI로 생성되었습니다.

아래 내용을 확인하시고, 수정이 필요하시면 
구글 시트의 F열(고객수정글)에 직접 수정해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${content}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 수정 방법:
1. 아래 링크로 이동
2. ${rowNumber}번 행의 F열에 수정된 내용 입력
3. I열 상태를 "수정완료"로 변경

📊 구글 시트 바로가기:
${sheetUrl}

수정 완료하시면 자동으로 디자인 작업이 진행됩니다!

감사합니다.
`;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body
    });
    
    Logger.log(`이메일 발송 완료: ${email}`);
  } catch (error) {
    Logger.log(`이메일 발송 실패: ${error.message}`);
    throw error;
  }
}

// ============================================
// 5. 오류 알림 이메일 발송
// ============================================
function sendErrorEmail(email, errorMessage) {
  try {
    const subject = `[오류 발생] 상세페이지 생성 중 문제가 발생했습니다`;
    
    const body = `
안녕하세요!

상세페이지 생성 중 오류가 발생했습니다.

오류 내용: ${errorMessage}

관리자에게 문의해주시거나, 다시 시도해주세요.

감사합니다.
`;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body
    });
    
    Logger.log(`오류 이메일 발송 완료: ${email}`);
  } catch (error) {
    Logger.log(`오류 이메일 발송 실패: ${error.message}`);
  }
}

// ============================================
// 6. 고객 수정 완료 감지 및 Figma 작업 시작
// ============================================
function checkForApprovedContent() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  // 2번 행부터 마지막 행까지 검사
  for (let row = 2; row <= lastRow; row++) {
    const status = sheet.getRange(row, 9).getValue(); // I열: 상태
    
    // 상태가 "수정완료"인 행 찾기
    if (status === "수정완료") {
      processFigmaDesign(sheet, row);
    }
  }
}

// ============================================
// 7. Figma 디자인 생성 (개선된 에러 처리)
// ============================================
function processFigmaDesign(sheet, row) {
  try {
    // 상태 업데이트: 디자인중
    sheet.getRange(row, 9).setValue("디자인중");
    SpreadsheetApp.flush();
    
    // 데이터 가져오기
    const productName = sheet.getRange(row, 3).getValue();
    const finalContent = sheet.getRange(row, 6).getValue(); // F열: 고객수정글
    const aiContent = sheet.getRange(row, 5).getValue(); // E열: AI생성글
    
    // 고객 수정글이 없으면 AI 생성글 사용
    const contentToUse = finalContent || aiContent;
    
    if (!contentToUse) {
      throw new Error('사용할 콘텐츠가 없습니다.');
    }
    
    // Figma 템플릿 복사
    const newFileKey = copyFigmaTemplate();
    
    if (!newFileKey) {
      throw new Error('Figma 템플릿 파일 키가 설정되지 않았습니다.');
    }
    
    // Figma 텍스트 업데이트
    updateFigmaText(newFileKey, productName, contentToUse);
    
    // 잠시 대기 (Figma 처리 시간)
    Utilities.sleep(3000);
    
    // Figma에서 이미지 Export
    const imageUrl = exportFigmaAsPNG(newFileKey);
    
    if (!imageUrl) {
      throw new Error('Figma 이미지 내보내기에 실패했습니다.');
    }
    
    // 구글 드라이브에 저장
    const driveLink = saveImageToDrive(imageUrl, productName, row);
    
    // 시트 업데이트
    const figmaLink = `https://www.figma.com/file/${newFileKey}`;
    sheet.getRange(row, 7).setValue(figmaLink); // G열: Figma링크
    sheet.getRange(row, 8).setValue(driveLink); // H열: PNG링크
    sheet.getRange(row, 9).setValue("완료"); // I열: 상태
    
    // 완료 이메일 발송
    const email = sheet.getRange(row, 2).getValue();
    sendCompletionEmail(email, productName, figmaLink, driveLink);
    
    Logger.log(`Row ${row}: Figma 디자인 완료`);
    
  } catch (error) {
    sheet.getRange(row, 9).setValue(`오류: ${error.message}`);
    Logger.log(`Figma Error in row ${row}: ${error.message}`);
    
    // 오류 발생 시 고객에게 알림
    try {
      const email = sheet.getRange(row, 2).getValue();
      if (email) {
        sendErrorEmail(email, `디자인 생성 중 오류: ${error.message}`);
      }
    } catch (emailError) {
      Logger.log(`Error email failed: ${emailError.message}`);
    }
  }
}

// ============================================
// 8. Figma 템플릿 복사 (개선된 버전)
// ============================================
function copyFigmaTemplate() {
  const templateFileKey = PropertiesService.getScriptProperties()
    .getProperty('FIGMA_FILE_KEY');
    
  if (!templateFileKey) {
    throw new Error('FIGMA_FILE_KEY가 설정되지 않았습니다. 스크립트 속성에서 설정해주세요.');
  }
    
  return templateFileKey;
}

// ============================================
// 9. Figma 텍스트 업데이트 (Variables 방식)
// ============================================
function updateFigmaText(fileKey, productName, content) {
  // 실제 구현에서는 다음 방법 중 하나 사용:
  // 방법 1: Figma Plugin 개발 (권장)
  // 방법 2: 매번 수동으로 템플릿 복사
  // 방법 3: Figma Community Plugin 활용
  
  Logger.log(`Figma 업데이트 예정: ${productName}`);
  Logger.log(`내용: ${content.substring(0, 100)}...`);
  
  // 실제로는 별도 프로세스 필요
  return true;
}

// ============================================
// 10. Figma PNG Export (개선된 에러 처리)
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
// 11. 이미지를 구글 드라이브에 저장 (개선된 에러 처리)
// ============================================
function saveImageToDrive(imageUrl, productName, rowNumber) {
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
// 12. 완료 이메일 발송
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
// 13. 설정 함수들
// ============================================

/**
 * 필요한 API 키들을 설정하는 함수
 * Google Apps Script 에디터에서 실행하여 설정
 */
function setupAPIKeys() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // 이 값들을 실제 값으로 변경하세요
  scriptProperties.setProperties({
    'OPENAI_API_KEY': 'your-openai-api-key-here',
    'FIGMA_FILE_KEY': 'your-figma-file-key-here',
    'FIGMA_ACCESS_TOKEN': 'your-figma-access-token-here'
  });
  
  Logger.log('API 키 설정이 완료되었습니다.');
}

/**
 * 트리거 설정 함수
 * Google Apps Script 에디터에서 실행하여 트리거 설정
 */
function setupTriggers() {
  // 기존 트리거 삭제
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEdit' || 
        trigger.getHandlerFunction() === 'checkForApprovedContent') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 새 트리거 생성
  ScriptApp.newTrigger('onEdit')
    .onEdit()
    .create();
    
  ScriptApp.newTrigger('checkForApprovedContent')
    .timeBased()
    .everyMinutes(5) // 5분마다 실행
    .create();
    
  Logger.log('트리거 설정이 완료되었습니다.');
}

/**
 * 테스트 함수
 */
function testBasicFunctions() {
  try {
    Logger.log('=== 기본 함수 테스트 시작 ===');
    
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
    
    Logger.log('=== 기본 함수 테스트 완료 ===');
    
  } catch (error) {
    Logger.log(`테스트 실패: ${error.message}`);
  }
}


