'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CldImage } from 'next-cloudinary';
import { ArrowDownCircle, UploadCloud, Loader2 } from 'lucide-react';

const socialFormats = {
  'Instagram Square (1:1)': { width: 1080, height: 1080, aspectRatio: '1:1' },
  'Instagram Portrait (4:5)': { width: 1080, height: 1350, aspectRatio: '4:5' },
  'Twitter Post (16:9)': { width: 1200, height: 675, aspectRatio: '16:9' },
  'Twitter Header (3:1)': { width: 1500, height: 500, aspectRatio: '3:1' },
  'Facebook Cover (205:78)': { width: 820, height: 312, aspectRatio: '205:78' },
};

type SocialFormat = keyof typeof socialFormats;

export default function SocialShare() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<SocialFormat>('Instagram Square (1:1)');
  const [isUploading, setIsUploading] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

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

      const data = await response.json();
      setUploadedImage(data.publicId);
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
    if (!imageRef.current) return;

    fetch(imageRef.current.src)
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

  useEffect(() => {
    if (uploadedImage) setIsTransforming(true);
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
          <img
            src={previewURL}
            alt="preview"
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
              <CldImage
                key={`${uploadedImage}-${selectedFormat}`}
                width={socialFormats[selectedFormat].width}
                height={socialFormats[selectedFormat].height}
                src={uploadedImage}
                alt="transformed"
                crop="fill"
                gravity="auto"
                aspectRatio={socialFormats[selectedFormat].aspectRatio}
                className="rounded-md max-w-full h-auto"
                sizes="100vw"
                onLoad={() => setIsTransforming(false)}
                ref={imageRef}
              />
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
