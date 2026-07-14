import { BACKEND_URL } from "./api";

// Product/category images are stored as either a full external URL (e.g. Unsplash) or a
// relative path like "/api/uploads/xyz.webp". On the website a relative path resolves fine
// against the page's own origin, but the Capacitor app's pages load from a virtual
// "https://localhost" origin — so relative paths must be resolved against the real backend
// origin explicitly, everywhere an image is rendered.
export function resolveImageUrl(path) {
    if (!path) return path;
    if (/^https?:\/\//i.test(path)) return path;
    return `${BACKEND_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
