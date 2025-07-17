"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Download,
  Clock,
  FileUp,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { filesize } from "filesize";
import { Video } from "@/types";

dayjs.extend(relativeTime);

const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;
if (!IMAGEKIT_URL) {
  throw new Error("Missing NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT in env");
}

interface VideoCardProps {
  video: Video;
  onDownload: (url: string, title: string) => void;
  onRemoved: (id: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onDownload, onRemoved }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingThumbnail, setIsDownloadingThumbnail] = useState(false);

  const router = useRouter();

  const getThumbnailUrl = (thumbnailId: string) =>
    `${IMAGEKIT_URL.replace(/\/$/, "")}/${thumbnailId}?tr=w-400,h-225,cm-pad`;

  const getPreviewVideoUrl = useCallback(
    (publicId: string) => `${IMAGEKIT_URL}/${publicId}?tr=w-400,h-225`,
    []
  );

  const getMainVideoUrl = useCallback(
    (publicId: string) => `${IMAGEKIT_URL}/${publicId}`,
    []
  );

  const getFullVideoUrl = (publicId: string) =>
    `${IMAGEKIT_URL}/${publicId}?tr=w-1920,h-1080`;

  const formatSize = (size: number) => filesize(size);
  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const getCompressionInfo = () => {
    const original = Number(video.originalSize);
    const compressed = Number(video.compressedSize);
    if (compressed < original) {
      const pct = Math.round((1 - compressed / original) * 100);
      return { percentage: pct, text: `${pct}% smaller`, color: "text-white" };
    } else if (compressed > original) {
      const pct = Math.round((compressed / original - 1) * 100);
      return {
        percentage: pct,
        text: `${pct}% larger`,
        color: "text-gray-300",
      };
    }
    return { percentage: 0, text: "No change", color: "text-gray-400" };
  };

  const compressionInfo = getCompressionInfo();

  useEffect(() => {
    if (!isHovered) setPreviewError(false);
  }, [isHovered]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/deleteVideos/${video.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete video");
      onRemoved(video.id);
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      alert(
        `Delete failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadThumbnail = async () => {
    try {
      setIsDownloadingThumbnail(true);
      const url = getThumbnailUrl(video.thumbnailPublicId || "");
      onDownload(url, `${video.title || "video"}-thumbnail`);
    } catch (err) {
      console.error("Thumbnail download error:", err);
      alert(
        `Thumbnail download failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsDownloadingThumbnail(false);
    }
  };

  return (
    <div
      className="card bg-black text-white shadow-2xl hover:shadow-white/10 transition-all duration-300 relative border border-white/20 rounded-xl overflow-hidden hover:border-white/40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isDeleting && (
        <div className="absolute inset-0 bg-black/90 z-30 flex items-center justify-center rounded-xl backdrop-blur-sm">
          <div className="bg-white text-black px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="loading loading-spinner loading-md" />
            <span className="font-semibold">Deleting video...</span>
          </div>
        </div>
      )}

      <figure className="aspect-video relative group">
        {isHovered ? (
          <video
            src={
              previewError
                ? getMainVideoUrl(video.publicId)
                : getPreviewVideoUrl(video.publicId)
            }
            autoPlay
            muted
            loop
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <Image
            src={getThumbnailUrl(video.thumbnailPublicId || "")}
            alt={`Thumbnail for ${video.title}`}
            width={400}
            height={225}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <div className="absolute bottom-3 right-3 bg-white/90 text-black text-xs px-3 py-1.5 rounded-full flex items-center backdrop-blur-sm">
          <Clock size={14} className="mr-1.5" />
          {formatDuration(video.duration)}
        </div>
      </figure>

      <div className="card-body p-6 space-y-4">
        <h2 className="card-title text-xl font-bold tracking-tight text-white">
          {video.title}
        </h2>
        <p className="text-sm text-gray-300 leading-relaxed">
          {video.description}
        </p>
        <div className="text-sm text-gray-400">
          <p className="flex items-center">
            <FileUp size={14} className="mr-2" />
            Uploaded {dayjs(video.createdAt).fromNow()}
          </p>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-3">
            <button
              className="btn btn-sm bg-white text-black hover:bg-gray-200 border-none transition-colors duration-200"
              onClick={() => {
                setIsDownloading(true);
                onDownload(
                  getFullVideoUrl(video.publicId || ""),
                  video.title || "video"
                );
                setTimeout(() => setIsDownloading(false), 1000);
              }}
              disabled={isDownloading || isDeleting}
              title="Download Video"
            >
              {isDownloading ? (
                <>
                  <span className="loading loading-spinner loading-xs" />
                  <span className="ml-2">Downloading</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span className="ml-2">Video</span>
                </>
              )}
            </button>

            <button
              className="btn btn-sm bg-gray-800 text-white hover:bg-gray-700 border border-white/20 transition-colors duration-200"
              onClick={handleDownloadThumbnail}
              disabled={isDownloadingThumbnail || isDeleting}
              title="Download Thumbnail"
            >
              {isDownloadingThumbnail ? (
                <>
                  <span className="loading loading-spinner loading-xs" />
                  <span className="ml-2">Downloading</span>
                </>
              ) : (
                <>
                  <ImageIcon size={16} />
                  <span className="ml-2">Thumbnail</span>
                </>
              )}
            </button>

            <button
              className="btn btn-sm bg-white text-black hover:bg-gray-200 border-none transition-colors duration-200"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
