import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "QuestBoard (NSUT) - Set it. Track it. Share it. Grow together.",
  description: "QuestBoard is NSUT's platform for turning goals into action. Set your goals, track your progress, share updates, and follow others on the same journey. With public progress and community support, students motivate each other to grow, stay consistent, and achieve more.",
  keywords: ["QuestBoard", "NSUT", "goal tracking", "progress", "blog", "community", "students"],
  openGraph: {
    title: "QuestBoard (NSUT)",
    description: "Set your goals, track your progress, share updates, and follow others on the same journey.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <Navigation />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </body>
    </html>
  );
}
