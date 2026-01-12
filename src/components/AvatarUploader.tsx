"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

interface AvatarUploaderProps {
  /** Current avatar URL to display */
  currentAvatarUrl?: string | null;
  /** Callback when upload is successful, receives the new avatar URL */
  onUploadComplete?: (avatarUrl: string) => void;
  /** Callback when upload fails, receives error message */
  onUploadError?: (error: string) => void;
  /** Callback when file is selected (for signup flow - file not uploaded yet) */
  onFileSelect?: (file: File | null) => void;
  /** Whether to automatically update profile.avatar_url after upload */
  autoUpdateProfile?: boolean;
  /** Size of the avatar display (width and height in pixels) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** If true, only stores file for later upload (doesn't upload immediately) */
  storeFileOnly?: boolean;
}

export default function AvatarUploader({
  currentAvatarUrl,
  onUploadComplete,
  onUploadError,
  onFileSelect,
  autoUpdateProfile = false,
  size = 120,
  className = "",
  disabled = false,
  storeFileOnly = false,
}: AvatarUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset preview when currentAvatarUrl changes externally
  useEffect(() => {
    if (!selectedFile) {
      setPreview(null);
    }
  }, [currentAvatarUrl, selectedFile]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setError(null);

    if (!file) {
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      const errorMsg = "File must be an image";
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      const errorMsg = "Image size must be less than 5MB";
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    setSelectedFile(file);

    // Notify parent component if storeFileOnly mode
    if (storeFileOnly) {
      onFileSelect?.(file);
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("No file selected");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to upload an avatar");
      }

      // Create FormData for upload
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("userId", user.id);

      // Upload to API
      const uploadResponse = await fetch("/api/auth/upload-avatar", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Failed to upload avatar");
      }

      const uploadData = await uploadResponse.json();
      const avatarUrl = uploadData.url;

      // Optionally update profile automatically
      if (autoUpdateProfile) {
        const updateResponse = await fetch("/api/profile/update", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ avatarUrl }),
        });

        if (!updateResponse.ok) {
          const updateError = await updateResponse.json();
          throw new Error(
            updateError.error || "Upload succeeded but failed to update profile"
          );
        }
      }

      // Clear selected file and preview (keep showing the uploaded image via currentAvatarUrl)
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Call success callback
      onUploadComplete?.(avatarUrl);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload avatar";
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    if (storeFileOnly) {
      onFileSelect?.(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAvatarClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Display preview or current avatar or placeholder
  const displayImage = preview || currentAvatarUrl;
  const displayInitials = displayImage
    ? null
    : "U"; // You could pass initials as a prop if needed

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Avatar Display */}
      <div
        className={`relative flex-shrink-0 overflow-hidden rounded-full border-2 border-border transition-all ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-text-secondary focus-within:border-text-secondary focus-within:ring-2 focus-within:ring-text-secondary focus-within:ring-offset-2 focus-within:ring-offset-background"
        }`}
        style={{ width: `${size}px`, height: `${size}px` }}
        onClick={handleAvatarClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Click to upload avatar"
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleAvatarClick();
          }
        }}
      >
        {displayImage ? (
          <Image
            src={displayImage}
            alt="Avatar preview"
            fill
            className="object-cover"
            sizes={`${size}px`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-background text-3xl font-bold text-text-muted">
            {displayInitials}
          </div>
        )}

        {/* Upload Overlay */}
        {!disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
            <span className="text-sm font-medium text-white">
              {uploading ? "Uploading..." : "Change"}
            </span>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
        aria-label="Avatar file input"
        id="avatar-upload-input"
      />

      {/* File Info and Actions */}
      {selectedFile && (
        <div className="w-full space-y-2">
          <div className="rounded-lg bg-background-card border border-border p-3">
            <p className="text-sm text-text-primary">
              Selected: {selectedFile.name}
            </p>
            <p className="text-xs text-text-muted">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>

          <div className="flex gap-2">
            {!storeFileOnly && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={disabled || uploading}
                className="flex-1 rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Upload avatar"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            )}
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className={storeFileOnly ? "flex-1 rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50" : "rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"}
              aria-label="Remove selected file"
            >
              {storeFileOnly ? "Remove" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="w-full rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {/* Help Text */}
      {!selectedFile && !error && (
        <p className="text-xs text-text-muted text-center">
          Click avatar to upload
          <br />
          Max 5MB, JPG/PNG/GIF
        </p>
      )}
    </div>
  );
}
