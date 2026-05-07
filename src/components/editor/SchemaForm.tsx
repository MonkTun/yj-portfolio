"use client";

import { z } from "zod";
import { cn } from "@/lib/utils";

const LONG_TEXT_FIELDS = new Set([
  "body",
  "summary",
  "tagline",
  "quote",
  "description",
  "subtitle",
]);

// zod 4's introspection (`unwrap`, `.element`, etc.) returns the lower-level
// `$ZodType`, which is structurally distinct from `z.ZodType` in its type
// signature. We use a permissive alias for the recursive form internals;
// validation still happens against the original `z.ZodType<T>` at save time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyZod = z.ZodType<any, any, any>;

type Props = {
  schema: AnyZod;
  value: unknown;
  onChange: (next: unknown) => void;
};

/**
 * Walks a zod schema and renders a form for it. Used by the properties
 * panel — every block exposes its props through one of these.
 *
 * Supports: string, number, boolean, array, object, optional. New shapes
 * (enums, unions) can be added when blocks need them.
 */
export function SchemaForm({ schema, value, onChange }: Props) {
  return (
    <Field
      name=""
      schema={schema}
      value={value}
      onChange={onChange}
      depth={0}
    />
  );
}

type FieldProps = {
  name: string;
  schema: AnyZod;
  value: unknown;
  onChange: (v: unknown) => void;
  depth: number;
};

function Field({ name, schema, value, onChange, depth }: FieldProps) {
  // Optional → render the inner type; treat empty string / undefined the same.
  if (schema instanceof z.ZodOptional) {
    return (
      <Field
        name={name}
        schema={schema.unwrap() as AnyZod}
        value={value}
        onChange={onChange}
        depth={depth}
      />
    );
  }

  if (schema instanceof z.ZodString) {
    const long = LONG_TEXT_FIELDS.has(name);
    return (
      <FieldShell name={name}>
        {long ? (
          <textarea
            className={inputCls}
            value={(value as string) ?? ""}
            rows={4}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            type="text"
            className={inputCls}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </FieldShell>
    );
  }

  if (schema instanceof z.ZodNumber) {
    return (
      <FieldShell name={name}>
        <input
          type="number"
          className={inputCls}
          value={Number.isFinite(value as number) ? (value as number) : 0}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
      </FieldShell>
    );
  }

  if (schema instanceof z.ZodBoolean) {
    return (
      <FieldShell name={name} inline>
        <input
          type="checkbox"
          className="accent-[var(--accent)]"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      </FieldShell>
    );
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, AnyZod>;
    const obj = (value as Record<string, unknown>) ?? {};
    return (
      <FieldShell name={name}>
        <div
          className={cn(
            "space-y-4",
            depth > 0 && "border-l border-border pl-4"
          )}
        >
          {Object.entries(shape).map(([key, childSchema]) => (
            <Field
              key={key}
              name={key}
              schema={childSchema}
              value={obj[key]}
              onChange={(v) => onChange({ ...obj, [key]: v })}
              depth={depth + 1}
            />
          ))}
        </div>
      </FieldShell>
    );
  }

  if (schema instanceof z.ZodArray) {
    const arr = ((value as unknown[]) ?? []).slice();
    const inner = schema.element as AnyZod;
    return (
      <FieldShell name={name}>
        <div className="space-y-3">
          {arr.length === 0 && (
            <p className="text-foreground/40 italic text-sm">Empty</p>
          )}
          {arr.map((item, i) => (
            <div
              key={i}
              className="relative rounded-sm bg-background/50 border border-border p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="kicker">Item {i + 1}</span>
                <button
                  type="button"
                  className="kicker text-foreground/50 hover:text-accent transition-colors"
                  onClick={() => {
                    const next = arr.slice();
                    next.splice(i, 1);
                    onChange(next);
                  }}
                >
                  Remove
                </button>
              </div>
              <Field
                name=""
                schema={inner}
                value={item}
                onChange={(v) => {
                  const next = arr.slice();
                  next[i] = v;
                  onChange(next);
                }}
                depth={depth + 1}
              />
            </div>
          ))}
          <button
            type="button"
            className="kicker text-accent hover:underline"
            onClick={() => onChange([...arr, defaultsFor(inner)])}
          >
            + Add item
          </button>
        </div>
      </FieldShell>
    );
  }

  return (
    <FieldShell name={name}>
      <p className="text-foreground/60 italic text-sm">
        Unsupported field type
      </p>
    </FieldShell>
  );
}

const inputCls =
  "w-full bg-background border border-border rounded-sm px-3 py-2 text-foreground font-body text-base focus:outline-none focus:border-accent transition-colors";

function FieldShell({
  name,
  children,
  inline,
}: {
  name: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  if (!name) return <>{children}</>;
  return (
    <label className={cn("block", inline && "flex items-center gap-3")}>
      <span className="kicker block">{name}</span>
      <div className={cn(!inline && "mt-1.5")}>{children}</div>
    </label>
  );
}

export function defaultsFor(schema: AnyZod): unknown {
  if (schema instanceof z.ZodOptional) return undefined;
  if (schema instanceof z.ZodString) return "";
  if (schema instanceof z.ZodNumber) return 0;
  if (schema instanceof z.ZodBoolean) return false;
  if (schema instanceof z.ZodArray) return [];
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, AnyZod>;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(shape)) {
      out[key] = defaultsFor(child);
    }
    return out;
  }
  return undefined;
}
