export interface Video {
  id: string;
  title: string;
  description: string;
  publicId: string;
  originalSize: string;     // size in string, e.g., "25MB"
  compressedSize: string;   // e.g., "10MB"
  duration: number;         // in seconds
  createdAt: Date;
  updatedAt: Date;
  url: string;
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
      moderation?: Record<string, unknown>;  // safer than `any`
      faces?: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
    };
    transformations: Array<{
      type: string;
      value: string;
    }>;
  };
}
