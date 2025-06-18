"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import VideoCard from "@/components/VideoCard";
import { Video } from "@/types";
import { Loader2, AlertTriangle, Film } from "lucide-react";

const Home = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const response = await axios.get<Video[]>("/api/videos");

      if (Array.isArray(response.data)) {
        setVideos(response.data);
        setError(null);
      } else {
        setError("Unexpected response format.");
      }
    } catch {
      setError("Failed to fetch videos. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleDownload = useCallback((url: string, title: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title}.mp4`);
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleRemoved = useCallback((id: string) => {
    setVideos((prev) => prev.filter((video) => video.id !== id));
  }, []);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            📺 Your Video Library
          </h1>
          <p className="text-white mt-1">
            Browse, preview, and download your uploaded videos.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-white">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2">Loading videos...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-red-600 mt-20">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p className="text-lg font-medium">{error}</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 mt-20">
            <Film className="w-10 h-10 mb-2" />
            <p className="text-lg">No videos available yet.</p>
          </div>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onDownload={handleDownload}
                onRemoved={handleRemoved}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
};

export default Home;
