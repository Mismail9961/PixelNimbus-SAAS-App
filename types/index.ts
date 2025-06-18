export interface ModerationResult {
  status: string;
  flagged: boolean;
  reasons?: string[];
}

export interface FaceData {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface Transformation {
  type: string;
  value: string | number | boolean;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  publicId: string;
  originalSize: string;
  compressedSize: string;
  duration: number;
  createdAt: Date;
  url: string;
  updatedAt: Date;
  userId: string;
  metadata?: {
    processingOptions: {
      enableEnhancement: boolean;
      quality: 'auto' | 'high' | 'medium' | 'low';
      generateThumbnail: boolean;
      analyzeContent: boolean;
    };
    aiMetadata: {
      quality: string;
      hasEnhancement: boolean;
      hasThumbnail: boolean;
      hasContentAnalysis: boolean;
      tags?: string[];
      moderation?: ModerationResult;
      faces?: FaceData[];
    };
    transformations: Transformation[];
  };
}
