"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Loader2 } from "lucide-react";

type VideoQuality = "auto" | "high" | "medium" | "low";

// ✅ FIXED: Match backend constraint (500MB)
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export default function VideoUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enableEnhancement, setEnableEnhancement] = useState(true);
  const [quality, setQuality] = useState<VideoQuality>("auto");
  const [generateThumbnail, setGenerateThumbnail] = useState(true);
  const [analyzeContent, setAnalyzeContent] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) return setError("Please select a video file.");
    // ✅ FIXED: Updated error message to match new limit
    if (file.size > MAX_FILE_SIZE)
      return setError("File size exceeds the 500MB limit.");

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", description);
    // ✅ FIXED: Changed from "size" to "originalSize" to match backend
    formData.append("originalSize", file.size.toString());
    formData.append("enableEnhancement", enableEnhancement.toString());
    formData.append("quality", quality);
    formData.append("generateThumbnail", generateThumbnail.toString());
    formData.append("analyzeContent", analyzeContent.toString());

    try {
      const response = await axios.post("/api/video-upload", formData, {
        onUploadProgress: (e) => {
          const progress = e.total ? (e.loaded / e.total) * 100 : 0;
          setUploadProgress(Math.round(progress));
        },
      });

      if (response.status === 200) router.push("/home");
      else throw new Error("Upload failed");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        // ✅ FIXED: Updated to match backend error response structure
        setError(
          err.response?.data?.error || "Upload failed. Please try again."
        );
      } else {
        setError("Upload failed. Please try again.");
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-10 px-6">
      <div className="max-w-3xl mx-auto bg-black rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Upload Your Video
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="text-sm mb-2 block">
              Title
            </label>
            <input
              type="text"
              id="title"
              className="w-full px-4 py-2 rounded-lg bg-white border border-gray-600 text-black"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="text-sm mb-2 block">
              Description
            </label>
            <textarea
              id="description"
              className="w-full px-4 py-2 rounded-lg bg-white border border-gray-600 text-black"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <label htmlFor="file" className="text-sm mb-2 block">
              Video File
            </label>
            <input
              type="file"
              id="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-white file:text-black hover:file:bg-black hover:file:text-white"
            />
            {file && (
              <p className="text-xs text-white mt-1">
                Selected: <strong>{file.name}</strong> (
                {(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={enableEnhancement}
                onChange={(e) => setEnableEnhancement(e.target.checked)}
              />
              <span className="text-sm">Enable AI Enhancement</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={generateThumbnail}
                onChange={(e) => setGenerateThumbnail(e.target.checked)}
              />
              <span className="text-sm">Generate AI Thumbnail</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={analyzeContent}
                onChange={(e) => setAnalyzeContent(e.target.checked)}
              />
              <span className="text-sm">Analyze Content</span>
            </label>

            <div>
              <label htmlFor="quality" className="text-sm mb-1 block">
                Video Quality
              </label>
              <select
                id="quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value as VideoQuality)}
                className="w-full px-3 py-2 bg-black text-white border border-gray-600 rounded-lg"
              >
                <option value="auto">Auto (Recommended)</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <div className="pt-4">
            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3 flex justify-center items-center gap-2 rounded-xl bg-white hover:bg-black font-semibold text-black hover:text-white text-sm sm:text-base disabled:opacity-50"
            >
              {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
              Upload Video
            </button>
            {uploadProgress > 0 && (
              <div className="mt-2 text-xs text-gray-400 text-center">
                Upload Progress: {uploadProgress}%
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}