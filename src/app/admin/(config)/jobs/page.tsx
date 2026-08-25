import Link from "next/link";
import { loadApplications, listResumeFiles } from "@/lib/jobs/store";
import { JobsBoard } from "@/components/admin/jobs/JobsBoard";

export const dynamic = "force-dynamic";

export default async function JobsIndex() {
  const [{ applications }, resumeFiles] = await Promise.all([
    loadApplications(),
    listResumeFiles(),
  ]);

  return (
    <>
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="kicker">04 — Applications</p>
          <h1 className="font-display text-6xl mt-4">Jobs</h1>
          <p className="mt-4 text-foreground/70 italic max-w-2xl">
            Internship & job tracker. Data lives in{" "}
            <code className="font-sans text-sm">content/jobs/</code> —
            gitignored, local only. Paste a Greenhouse / Lever / Ashby URL to
            autofill; anything else, paste the JD.
          </p>
        </div>
        <Link
          href="/admin/jobs/resume"
          className="kicker shrink-0 px-4 py-2.5 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
        >
          Resume studio →
        </Link>
      </header>

      <JobsBoard initial={applications} resumeFiles={resumeFiles.map((f) => f.name)} />
    </>
  );
}
