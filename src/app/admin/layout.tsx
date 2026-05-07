import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor — YJ",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground relative isolate z-10">
      {children}
    </div>
  );
}
