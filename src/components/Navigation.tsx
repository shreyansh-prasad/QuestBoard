"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ConfirmModal from "./ConfirmModal";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching profile:", error);
    }
    if (data) {
      setProfile(data);
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    // Check auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchProfile(user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Refresh profile when pathname changes if profile is missing
  // This ensures the profile link appears after profile creation
  useEffect(() => {
    if (user?.id && !profile) {
      // If user is logged in but profile is missing, try fetching again
      // This handles the case where profile was just created
      const timer = setTimeout(() => {
        fetchProfile(user.id);
      }, 1000); // Small delay to allow profile creation to complete
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user?.id]);

  const handleSignOut = () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    setShowSignOutModal(false);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/");
  };

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/explore", label: "Explore", icon: "🔍" },
    { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  ];

  const authLinks = user
    ? [
        { href: profile?.username ? `/u/${profile.username}` : "/u", label: "My Profile", icon: "👤" },
        { href: "/profile/liked", label: "Liked Profiles", icon: "❤️" },
        { href: "/quests/new", label: "New Quest", icon: "✨" },
        { href: "/posts/new", label: "New Post", icon: "➕" },
      ]
    : [
        { href: "/auth/login", label: "Login", icon: "🔐" },
        { href: "/auth/signup", label: "Sign Up", icon: "📋" },
      ];

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border bg-black">
        <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center w-full justify-between">
          {/* Logo/Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-white transition-colors hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 rounded flex-shrink-0"
          >
            <span>🎯</span>
            <span>QuestBoard</span>
          </Link>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex md:items-center md:gap-6 flex-1 justify-center">
            {/* Main Links */}
            <div className="flex items-center gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    isActive(link.href)
                      ? "bg-gray-200 border border-gray-300 text-black"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-600" />

            {/* User Actions */}
            <div className="hidden md:flex md:items-center md:gap-3">
            {user ? (
              <>
                {authLinks.map((link) => {
                  // Don't render "My Profile" link if profile username is not available
                  if (link.label === "My Profile" && !profile?.username) {
                    return null;
                  }
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                        isActive(link.href)
                          ? "bg-gray-200 border border-gray-300 text-black"
                          : "text-gray-400 hover:text-gray-300"
                      }`}
                      aria-current={isActive(link.href) ? "page" : undefined}
                    >
                      <span>{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSignOut();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label="Sign out"
                >
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                {authLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      isActive(link.href)
                        ? "bg-gray-200 border border-gray-300 text-black"
                        : "bg-gray-800 text-gray-400 hover:text-gray-300"
                    }`}
                    aria-current={isActive(link.href) ? "page" : undefined}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </>
            )}
            </div>
          </div>

          {/* Mobile Menu Button - Pushed to extreme right */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-text-secondary hover:text-text-primary hover:bg-background-card transition-colors focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background ml-auto"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className="text-2xl">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-700 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  isActive(link.href)
                    ? "bg-gray-200 border border-gray-300 text-black"
                    : "text-gray-400 hover:text-gray-300"
                }`}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
            <div className="h-px bg-gray-700 my-2" />
            {user ? (
              <>
                {authLinks.map((link) => {
                  // Don't render "My Profile" link if profile username is not available
                  if (link.label === "My Profile" && !profile?.username) {
                    return null;
                  }
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                        isActive(link.href)
                          ? "bg-gray-200 border border-gray-300 text-black"
                          : "text-gray-400 hover:text-gray-300"
                      }`}
                      aria-current={isActive(link.href) ? "page" : undefined}
                    >
                      <span>{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSignOut();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 text-left"
                >
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              authLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    isActive(link.href)
                      ? "bg-gray-200 border border-gray-300 text-black"
                      : "bg-gray-800 text-gray-400 hover:text-gray-300"
                  }`}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </nav>

    {/* Sign Out Confirmation Modal */}
    <ConfirmModal
      isOpen={showSignOutModal}
      title="Sign Out"
      message="Are you sure you want to sign out?"
      confirmText="Sign Out"
      cancelText="Cancel"
      onConfirm={confirmSignOut}
      onCancel={() => setShowSignOutModal(false)}
    />
    </>
  );
}
