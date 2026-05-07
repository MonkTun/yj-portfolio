import { redirect } from "next/navigation";

// /admin is a redirect into the default settings tab. Anything that needs
// real content lives under /admin/(config)/* (sidebar layout) or
// /admin/edit/[...slug] (full-bleed editor).
export default function AdminIndex() {
  redirect("/admin/pages");
}
