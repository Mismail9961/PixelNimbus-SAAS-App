export interface Video {
  id: string;
  title: string;
  description: string;
  publicId: string;
  originalSize: string;    // Changed from number to string
  compressedSize: string;  // Changed from number to string
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
      moderation?: any;
      faces?: any[];
    };
    transformations: any[];
  };
}