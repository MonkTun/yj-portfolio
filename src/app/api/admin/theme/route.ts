import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { loadTheme, saveTheme } from "@/lib/content";
import { themeSchema } from "@/lib/schema";
import { fontFitsRole, FONT_ROLES } from "@/lib/fonts";

export const runtime = "nodejs";

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  const theme = await loadTheme();
  return NextResponse.json(theme);
}

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = themeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid theme", detail: parsed.error.message },
      { status: 400 },
    );
  }

  if (
    !parsed.data.palettes.some((p) => p.id === parsed.data.activePaletteId)
  ) {
    return NextResponse.json(
      { error: "Active palette must be one of the saved palettes." },
      { status: 400 },
    );
  }

  // Each font id must reference a font that is actually loaded by
  // layout.tsx and can fill the requested role. Otherwise the page would
  // silently fall back to the default and the user's edit would feel broken.
  for (const palette of parsed.data.palettes) {
    for (const role of FONT_ROLES) {
      const fontId = palette.fonts[role];
      if (!fontFitsRole(fontId, role)) {
        return NextResponse.json(
          {
            error: `Palette "${palette.name}": font "${fontId}" is not a valid ${role} font.`,
          },
          { status: 400 },
        );
      }
    }
  }

  try {
    const saved = await saveTheme(parsed.data);
    // The active palette is read in the root layout, so any route that
    // depends on the layout (i.e. all of them) needs to be revalidated.
    try {
      revalidatePath("/", "layout");
    } catch {
      // Outside render context — non-fatal in dev.
    }
    return NextResponse.json({ ok: true, theme: saved });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save", detail: String(err) },
      { status: 500 },
    );
  }
}
