"use client";

import { useState } from "react";

interface ShareProfileButtonProps {
  username: string;
  displayName: string;
}

export default function ShareProfileButton({ username, displayName }: ShareProfileButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/u/${username}`;

    // Try Web Share API first (mobile/native apps)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} (@${username})`,
          text: `Check out ${displayName}'s profile on QuestBoard`,
          url: profileUrl,
        });
        return;
      } catch (error: any) {
        // User cancelled or error occurred, fall back to clipboard
        if (error.name !== "AbortError") {
          console.error("Error sharing:", error);
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = profileUrl;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
      aria-label={copied ? "Link copied!" : "Share profile"}
    >
      <span>{copied ? "✓" : "🔗"}</span>
      <span>{copied ? "Copied!" : "Share"}</span>
    </button>
  );
}
