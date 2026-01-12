import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="mb-4 text-4xl font-bold text-text-primary">
        Profile Not Found
      </h1>
      <p className="mb-8 text-text-secondary">
        The profile you're looking for doesn't exist or is private.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-text-primary px-6 py-2 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
      >
        Go Home
      </Link>
    </div>
  );
}
