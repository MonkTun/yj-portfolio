import { listResumeFiles } from "@/lib/jobs/store";
import { ResumeWorkspace } from "@/components/admin/jobs/ResumeWorkspace";

export const dynamic = "force-dynamic";

// Full-bleed like /admin/edit — deliberately outside the (config) route group
// so the SuperDoc editor gets the whole viewport, no sidebar rail.
export default async function ResumeStudioPage() {
  const files = await listResumeFiles();
  return <ResumeWorkspace initialFiles={files.map((f) => f.name)} />;
}
