/** Asset base for GitHub Pages (`/repo-name`) or local dev (`/`). */
export const STATIC_DATA_BASE =
  (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "") + "/data";

export function dataUrl(file: string): string {
  return `${STATIC_DATA_BASE}/${file}`;
}

export const STATIC_MODE = process.env.NEXT_PUBLIC_STATIC_MODE !== "false";
