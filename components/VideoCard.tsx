import React, { useState, useEffect, useCallback } from "react";
import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import { useRouter } from "next/navigation";
import {
  Download,
  Clock,
  FileDown,
  FileUp,
  Trash2,
  Info,
  Image,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { filesize } from "filesize";
import { Video } from "@/types";

dayjs.extend(relativeTime);

interface VideoCardProps {
  video: Video;
  onDownload: (url: string, title: string) => void;
  onRemoved: (id: string) => void;
}

// Tooltip remains the same
const Tooltip = ({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) => (
  <span className="relative group cursor-pointer">
    {children}
    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs bg-white text-black text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
      {text}
    </span>
  </span>
);

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onDownload,
  onRemoved, // now destructured
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingThumbnail, setIsDownloadingThumbnail] = useState(false);

  const router = useRouter();

  const getThumbnailUrl = useCallback(
    (publicId: string) =>
      getCldImageUrl({
        src: publicId,
        width: 400,
        height: 225,
        crop: "fill",
        gravity: "auto",
        format: "jpg",
        quality: "auto",
        assetType: "video",
      }),
    []
  );

  const getPreviewVideoUrl = useCallback(
    (publicId: string) =>
      getCldVideoUrl({
        src: publicId,
        width: 400,
        height: 225,
        rawTransformations: ["e_preview:duration_15:max_seg_9:min_seg_dur_1"],
      }),
    []
  );

  const getMainVideoUrl = useCallback(
    (publicId: string) =>
      getCldVideoUrl({
        src: publicId,
        width: 400,
        height: 225,
      }),
    []
  );

  const getFullVideoUrl = (publicId: string) =>
    getCldVideoUrl({ src: publicId, width: 1920, height: 1080 });

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
        // ensure file matches case
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete video");
      onRemoved(video.id); // invoke callback after delete
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
      const url = getThumbnailUrl(video.publicId || "");
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
      data-video-id={video.id}
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
          <img
            src={getThumbnailUrl(video.publicId)}
            alt={video.title}
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

        {video.metadata && (
          <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
            <h3 className="font-semibold mb-2 flex items-center text-white">
              <Info size={16} className="mr-2" />
              AI Processing
            </h3>
            <ul className="text-sm space-y-2">
              <li className="flex items-center justify-between">
                <span>Enhancement:</span>
                <span
                  className={
                    video.metadata.processingOptions.enableEnhancement
                      ? "text-white"
                      : "text-gray-400"
                  }
                >
                  {video.metadata.processingOptions.enableEnhancement
                    ? "Enabled"
                    : "Disabled"}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Quality:</span>
                <span className="text-gray-300">
                  {video.metadata.processingOptions.quality}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Thumbnail:</span>
                <span
                  className={
                    video.metadata.processingOptions.generateThumbnail
                      ? "text-white"
                      : "text-gray-400"
                  }
                >
                  {video.metadata.processingOptions.generateThumbnail
                    ? "Generated"
                    : "Not generated"}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Content Analysis:</span>
                <span
                  className={
                    video.metadata.processingOptions.analyzeContent
                      ? "text-white"
                      : "text-gray-400"
                  }
                >
                  {video.metadata.processingOptions.analyzeContent
                    ? "Completed"
                    : "Not analyzed"}
                </span>
              </li>
            </ul>
          </div>
        )}

        {video.metadata?.processingOptions?.generateThumbnail && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2 flex items-center text-white">
              <Image size={16} className="mr-2" />
              Generated Thumbnail
            </h4>
            <img
              src={getThumbnailUrl(video.publicId)}
              alt="Generated Thumbnail"
              className="w-full h-48 object-cover rounded-lg border border-white/20 shadow-lg"
            />
          </div>
        )}

        {video.metadata?.aiMetadata && (
          <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
            <h4 className="font-semibold mb-2 flex items-center text-white">
              <Info size={16} className="mr-2" />
              AI Analysis Results
            </h4>
            <ul className="text-sm space-y-2">
              <li className="flex items-center justify-between">
                <span>Quality:</span>
                <span className="text-gray-300">
                  {video.metadata.aiMetadata.quality}
                </span>
              </li>
              {(video.metadata.aiMetadata.tags?.length ?? 0) > 0 && (
                <li>
                  <span className="block mb-1">Tags:</span>
                  <div className="flex flex-wrap gap-2">
                    {video.metadata.aiMetadata.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="bg-white/10 text-white text-sm px-3 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center mb-3">
            <FileUp size={18} className="text-white mr-2" />
            <span className="font-semibold text-white">File Information</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">Original Size:</span>
              <span className="text-gray-300">
                {formatSize(Number(video.originalSize))}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Processed Size:</span>
              <span className="text-gray-300">
                {formatSize(Number(video.compressedSize))}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Size Change:</span>
              <span className={compressionInfo.color}>
                {compressionInfo.text}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Duration:</span>
              <span className="text-gray-300">
                {formatDuration(video.duration)}
              </span>
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-500 border-t border-white/10 pt-2">
            <div>
              Debug: Original={video.originalSize}, Processed=
              {video.compressedSize}
            </div>
            <div>
              Calculation:{" "}
              {Number(video.compressedSize) < Number(video.originalSize)
                ? "Compressed"
                : "Enlarged"}
            </div>
          </div>
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
                  <Image size={16} />
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
