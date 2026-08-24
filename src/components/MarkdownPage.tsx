import NextImage from "next/image";
import type {
  Blockquote,
  Code,
  Heading,
  Image as MdImage,
  List,
  Paragraph,
  PhrasingContent,
  RootContent,
  Table,
} from "mdast";

import type { Doc } from "@/lib/markdown";
import { resolveDocSrc } from "@/lib/markdown";
import {
  buttonPropsSchema,
  quotePropsSchema,
  videoPropsSchema,
} from "@/lib/schema";
import { cn } from "@/lib/utils";
import { textVariantClass } from "@/components/atoms/atomStyles";
import { isOptimizableImageSrc } from "@/components/atoms/imageStyles";
import { Button } from "@/components/atoms/Button";
import { Quote } from "@/components/atoms/Quote";
import { Video } from "@/components/atoms/Video";

/* ============================================================
   MarkdownPage — the editorial template for content/docs pages.

   Authoring conventions (see content/docs/README.md):
     - an H4+ heading (#### Anything) renders as a kicker label; when
       it immediately precedes an H2 the two form the kicker + hairline
       section lockup from the grid pages
     - a paragraph containing only images renders as a figure (one
       image) or a side-by-side gallery row (several); an image
       title — ![alt](src "…") — becomes the caption
     - a paragraph that is only a bare YouTube URL embeds the video
     - a paragraph that is only labeled links renders as buttons
       (ghost when the label starts with "←")
     - ---, blockquotes, lists, code and tables get token styling

   Typography reuses the exact class maps the grid atoms use
   (atomStyles.ts), so a markdown page and a grid page are
   typographically identical.
   ============================================================ */

const YOUTUBE_RE =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?\S*v=|shorts\/|embed\/)|youtu\.be\/)\S+$/i;

/** Widest measure for running prose — headings and media go wider. */
const PROSE = "max-w-3xl";

export function MarkdownPage({ doc }: { doc: Doc }) {
  const nodes = doc.tree.children;
  const heroEnd = heroExtent(nodes);
  const hero = nodes.slice(0, heroEnd);
  const rest = nodes.slice(heroEnd);

  return (
    <article className="w-full">
      {hero.length > 0 && (
        <section className="relative w-full flex min-h-[55vh] items-center py-20 md:py-24">
          <div className="w-full max-w-7xl mx-auto px-6 md:px-10">
            <Blocks nodes={hero} inHero />
          </div>
        </section>
      )}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 pb-20 md:pb-28">
        <Blocks nodes={rest} />
      </div>
    </article>
  );
}

/**
 * The hero is the leading run of text-only content (kicker, H1, tagline,
 * buttons) — it ends at the first image, video, H2, rule, or other
 * structural node. Pages that don't open with an H1 get no hero treatment.
 */
function heroExtent(nodes: RootContent[]): number {
  if (!nodes.some((n, i) => i < 4 && n.type === "heading" && n.depth === 1)) {
    return 0;
  }
  let end = 0;
  for (const node of nodes) {
    // The H1 and kicker headings belong to the hero.
    if (node.type === "heading" && (node.depth === 1 || node.depth >= 4)) {
      end++;
      continue;
    }
    if (node.type === "paragraph" && classifyParagraph(node) !== "prose") {
      // button rows may sit in the hero…
      if (classifyParagraph(node) === "buttons") {
        end++;
        continue;
      }
      break; // …images / videos end it
    }
    if (node.type === "paragraph") {
      end++;
      continue;
    }
    break;
  }
  return end;
}

function Blocks({
  nodes,
  inHero = false,
}: {
  nodes: RootContent[];
  inHero?: boolean;
}) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Kicker + H2 lockup — the "01 ————" pattern from the grid pages.
    if (
      node.type === "heading" &&
      node.depth >= 4 &&
      nodes[i + 1]?.type === "heading" &&
      (nodes[i + 1] as Heading).depth === 2
    ) {
      const h2 = nodes[i + 1] as Heading;
      out.push(
        <div key={i} className={cn(!inHero && "mt-16 md:mt-24")}>
          <div className="flex items-baseline gap-6">
            <span className="kicker shrink-0">
              <Inline nodes={node.children} />
            </span>
            <span aria-hidden className="flex-1 border-t border-border self-center" />
          </div>
          <HeadingEl node={h2} className="mt-4" />
        </div>
      );
      i++;
      continue;
    }

    out.push(
      <BlockNode
        key={i}
        node={node}
        prev={nodes[i - 1]}
        inHero={inHero}
        first={i === 0}
      />
    );
  }
  return <>{out}</>;
}

function BlockNode({
  node,
  prev,
  inHero,
  first,
}: {
  node: RootContent;
  prev?: RootContent;
  inHero: boolean;
  first: boolean;
}) {
  const prevIsKicker = prev?.type === "heading" && prev.depth >= 4;

  switch (node.type) {
    case "heading":
      return (
        <HeadingEl
          node={node}
          className={cn(
            node.depth === 1 && "mt-4",
            node.depth === 2 && !first && "mt-16 md:mt-24",
            node.depth === 3 &&
              (prevIsKicker ? "mt-3" : !first && "mt-10 md:mt-14"),
            node.depth >= 4 &&
              !first &&
              (inHero ? "mb-2" : "mt-12 md:mt-16")
          )}
        />
      );

    case "paragraph":
      return (
        <ParagraphEl
          node={node}
          inHero={inHero}
          first={first}
          prevIsKicker={prevIsKicker}
        />
      );

    case "thematicBreak":
      return <hr className="rule mt-12 md:mt-16" />;

    case "blockquote":
      return <BlockquoteEl node={node} />;

    case "list":
      return <ListEl node={node} />;

    case "code":
      return <CodeEl node={node} />;

    case "table":
      return <TableEl node={node} />;

    case "html":
      // Raw HTML in markdown is not rendered — it shows as-is nowhere.
      // (Keeps the surface sanitized; use the conventions instead.)
      return null;

    default:
      return null;
  }
}

/* ----- Headings ----- */

function headingSlug(node: Heading): string {
  return plainText(node.children)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function HeadingEl({ node, className }: { node: Heading; className?: string }) {
  const inline = <Inline nodes={node.children} />;
  if (node.depth >= 4) {
    // #### Kicker — the mono/uppercase label from the grid pages. A small
    // heading in Obsidian, a kicker on the site.
    return <p className={cn("kicker", className)}>{inline}</p>;
  }
  if (node.depth === 1) {
    return (
      <h1 className={cn(textVariantClass.h1, "text-foreground", className)}>
        {inline}
      </h1>
    );
  }
  if (node.depth === 2) {
    return (
      <h2
        id={headingSlug(node)}
        className={cn(textVariantClass.h2, "text-foreground scroll-mt-24", className)}
      >
        {inline}
      </h2>
    );
  }
  return (
    <h3
      id={headingSlug(node)}
      className={cn(
        textVariantClass.h3,
        "text-foreground scroll-mt-24",
        "max-w-4xl",
        className
      )}
    >
      {inline}
    </h3>
  );
}

/* ----- Paragraph classification ----- */

type ParagraphKind = "media" | "video" | "buttons" | "prose";

function classifyParagraph(node: Paragraph): ParagraphKind {
  const kids = node.children;
  const meaningful = kids.filter(
    (k) => !(k.type === "text" && k.value.trim() === "") && k.type !== "break"
  );

  if (meaningful.length > 0 && meaningful.every((k) => k.type === "image")) {
    return "media";
  }

  if (meaningful.length === 1 && meaningful[0].type === "link") {
    const link = meaningful[0];
    const label = plainText(link.children);
    if (YOUTUBE_RE.test(link.url) && label === link.url) return "video";
  }
  // Bare URL that gfm didn't autolink (shouldn't happen, but cheap to cover).
  if (meaningful.length === 1 && meaningful[0].type === "text") {
    const value = meaningful[0].value.trim();
    if (YOUTUBE_RE.test(value)) return "video";
  }

  if (
    meaningful.length > 0 &&
    meaningful.every(
      (k) => k.type === "link" && plainText(k.children) !== k.url
    )
  ) {
    return "buttons";
  }

  return "prose";
}

function ParagraphEl({
  node,
  inHero,
  first,
  prevIsKicker,
}: {
  node: Paragraph;
  inHero: boolean;
  first: boolean;
  prevIsKicker: boolean;
}) {
  const kind = classifyParagraph(node);

  if (kind === "video") {
    const url =
      node.children[0].type === "link"
        ? node.children[0].url
        : plainText(node.children).trim();
    return (
      <div className="mt-8 md:mt-10 max-w-4xl">
        <Video {...videoPropsSchema.parse({ url })} />
      </div>
    );
  }

  if (kind === "buttons") {
    const links = node.children.filter((k) => k.type === "link");
    return (
      <div className="mt-8 flex flex-wrap gap-3">
        {links.map((link, i) => {
          const label = plainText(link.children);
          const ghost = /^[←⟵]/.test(label);
          return (
            <div key={i} className="w-fit h-11">
              <Button
                {...buttonPropsSchema.parse({
                  label,
                  href: link.url,
                  variant: ghost ? "ghost" : "primary",
                  align: "center",
                  newTab: /^https?:/i.test(link.url),
                })}
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (kind === "media") {
    const images = node.children.filter((k) => k.type === "image");
    return <MediaRow images={images} />;
  }

  return (
    <p
      className={cn(
        textVariantClass.body,
        "text-foreground",
        inHero ? "max-w-2xl" : PROSE,
        first ? undefined : prevIsKicker ? "mt-4" : "mt-6",
        inHero && "mt-8"
      )}
    >
      <Inline nodes={node.children} />
    </p>
  );
}

/* ----- Media ----- */

function MediaRow({ images }: { images: MdImage[] }) {
  const cols =
    images.length >= 3
      ? "md:grid-cols-3"
      : images.length === 2
        ? "md:grid-cols-2"
        : "";
  return (
    <div className={cn("mt-8 md:mt-10 grid grid-cols-1 gap-4 items-start", cols)}>
      {images.map((img, i) => (
        <MdFigure key={i} node={img} />
      ))}
    </div>
  );
}

/** Default measure for a figure — Obsidian-like, not a full-bleed column. */
const FIGURE_MAX_W = 896; // px, = max-w-4xl
/** Portrait/square images additionally cap at this display height. */
const FIGURE_MAX_H = 560; // px
/** Aspect ratio at or above which an image counts as "wide" (no height cap). */
const WIDE_ASPECT = 1.6;

function MdFigure({ node }: { node: MdImage }) {
  const src = resolveDocSrc(node.url);
  const dims = node.data as { width?: number; height?: number } | undefined;
  // Obsidian's display-size suffix: ![alt|300](...) or ![alt|300x200](...).
  // Honor the width as the display width; strip it from the alt text.
  let alt = node.alt ?? "";
  let displayWidth: number | undefined;
  const sizeMatch = alt.match(/^(.*?)\|(\d+)(?:x\d+)?$/);
  if (sizeMatch) {
    alt = sizeMatch[1].trim();
    displayWidth = Number(sizeMatch[2]);
  }

  // Sizing: an explicit |width wins; otherwise cap at the figure measure,
  // never upscale past the file's natural width, and keep portrait/square
  // images under FIGURE_MAX_H so a tall screenshot can't wall off the page.
  let maxWidth = displayWidth;
  if (!maxWidth && dims?.width && dims?.height) {
    maxWidth = Math.min(FIGURE_MAX_W, dims.width);
    const aspect = dims.width / dims.height;
    if (aspect < WIDE_ASPECT) {
      maxWidth = Math.min(maxWidth, Math.round(aspect * FIGURE_MAX_H));
    }
  }
  const figureStyle = maxWidth ? { maxWidth: `${maxWidth}px` } : undefined;

  let img: React.ReactNode;
  if (isOptimizableImageSrc(src) && dims?.width && dims?.height) {
    img = (
      <NextImage
        src={src}
        alt={alt}
        width={dims.width}
        height={dims.height}
        sizes="(max-width: 768px) 100vw, 896px"
        className="w-full h-auto rounded-sm"
      />
    );
  } else {
    img = (
      // No known dimensions (external URL, file not on disk yet) — render at
      // natural size, bounded by the same measure and height cap.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          "h-auto w-auto max-w-full rounded-sm",
          !displayWidth && "max-h-140"
        )}
      />
    );
  }

  return (
    <figure style={figureStyle} className={maxWidth ? undefined : "max-w-4xl"}>
      {img}
      {node.title && <figcaption className="kicker mt-3">{node.title}</figcaption>}
    </figure>
  );
}

/* ----- Blockquote → Quote atom ----- */

function BlockquoteEl({ node }: { node: Blockquote }) {
  const paras = node.children.filter((c) => c.type === "paragraph");
  const texts = paras.map((p) => plainText(p.children).trim());
  let quote = texts.join(" ");
  let attribution: string | undefined;
  const last = texts[texts.length - 1];
  if (texts.length > 1 && /^[—–-]{1,2}\s*/.test(last)) {
    attribution = last.replace(/^[—–-]{1,2}\s*/, "");
    quote = texts.slice(0, -1).join(" ");
  }
  return (
    <div className="mt-12 md:mt-16 max-w-5xl">
      <Quote {...quotePropsSchema.parse({ quote, attribution })} />
    </div>
  );
}

/* ----- Lists, code, tables ----- */

/**
 * A "label list" — every item starts bold (`- **Status** — Ongoing`) —
 * renders as the stacked, bullet-less vitals block from the grid pages.
 * Any other list gets accent-colored markers.
 */
function isLabelList(node: List): boolean {
  return (
    !node.ordered &&
    node.children.length > 1 &&
    node.children.every((item) => {
      const first = item.children[0];
      return first?.type === "paragraph" && first.children[0]?.type === "strong";
    })
  );
}

function ListEl({ node }: { node: List }) {
  const Tag = node.ordered ? "ol" : "ul";
  const labelList = isLabelList(node);
  return (
    <Tag
      className={cn(
        textVariantClass.body,
        "text-foreground",
        PROSE,
        labelList
          ? "mt-6 list-none space-y-1"
          : cn(
              "mt-6 pl-6 space-y-2 marker:text-accent",
              node.ordered ? "list-decimal" : "list-disc"
            )
      )}
    >
      {node.children.map((item, i) => (
        <li key={i}>
          {item.children.map((child, j) =>
            child.type === "paragraph" ? (
              <Inline key={j} nodes={child.children} />
            ) : child.type === "list" ? (
              <ListEl key={j} node={child} />
            ) : null
          )}
        </li>
      ))}
    </Tag>
  );
}

function CodeEl({ node }: { node: Code }) {
  return (
    <pre className="mt-8 max-w-4xl overflow-x-auto rounded-sm border border-border bg-surface p-5 font-mono text-sm leading-relaxed text-foreground">
      <code>{node.value}</code>
    </pre>
  );
}

function TableEl({ node }: { node: Table }) {
  const [head, ...rows] = node.children;
  return (
    <div className="mt-8 max-w-4xl overflow-x-auto">
      <table className="w-full border-collapse font-mono text-sm [font-feature-settings:'tnum']">
        <thead>
          <tr>
            {head.children.map((cell, i) => (
              <th
                key={i}
                className="kicker border-b border-border px-3 py-2 text-left"
              >
                <Inline nodes={cell.children} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.children.map((cell, j) => (
                <td
                  key={j}
                  className="border-b border-border/60 px-3 py-2 align-top text-foreground"
                >
                  <Inline nodes={cell.children} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----- Inline content ----- */

function plainText(nodes: PhrasingContent[]): string {
  let out = "";
  for (const n of nodes) {
    if (n.type === "text" || n.type === "inlineCode") out += n.value;
    else if ("children" in n) out += plainText(n.children as PhrasingContent[]);
  }
  return out;
}

function Inline({ nodes }: { nodes: PhrasingContent[] }) {
  return (
    <>
      {nodes.map((node, i) => {
        switch (node.type) {
          case "text":
            return node.value;
          case "strong":
            return (
              <strong key={i} className="font-semibold">
                <Inline nodes={node.children} />
              </strong>
            );
          case "emphasis":
            return (
              <em key={i}>
                <Inline nodes={node.children} />
              </em>
            );
          case "delete":
            return (
              <del key={i}>
                <Inline nodes={node.children} />
              </del>
            );
          case "inlineCode":
            return (
              <code
                key={i}
                className="font-mono text-[0.85em] rounded-sm border border-border bg-surface px-1.5 py-0.5"
              >
                {node.value}
              </code>
            );
          case "link":
            return (
              <a
                key={i}
                href={resolveDocSrc(node.url)}
                className="editorial-link"
                target={/^https?:/i.test(node.url) ? "_blank" : undefined}
                rel={/^https?:/i.test(node.url) ? "noopener noreferrer" : undefined}
              >
                <Inline nodes={node.children} />
              </a>
            );
          case "break":
            return <br key={i} />;
          case "image":
            // Inline image mixed into text — rare; render small and inline.
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={resolveDocSrc(node.url)}
                alt={node.alt ?? ""}
                loading="lazy"
                decoding="async"
                className="inline-block max-h-[1.4em] w-auto align-text-bottom"
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
