import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-text-primary">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-text-primary">
          Blog Post Not Found
        </h2>
        <p className="mb-8 text-text-secondary">
          The blog post you're looking for doesn't exist or has been removed.
        </p>
        <Link
          href="/blogs"
          className="inline-flex items-center gap-2 rounded-lg bg-text-primary px-6 py-3 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
        >
          Back to Blogs
        </Link>
      </div>
    </main>
  );
}
