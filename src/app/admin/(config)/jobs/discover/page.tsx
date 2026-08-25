import Link from "next/link";
import { DiscoverList } from "@/components/admin/jobs/DiscoverList";

export const dynamic = "force-dynamic";

export default function DiscoverPage() {
  return (
    <>
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="kicker">04 — Applications</p>
          <h1 className="font-display text-6xl mt-4">Discover</h1>
          <p className="mt-4 text-foreground/70 italic max-w-2xl">
            Fresh internship &amp; new-grad leads from SimplifyJobs plus every
            watchlist company&apos;s ATS board, ranked by resume match.
            Track promotes a lead to the board with the JD snapshotted.
          </p>
        </div>
        <Link
          href="/admin/jobs"
          className="kicker shrink-0 px-4 py-2.5 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
        >
          ← Board
        </Link>
      </header>

      <DiscoverList />
    </>
  );
}
