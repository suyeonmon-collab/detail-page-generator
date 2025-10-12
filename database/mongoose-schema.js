/**
 * 신디야 디자인 자동 생성기 - MongoDB/Mongoose 스키마
 */

const mongoose = require('mongoose');

// 1. Design Schema
const DesignSchema = new mongoose.Schema({
  customerEmail: {
    type: String,
    required: true,
    index: true
  },
  categoryId: {
    type: String,
    required: true
  },
  templateId: {
    type: String,
    required: true
  },
  templateName: String,
  targetAudience: String,
  
  // 입력 데이터
  inputData: {
    type: Map,
    of: String
  },
  
  // AI 생성 콘텐츠
  aiGeneratedContent: {
    type: Map,
    of: String
  },
  
  // 최종 편집된 콘텐츠
  editedContent: {
    type: Map,
    of: String
  },
  
  // 이미지 데이터
  images: {
    type: Map,
    of: String  // base64 또는 URL
  },
  
  // 레이아웃 (모듈 시스템용)
  layout: [{
    order: Number,
    moduleId: String,
    customData: Map
  }],
  
  // 결제 정보
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'expired'],
    default: 'pending',
    index: true
  },
  paymentLink: String,
  paymentLinkExpiry: Date,
  paymentCompletedAt: Date,
  
  // 알림 정보
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: Date,
  
  // 파일 URLs
  previewWithWatermark: String,
  figmaFileId: String,
  finalFigmaUrl: String,
  finalPngUrl: String,
  finalJpgUrl: String,
  
  // 상태
  status: {
    type: String,
    enum: ['processing', 'ai_completed', 'design_pending', 'design_completed', 'completed', 'error'],
    default: 'processing'
  },
  
  // 타임스탬프
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
}, {
  timestamps: true
});

// 인덱스
DesignSchema.index({ customerEmail: 1, createdAt: -1 });
DesignSchema.index({ paymentStatus: 1, reminderSent: 1 });

// 2. Module Schema
const ModuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  thumbnailUrl: String,
  
  // Figma 정보
  figmaComponentId: String,
  figmaFileId: String,
  
  // 모듈 속성
  height: Number,
  width: Number,
  
  // 노드 정보
  nodes: [{
    id: String,
    type: String,
    placeholder: String,
    maxLength: Number
  }],
  
  // 메타데이터
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 3. Payment Email Schema
const PaymentEmailSchema = new mongoose.Schema({
  gmailMessageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  designId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Design'
  },
  
  // 이메일 정보
  emailSubject: String,
  emailBody: String,
  emailReceivedAt: Date,
  
  // 처리 정보
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  processedAt: Date,
  processingError: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 모델 생성
const Design = mongoose.model('Design', DesignSchema);
const Module = mongoose.model('Module', ModuleSchema);
const PaymentEmail = mongoose.model('PaymentEmail', PaymentEmailSchema);

module.exports = {
  Design,
  Module,
  PaymentEmail
};


