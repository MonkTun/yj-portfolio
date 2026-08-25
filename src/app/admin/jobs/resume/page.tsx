import { listResumeFiles, loadApplications } from "@/lib/jobs/store";
import { ResumeWorkspace } from "@/components/admin/jobs/ResumeWorkspace";

export const dynamic = "force-dynamic";

// Full-bleed like /admin/edit — deliberately outside the (config) route group
// so the SuperDoc editor gets the whole viewport, no sidebar rail.
// ?file= opens a specific document; ?app= opens the tailor side panel (JD +
// missing-keyword checklist) for that application.
export default async function ResumeStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ file?: string; app?: string }>;
}) {
  const { file, app } = await searchParams;
  const files = await listResumeFiles();
  const application = app
    ? ((await loadApplications()).applications.find((a) => a.id === app) ?? null)
    : null;
  return (
    <ResumeWorkspace
      initialFiles={files.map((f) => f.name)}
      initialActive={file && files.some((f) => f.name === file) ? file : undefined}
      application={application}
    />
  );
}
