'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownCircle, UploadCloud, Loader2 } from 'lucide-react';
import Image from 'next/image';

const socialFormats = {
  'Instagram Square (1:1)': { width: 1080, height: 1080, aspectRatio: '1:1' },
  'Instagram Portrait (4:5)': { width: 1080, height: 1350, aspectRatio: '4:5' },
  'Twitter Post (16:9)': { width: 1200, height: 675, aspectRatio: '16:9' },
  'Twitter Header (3:1)': { width: 1500, height: 500, aspectRatio: '3:1' },
  'Facebook Cover (205:78)': { width: 820, height: 312, aspectRatio: '205:78' },
};

type SocialFormat = keyof typeof socialFormats;

interface UploadResponse {
  publicId: string;
  secureUrl: string;
  optimizedUrl: string;
  thumbnailUrl?: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    processedSize?: number;
  };
  transformations: string[];
}

export default function SocialShare() {
  const [uploadedImage, setUploadedImage] = useState<UploadResponse | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<SocialFormat>('Instagram Square (1:1)');
  const [isUploading, setIsUploading] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformedUrl, setTransformedUrl] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Function to generate ImageKit URL with transformations
  const generateImageKitUrl = (baseUrl: string, format: SocialFormat) => {
    const { width, height } = socialFormats[format];
    
    // Extract the base URL and filename from the ImageKit URL
    const urlParts = baseUrl.split('/');
    const filename = urlParts.pop();
    const baseUrlPath = urlParts.join('/');
    
    // Create transformation parameters for ImageKit
    const transformations = [
      `w-${width}`,
      `h-${height}`,
      'c-maintain_ratio',
      'fo-auto', // focus auto (similar to gravity auto in Cloudinary)
      'q-auto',
      'f-auto'
    ].join(',');
    
    return `${baseUrlPath}/tr:${transformations}/${filename}`;
  };

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/image-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload image');

      const data: UploadResponse = await response.json();
      setUploadedImage(data);
    } catch (error) {
      console.error(error);
      alert('Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreviewURL(URL.createObjectURL(file));
      handleUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setPreviewURL(URL.createObjectURL(file));
      handleUploadFile(file);
    }
  };

  const handleDownload = () => {
    if (!transformedUrl) return;

    fetch(transformedUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedFormat.replace(/\s+/g, '_').toLowerCase()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
  };

  // Update transformed URL when format changes
  useEffect(() => {
    if (uploadedImage) {
      setIsTransforming(true);
      const newTransformedUrl = generateImageKitUrl(uploadedImage.secureUrl, selectedFormat);
      setTransformedUrl(newTransformedUrl);
    }
  }, [selectedFormat, uploadedImage]);

  return (
    <div className="mx-auto max-w-4xl p-6 bg-black rounded-xl shadow-md mt-10">
      <h1 className="text-3xl font-bold text-center mb-6 text-white">
        Social Media Image Creator
      </h1>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer transition hover:border-white bg-black"
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          disabled={isUploading}
          className="hidden"
          id="upload-input"
        />
        <label htmlFor="upload-input" className="cursor-pointer">
          {isUploading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-white" />
          ) : (
            <UploadCloud className="mx-auto h-8 w-8 text-white" />
          )}
          <p className="mt-2 text-white">Click or drag an image file here to upload</p>
        </label>
      </div>

      {previewURL && !uploadedImage && (
        <div className="mt-4">
          <p className="text-sm text-white">Preview:</p>
          <Image
            src={previewURL}
            alt="preview"
            width={240}
            height={240}
            className="w-60 h-auto mt-2 rounded-md border border-white mx-auto"
          />
        </div>
      )}

      {uploadedImage && (
        <>
          <div className="mt-6">
            <label className="block text-sm font-medium text-white mb-2">
              Select Format:
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as SocialFormat)}
              className="w-full max-w-md bg-black text-white border border-white rounded-md p-2"
            >
              {Object.keys(socialFormats).map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm text-white">Formatted Preview:</p>
            <div className="relative mx-auto w-fit border border-white shadow rounded-lg overflow-hidden bg-black">
              {isTransforming && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                  <Loader2 className="h-6 w-6 animate-spin text-black" />
                </div>
              )}
              {transformedUrl && (
                <Image
                  key={`${uploadedImage.publicId}-${selectedFormat}`}
                  src={transformedUrl}
                  alt="transformed"
                  width={socialFormats[selectedFormat].width}
                  height={socialFormats[selectedFormat].height}
                  className="rounded-md max-w-full h-auto"
                  onLoad={() => setIsTransforming(false)}
                  ref={imageRef}
                  priority
                />
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium"
              disabled={isUploading || isTransforming}
            >
              <ArrowDownCircle className="h-5 w-5" />
              Download for {selectedFormat}
            </button>
          </div>
        </>
      )}
    </div>
  );
}