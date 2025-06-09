import React, { useState, useCallback } from "react";
import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import { Download, Clock, FileDown, FileUp } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { filesize } from "filesize";
import { Video } from "@/types";

dayjs.extend(relativeTime);

interface VideoCardProps {
  video: Video;
  onDownload: (url: string, title: string) => void;
}

/**
 * Responsive and accessible Video Card component
 * – Hover preview on desktop
 * – Optimised thumbnail sizes
 * – Responsive typography & layout
 * – Smooth hover elevation and scale
 */
const VideoCard: React.FC<VideoCardProps> = ({ video, onDownload }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  /* ———————————————————————————————————— */
  /* Cloudinary helpers                                                      */
  /* ———————————————————————————————————— */
  const getThumbnailUrl = useCallback(
    (publicId: string) =>
      getCldImageUrl({
        src: publicId,
        width: 640,
        height: 360,
        crop: "fill",
        gravity: "auto",
        format: "jpg",
        quality: "auto",
        assetType: "video",
      }),
    []
  );

  const getFullVideoUrl = useCallback(
    (publicId: string) =>
      getCldVideoUrl({
        src: publicId,
        width: 1920,
        height: 1080,
      }),
    []
  );

  const getPreviewVideoUrl = useCallback(
    (publicId: string) =>
      getCldVideoUrl({
        src: publicId,
        rawTransformations: ["e_preview:duration_8"],
        width: 640,
        height: 360,
      }),
    []
  );

  /* ———————————————————————————————————— */
  /* Format helpers                                                          */
  /* ———————————————————————————————————— */
  const formatSize = useCallback((size: number) => filesize(size), []);

  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  /* ———————————————————————————————————— */
  /* Derived values                                                          */
  /* ———————————————————————————————————— */
  const originalSize = Number(video.orignalSize ?? 0);
  const compressedSize = Number(video.compressedSize ?? 0);
  const compressionPercentage =
    originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;

  /* ———————————————————————————————————— */
  /* UI handlers                                                             */
  /* ———————————————————————————————————— */
  const handlePreviewError = () => setPreviewError(true);

  /* ———————————————————————————————————— */
  /* JSX                                                                     */
  /* ———————————————————————————————————— */
  return (
    <div
      className="card bg-base-300 shadow-lg transition-all duration-300 sm:hover:-translate-y-1 sm:hover:scale-[1.02] sm:hover:shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail / Hover Preview */}
      <figure className="relative aspect-[16/9] overflow-hidden rounded-t-xl">
        {isHovered && !previewError ? (
          <video
            src={getPreviewVideoUrl(video.publicId)}
            autoPlay
            muted
            loop
            className="h-full w-full object-cover"
            onError={handlePreviewError}
          />
        ) : (
          <img
            src={getThumbnailUrl(video.publicId)}
            alt={video.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-base-100/70 px-2 py-1 text-xs font-medium backdrop-blur-sm">
          <Clock size={14} />
          {formatDuration(video.duration)}
        </span>
      </figure>

      {/* Card body */}
      <div className="card-body space-y-3 p-4 sm:p-6">
        {/* Title */}
        <h2 className="card-title line-clamp-2 text-base sm:text-lg">
          {video.title}
        </h2>

        {/* Description */}
        {video.description && (
          <p className="line-clamp-3 text-xs opacity-80 sm:text-sm">
            {video.description}
          </p>
        )}

        {/* Uploaded date */}
        <p className="text-xs opacity-70">
          Uploaded {dayjs(video.createdAt).fromNow()}
        </p>

        {/* Size grid */}
        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <FileUp size={18} className="text-primary" />
            <div>
              <p className="font-semibold">Original</p>
              <p className="truncate">{formatSize(originalSize)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileDown size={18} className="text-secondary" />
            <div>
              <p className="font-semibold">Compressed</p>
              <p className="truncate">{formatSize(compressedSize)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium sm:text-sm">
            Compression: <span className="text-accent">{compressionPercentage}%</span>
          </span>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => onDownload(getFullVideoUrl(video.publicId), video.title)}
          >
            <Download size={16} />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
