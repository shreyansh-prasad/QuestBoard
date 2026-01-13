"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import AvatarEditor from "@/components/AvatarEditor";
import { BRANCHES, SECTIONS } from "@/lib/constants";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
}

interface FormErrors {
  bio?: string;
  displayName?: string;
  avatar?: string;
  branch?: string;
  section?: string;
  year?: string;
  general?: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarEditorImage, setAvatarEditorImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    bio: "",
    displayName: "",
    avatar: null as File | null,
    hideProfile: false,
    branch: "",
    section: "",
    year: "",
    instagramUrl: "",
    linkedinUrl: "",
    githubUrl: "",
  });

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/auth/login");
        return;
      }

      // Fetch profile - check ownership first
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setErrors({ general: `Failed to load profile: ${profileError.message}` });
        setLoading(false);
        return;
      }

      if (!profile) {
        setErrors({ general: "Profile not found" });
        setLoading(false);
        return;
      }

      // Check if user owns this profile
      if (profile.user_id !== user.id) {
        setErrors({ general: "You can only edit your own profile" });
        setLoading(false);
        return;
      }

      // Populate form
      setFormData({
        bio: profile.bio || "",
        displayName: profile.display_name || "",
        avatar: null,
        hideProfile: !profile.is_public,
        branch: profile.branch || "",
        section: profile.section ? String(profile.section) : "",
        year: profile.year ? String(profile.year) : "",
        instagramUrl: (profile as any).instagram_url || "",
        linkedinUrl: (profile as any).linkedin_url || "",
        githubUrl: (profile as any).github_url || "",
      });

      setCurrentAvatarUrl(profile.avatar_url);
      setLoading(false);
    } catch (error) {
      console.error("Error loading profile:", error);
      setErrors({ general: "Failed to load profile" });
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Bio validation (optional, but if provided, max length)
    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = "Bio must be less than 500 characters";
    }

    // Display name validation (optional, but if provided, max length)
    if (formData.displayName && formData.displayName.length > 100) {
      newErrors.displayName = "Display name must be less than 100 characters";
    }

    // Year validation (optional, but if provided, must be 1-4)
    if (formData.year) {
      const yearNum = parseInt(formData.year, 10);
      if (isNaN(yearNum) || yearNum < 1 || yearNum > 4) {
        newErrors.year = "Year must be between 1 and 4";
      }
    }

    // Section validation (optional, but if provided, must be 1 or 2)
    if (formData.section) {
      const sectionNum = parseInt(formData.section, 10);
      if (isNaN(sectionNum) || (sectionNum !== 1 && sectionNum !== 2)) {
        newErrors.section = "Section must be 1 or 2";
      }
    }

    // Avatar validation (optional, but if provided, validate)
    if (formData.avatar) {
      if (!formData.avatar.type.startsWith("image/")) {
        newErrors.avatar = "File must be an image";
      } else if (formData.avatar.size > 5 * 1024 * 1024) {
        newErrors.avatar = "Image size must be less than 5MB";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors({ avatar: "File must be an image" });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ avatar: "Image size must be less than 5MB" });
        return;
      }

      // Create preview and open editor
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageSrc = reader.result as string;
        setAvatarEditorImage(imageSrc);
        setShowAvatarEditor(true);
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({ ...prev, avatar: null }));
      setAvatarPreview(null);
    }
    // Clear error
    if (errors.avatar) {
      setErrors((prev) => ({ ...prev, avatar: undefined }));
    }
  };

  const handleAvatarEditorSave = (editedImageBlob: Blob) => {
    // Convert blob to File
    const fileName = `avatar-${Date.now()}.png`;
    const editedFile = new File([editedImageBlob], fileName, { type: "image/png" });
    
    setFormData((prev) => ({ ...prev, avatar: editedFile }));
    
    // Create preview from edited image
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(editedFile);
    
    setShowAvatarEditor(false);
    setAvatarEditorImage(null);
  };

  const handleAvatarEditorClose = () => {
    setShowAvatarEditor(false);
    setAvatarEditorImage(null);
    // Reset file input
    const fileInput = document.getElementById("avatar") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrors({ general: "You must be logged in to update your profile" });
        setSaving(false);
        return;
      }

      // Step 1: Upload avatar if provided
      let avatarUrl: string | null = currentAvatarUrl;
      if (formData.avatar) {
        try {
          const avatarFormData = new FormData();
          avatarFormData.append("file", formData.avatar);
          avatarFormData.append("userId", user.id);

          const uploadResponse = await fetch("/api/auth/upload-avatar", {
            method: "POST",
            credentials: "include", // Include cookies for authentication
            body: avatarFormData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            avatarUrl = uploadData.url;
          } else {
            const errorData = await uploadResponse.json();
            setErrors({ avatar: errorData.error || "Failed to upload avatar" });
            setSaving(false);
            return;
          }
        } catch (uploadError) {
          console.error("Avatar upload error:", uploadError);
          setErrors({ avatar: "Failed to upload avatar" });
          setSaving(false);
          return;
        }
      }

      // Step 2: Update profile
      const updatePayload = {
        bio: formData.bio || null,
        displayName: formData.displayName || null,
        avatarUrl,
        hideProfile: formData.hideProfile,
        branch: formData.branch || null,
        section: formData.section || null,
        year: formData.year || null,
        instagramUrl: formData.instagramUrl?.trim() || null,
        linkedinUrl: formData.linkedinUrl?.trim() || null,
        githubUrl: formData.githubUrl?.trim() || null,
      };

      const updateResponse = await fetch("/api/profile/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        const updateData = await updateResponse.json().catch(() => ({}));
        console.error("Profile update failed:", updateResponse.status, updateData);
        
        // Show more detailed error message
        let errorMessage = updateData.error || "Failed to update profile";
        if (updateData.details) {
          errorMessage += `: ${updateData.details}`;
        }
        if (updateData.hint) {
          errorMessage += ` (${updateData.hint})`;
        }
        
        setErrors({
          general: errorMessage,
        });
        setSaving(false);
        return;
      }

      const updateData = await updateResponse.json();

      // Check for warnings (e.g., social media fields couldn't be saved)
      if (updateData.warning) {
        // Show warning but don't block the redirect
        setErrors({ general: updateData.warning });
        // Still redirect after a short delay to show the warning
        setTimeout(() => {
          window.location.href = `/u/${username}`;
        }, 3000);
        return;
      }

      // Step 3: Redirect to profile page after successful update
      // Use window.location for a reliable redirect
      window.location.href = `/u/${username}`;
    } catch (error) {
      console.error("Update error:", error);
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-secondary">Loading profile...</p>
      </div>
    );
  }

  return (
    <>
      {/* Avatar Editor Modal */}
      {showAvatarEditor && avatarEditorImage && (
        <AvatarEditor
          imageSrc={avatarEditorImage}
          isOpen={showAvatarEditor}
          onClose={handleAvatarEditorClose}
          onSave={handleAvatarEditorSave}
        />
      )}

      <main className="min-h-screen py-8">
      <div className="max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold text-text-primary">
          Edit Profile
        </h1>

        {errors.general && (
          <div
            className="mb-4 rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-400"
            role="alert"
            aria-live="polite"
          >
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Display Name */}
          <div>
            <label
              htmlFor="displayName"
              className="mb-2 block text-sm font-medium text-text-primary"
            >
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              maxLength={100}
              aria-invalid={!!errors.displayName}
              aria-describedby={
                errors.displayName ? "displayName-error" : undefined
              }
              className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                errors.displayName
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-border"
              }`}
              placeholder="Your display name"
            />
            {errors.displayName && (
              <p
                id="displayName-error"
                className="mt-1 text-sm text-red-400"
                role="alert"
              >
                {errors.displayName}
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="mb-2 block text-sm font-medium text-text-primary"
            >
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              maxLength={500}
              aria-invalid={!!errors.bio}
              aria-describedby={errors.bio ? "bio-error" : undefined}
              className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                errors.bio
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-border"
              }`}
              placeholder="Tell us about yourself..."
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.bio && (
                <p
                  id="bio-error"
                  className="text-sm text-red-400"
                  role="alert"
                >
                  {errors.bio}
                </p>
              )}
              <p className="ml-auto text-sm text-text-muted">
                {formData.bio.length}/500
              </p>
            </div>
          </div>

          {/* Avatar Upload */}
          <div>
            <label
              htmlFor="avatar"
              className="mb-2 block text-sm font-medium text-text-primary"
            >
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border border-border">
                {avatarPreview || currentAvatarUrl ? (
                  <Image
                    src={avatarPreview || currentAvatarUrl || ""}
                    alt="Avatar preview"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-background text-2xl font-bold text-text-muted">
                    {formData.displayName.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <input
                type="file"
                id="avatar"
                name="avatar"
                accept="image/*"
                onChange={handleFileChange}
                aria-invalid={!!errors.avatar}
                aria-describedby={errors.avatar ? "avatar-error" : undefined}
                className={`w-full rounded-lg border bg-background px-4 py-2 text-sm text-text-primary file:mr-4 file:rounded-lg file:border-0 file:bg-background-card file:px-4 file:py-2 file:text-text-primary file:hover:bg-background-card/80 focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                  errors.avatar
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border"
                }`}
              />
            </div>
            {errors.avatar && (
              <p
                id="avatar-error"
                className="mt-1 text-sm text-red-400"
                role="alert"
              >
                {errors.avatar}
              </p>
            )}
          </div>

          {/* Branch, Year, and Section */}
          <div className="space-y-4 rounded-card bg-background-card border border-border p-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Academic Information
            </h2>

            {/* Branch */}
            <div>
              <label
                htmlFor="branch"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                Branch
              </label>
              <select
                id="branch"
                name="branch"
                value={formData.branch}
                onChange={handleInputChange}
                aria-invalid={!!errors.branch}
                aria-describedby={errors.branch ? "branch-error" : undefined}
                className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                  errors.branch
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border"
                }`}
              >
                <option value="">Select branch</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
              {errors.branch && (
                <p
                  id="branch-error"
                  className="mt-1 text-sm text-red-400"
                  role="alert"
                >
                  {errors.branch}
                </p>
              )}
            </div>

            {/* Year and Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="year"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Year
                </label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  min="1"
                  max="4"
                  value={formData.year}
                  onChange={handleInputChange}
                  aria-invalid={!!errors.year}
                  aria-describedby={errors.year ? "year-error" : undefined}
                  className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                    errors.year
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-border"
                  }`}
                  placeholder="1-4"
                />
                {errors.year && (
                  <p
                    id="year-error"
                    className="mt-1 text-sm text-red-400"
                    role="alert"
                  >
                    {errors.year}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="section"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Section
                </label>
                <select
                  id="section"
                  name="section"
                  value={formData.section}
                  onChange={handleInputChange}
                  aria-invalid={!!errors.section}
                  aria-describedby={errors.section ? "section-error" : undefined}
                  className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                    errors.section
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-border"
                  }`}
                >
                  <option value="">Select section</option>
                  {SECTIONS.map((s) => (
                    <option key={s} value={s === "none" ? "" : s}>
                      {s === "none" ? "No Section" : `Section ${s}`}
                    </option>
                  ))}
                </select>
                {errors.section && (
                  <p
                    id="section-error"
                    className="mt-1 text-sm text-red-400"
                    role="alert"
                  >
                    {errors.section}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="space-y-4 rounded-card bg-background-card border border-border p-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Social Media Links
            </h2>
            <p className="text-sm text-text-muted mb-4">
              Add links to your social media profiles. These will appear on your profile page.
            </p>

            {/* Instagram */}
            <div>
              <label
                htmlFor="instagramUrl"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                Instagram URL
              </label>
              <input
                type="url"
                id="instagramUrl"
                name="instagramUrl"
                value={formData.instagramUrl}
                onChange={handleInputChange}
                placeholder="https://instagram.com/yourusername"
                className="w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary border-border"
              />
            </div>

            {/* LinkedIn */}
            <div>
              <label
                htmlFor="linkedinUrl"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                LinkedIn URL
              </label>
              <input
                type="url"
                id="linkedinUrl"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleInputChange}
                placeholder="https://linkedin.com/in/yourusername"
                className="w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary border-border"
              />
            </div>

            {/* GitHub */}
            <div>
              <label
                htmlFor="githubUrl"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                GitHub URL
              </label>
              <input
                type="url"
                id="githubUrl"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleInputChange}
                placeholder="https://github.com/yourusername"
                className="w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary border-border"
              />
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4 rounded-card bg-background-card border border-border p-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Privacy Settings
            </h2>

            {/* Hide Profile Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label
                  htmlFor="hideProfile"
                  className="block text-sm font-medium text-text-primary"
                >
                  Hide Profile
                </label>
                <p className="mt-1 text-sm text-text-muted">
                  Make your profile private. Only you will be able to see it.
                </p>
              </div>
              <input
                type="checkbox"
                id="hideProfile"
                name="hideProfile"
                checked={formData.hideProfile}
                onChange={handleCheckboxChange}
                className="h-5 w-5 rounded border-border bg-background text-text-primary focus:ring-2 focus:ring-text-secondary"
              />
            </div>

          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className={`rounded-lg bg-text-primary px-6 py-2 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                saving ? "cursor-wait" : ""
              }`}
              aria-busy={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/u/${username}`)}
              disabled={saving}
              className="rounded-lg border border-border bg-background-card px-6 py-2 font-medium text-text-primary transition-colors hover:bg-background-card/80 focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      </main>
    </>
  );
}
