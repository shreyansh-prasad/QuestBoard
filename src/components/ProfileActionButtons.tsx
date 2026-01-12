"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ConfirmModal from "./ConfirmModal";

interface ProfileActionButtonsProps {
  username: string;
}

export default function ProfileActionButtons({ username }: ProfileActionButtonsProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError(null);
    setShowDeleteModal(false);

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete account"
      );
      setDeleting(false);
    }
  };

  return (
    <>
      <Link
        href={`/u/${username}/edit`}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
      >
        <span>✏️</span>
        <span>Edit Profile</span>
      </Link>
      <button
        onClick={() => setShowDeleteModal(true)}
        disabled={deleting}
        className="inline-flex items-center gap-2 rounded-lg border border-red-600 bg-red-600/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Delete account"
      >
        <span>🗑️</span>
        <span>{deleting ? "Deleting..." : "Delete Account"}</span>
      </button>

      {error && (
        <div className="w-full rounded-lg border border-red-500/50 bg-red-500/10 p-3">
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Account"
        message="This will permanently delete your account, profile, quests, posts, and all associated data. This action cannot be undone."
        confirmText="Delete Account"
        cancelText="Cancel"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
        requireConfirmInput={true}
        confirmInputValue="DELETE"
        confirmInputPlaceholder="Type DELETE to confirm"
        danger={true}
      />
    </>
  );
}
