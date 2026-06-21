// Ensures the three locale bundles (it/en/es) expose the SAME set of keys per
// namespace — no missing or extra keys in any language (issue #5). A divergence
// here means a screen would silently fall back to Italian in another language.
import { describe, it, expect } from "vitest";
import { NAMESPACES, resources, SUPPORTED_LANGUAGES } from "./resources";

// Flatten a nested resource object into dotted leaf-key paths, e.g.
// { a: { b: "x" } } -> ["a.b"]. Used to compare key SHAPE across languages.
function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object") out.push(...flattenKeys(v, path));
    else out.push(path);
  }
  return out.sort();
}

describe("locale bundles", () => {
  it("define every supported language", () => {
    for (const lng of SUPPORTED_LANGUAGES) {
      expect(resources[lng], `missing bundle for ${lng}`).toBeTruthy();
    }
  });

  it("expose the same namespaces in every language", () => {
    for (const lng of SUPPORTED_LANGUAGES) {
      const ns = Object.keys(resources[lng]).sort();
      expect(ns).toEqual([...NAMESPACES].sort());
    }
  });

  // For each namespace, the Italian (reference) key set must match en + es exactly.
  for (const ns of NAMESPACES) {
    it(`namespace "${ns}" has identical keys across it/en/es`, () => {
      const itKeys = flattenKeys((resources.it as Record<string, unknown>)[ns]);
      const enKeys = flattenKeys((resources.en as Record<string, unknown>)[ns]);
      const esKeys = flattenKeys((resources.es as Record<string, unknown>)[ns]);

      // Surface the actual diff for a readable failure message.
      const missingInEn = itKeys.filter((k) => !enKeys.includes(k));
      const extraInEn = enKeys.filter((k) => !itKeys.includes(k));
      const missingInEs = itKeys.filter((k) => !esKeys.includes(k));
      const extraInEs = esKeys.filter((k) => !itKeys.includes(k));

      expect({ missingInEn, extraInEn }).toEqual({ missingInEn: [], extraInEn: [] });
      expect({ missingInEs, extraInEs }).toEqual({ missingInEs: [], extraInEs: [] });
      expect(enKeys).toEqual(itKeys);
      expect(esKeys).toEqual(itKeys);
    });
  }

  it("has no empty string values in any language", () => {
    for (const lng of SUPPORTED_LANGUAGES) {
      for (const ns of NAMESPACES) {
        const bundle = (resources[lng] as Record<string, unknown>)[ns];
        for (const path of flattenKeys(bundle)) {
          const value = path
            .split(".")
            .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], bundle);
          expect(typeof value, `${lng}/${ns}/${path} should be a string`).toBe("string");
          expect((value as string).length, `${lng}/${ns}/${path} is empty`).toBeGreaterThan(0);
        }
      }
    }
  });
});
