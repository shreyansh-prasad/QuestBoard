"use client";

import { useEffect, useRef, useState } from "react";

const quotes = [
  "Track the journey, not just the destination.",
  "Explore. Build. Improve.",
  "You are what you repeat.",
  "Be better than yesterday.",
];

export default function HomePage() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Use number | null because window.setInterval returns number in browsers
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const prefersReducedMotionRef = useRef<boolean>(false);

  const FADE_MS = 700; // must match CSS transition duration
  const INTERVAL_MS = 5000;

  // detect reduced-motion preference and listen for changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mq.matches;

    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };

    mq.addEventListener("change", handler);

    return () => {
      mq.removeEventListener("change", handler);
    };
  }, []);

  // core rotation logic
  useEffect(() => {
    // clear any existing timers (defensive)
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // if reduced motion is preferred, skip fades and animate less
    if (prefersReducedMotionRef.current) {
      intervalRef.current = window.setInterval(() => {
        setIndex((i) => (i + 1) % quotes.length);
      }, INTERVAL_MS);
      return () => {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
      };
    }

    // animated flow: fade out -> switch -> fade in
    intervalRef.current = window.setInterval(() => {
      setVisible(false); // start fade out
      // after fade duration, change quote and fade in
      timeoutRef.current = window.setTimeout(() => {
        setIndex((i) => (i + 1) % quotes.length);
        setVisible(true);
      }, FADE_MS);
    }, INTERVAL_MS);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  
  return (
    <main className="relative flex flex-col bg-black overflow-x-hidden" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }}>
      {/* drifting background gradient (subtle) */}
      <div className="fixed inset-0 -z-10 opacity-60 animate-gradientSlow pointer-events-none" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }} />

      {/* subtle grain texture (optional) */}
      <div
        className="fixed inset-0 -z-20 pointer-events-none opacity-5"
        style={{
          backgroundImage: "url('/noise.png')",
          backgroundRepeat: "repeat",
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          width: '100vw',
        }}
      />

      {/* Quote - Centered, takes full viewport height */}
      <div className="min-h-screen flex items-center justify-center py-12">
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="px-6 text-center"
        >
          <p
            className={`mx-auto max-w-5xl
              text-4xl sm:text-5xl md:text-6xl lg:text-6xl
              font-[450] leading-tight
              text-neutral-100
              transition-all duration-700 ease-out
              ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
            `}
            style={{ lineHeight: 1.08, letterSpacing: "-0.02em" }}
          >
            {quotes[index]}
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-gray-800 py-12 px-6 relative z-10 bg-black">
        <div className="mx-auto max-w-4xl">
          {/* Site Description */}
          <div className="mb-12 text-center">
            <p className="mx-auto max-w-3xl text-base leading-relaxed text-neutral-300">
              QuestBoard is NSUT's platform for turning goals into action. Set your goals, track your progress, share updates, and follow others on the same journey. With public progress and community support, students motivate each other to grow, stay consistent, and achieve more.
            </p>
          </div>

          {/* Tagline */}
          <div className="mb-12 border-t border-gray-800 pt-8">
            <p className="text-center text-lg font-medium text-neutral-200">
              Set it. Track it. Share it. Grow together — <span className="font-semibold text-neutral-100">QuestBoard (NSUT)</span>
            </p>
          </div>

          {/* Contact and Social */}
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            {/* Contact Information */}
            <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
              <h3 className="text-lg font-semibold text-neutral-100">Contact Me</h3>
              <div className="flex flex-col gap-2 text-sm text-neutral-400">
                <a 
                  href="tel:+917205307540" 
                  className="hover:text-neutral-100 transition-colors"
                >
                  Phone: +91 7205307540
                </a>
                <a 
                  href="mailto:questboard.nsut@gmail.com" 
                  className="hover:text-neutral-100 transition-colors"
                >
                  Email: questboard.nsut@gmail.com
                </a>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex flex-col items-center gap-3 md:items-end">
              <h3 className="text-lg font-semibold text-neutral-100">Follow Me</h3>
              <div className="flex items-center gap-4">
                {/* Instagram */}
                <a
                  href="https://www.instagram.com/shreyans_h1xp/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-neutral-100 transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>

                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/in/shreyansh-prasad-5ba6233a1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-neutral-100 transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>

                {/* GitHub */}
                <a
                  href="https://github.com/shreyansh-prasad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-neutral-100 transition-colors"
                  aria-label="GitHub"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
