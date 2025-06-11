import React, { useState, useCallback, useEffect } from "react";
import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import { Download, Clock, FileDown, FileUp, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { filesize } from "filesize";
import { Video } from "@/types";
import { useRouter } from "next/navigation";

dayjs.extend(relativeTime);

interface VideoCardProps {
  video: Video;
  onDownload: (url: string, title: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onDownload,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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

  const getFullVideoUrl = (publicId: string) =>
    getCldVideoUrl({ src: publicId, width: 1920, height: 1080 });

  const formatSize = (size: number) => filesize(size);
  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const compressionPercentage = Math.round(
    (1 - Number(video.compressedSize) / Number(video.originalSize)) * 100
  );

  useEffect(() => {
    setPreviewError(false);
  }, [isHovered]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await fetch(`/api/deletevideos/${video.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      router.refresh();
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        `Failed to delete video: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-video-id={video.id}
    >
      {isDeleting && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 rounded-lg">
          <div className="bg-white rounded-lg p-4 flex items-center gap-3">
            <div className="loading loading-spinner loading-md"></div>
            <span className="text-black font-semibold">Deleting video...</span>
          </div>
        </div>
      )}

      <figure className="aspect-video relative">
        {isHovered ? (
          previewError ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <p className="text-red-500">Preview not available</p>
            </div>
          ) : (
            <video
              src={getPreviewVideoUrl(video.publicId)}
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
              onError={() => setPreviewError(true)}
            />
          )
        ) : (
          <img
            src={getThumbnailUrl(video.publicId)}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute bottom-2 right-2 bg-base-100/70 px-2 py-1 rounded-lg text-sm flex items-center">
          <Clock size={16} className="mr-1" />
          {formatDuration(video.duration)}
        </div>
      </figure>

      <div className="card-body p-4">
        <h2 className="card-title text-lg font-bold">{video.title}</h2>
        <p className="text-sm opacity-70 mb-2">{video.description}</p>
        <p className="text-sm opacity-70 mb-4">
          Uploaded {dayjs(video.createdAt).fromNow()}
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <FileUp size={18} className="mr-2 text-primary" />
            <div>
              <div className="font-semibold">Original</div>
              <div>{formatSize(Number(video.originalSize))}</div>
            </div>
          </div>
          <div className="flex items-center">
            <FileDown size={18} className="mr-2 text-secondary" />
            <div>
              <div className="font-semibold">Compressed</div>
              <div>{formatSize(Number(video.compressedSize))}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm font-semibold">
            Compression: <span className="text-accent">{compressionPercentage}%</span>
          </div>

          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onDownload(getFullVideoUrl(video.publicId), video.title)}
              disabled={isDownloading || isDeleting}
              title="Download video"
            >
              {isDownloading ? (
                <>
                  <div className="loading loading-spinner loading-xs" />
                  <span className="ml-1">Downloading...</span>
                </>
              ) : (
                <Download size={16} />
              )}
            </button>

            <button
              className="btn btn-sm btn-error"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete video"
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
