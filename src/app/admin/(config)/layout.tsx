import { AdminSidebar } from "@/components/admin/AdminSidebar";

// Sidebar shell shared by every settings page (/admin/pages, /admin/routing,
// /admin/theme). The block editor at /admin/edit/[...slug] sits OUTSIDE this
// route group so it keeps its full-bleed canvas without a left rail.
export default function ConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-border px-8 py-12 sticky top-0 self-start h-screen">
        <AdminSidebar />
      </aside>
      <main className="flex-1 px-12 py-16">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
