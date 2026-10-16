import { z } from "zod";

type Patch<S extends z.ZodRawShape> = {
  [K in keyof S]: z.ZodOptional<S[K] extends z.ZodDefault<infer I extends z.ZodType> ? I : S[K]>;
};

/**
 * Update schema from a create schema: every field optional and NO defaults.
 * zod v4's `.partial()` keeps `.default()`s, so a partial update that omits
 * a defaulted field silently resets it (e.g. a lead's source to WEBSITE).
 */
export function patch<S extends z.ZodRawShape>(schema: z.ZodObject<S>): z.ZodObject<Patch<S>> {
  const shape: Record<string, z.ZodType> = {};
  for (const [k, v] of Object.entries(schema.shape)) {
    shape[k] = (v instanceof z.ZodDefault ? (v.unwrap() as z.ZodType) : (v as z.ZodType)).optional();
  }
  return schema.extend(shape) as never;
}
