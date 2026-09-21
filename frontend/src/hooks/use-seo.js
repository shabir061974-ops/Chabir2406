import { useEffect } from "react";

const SITE_URL = "https://www.faihacoopkw.com";

function setMeta(name, content) {
    if (!content) return;
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
}

function setOgMeta(property, content) {
    if (!content) return;
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
}

function setCanonical(path) {
    let tag = document.querySelector('link[rel="canonical"]');
    if (!tag) {
        tag = document.createElement("link");
        tag.setAttribute("rel", "canonical");
        document.head.appendChild(tag);
    }
    tag.setAttribute("href", `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`);
}

// Sets the per-page <title>, meta description, canonical URL, and Open Graph metadata.
// Each page owns its own SEO tags for the lifetime of that route (no cleanup needed since
// the next page's mount always overwrites these same shared <head> tags).
export function useSeo({ title, description, path, image, type = "website" }) {
    useEffect(() => {
        if (title) {
            document.title = title;
            setOgMeta("og:title", title);
        }
        if (description) {
            setMeta("description", description);
            setOgMeta("og:description", description);
        }
        if (path) {
            setCanonical(path);
            setOgMeta("og:url", `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`);
        }
        if (image) {
            setOgMeta("og:image", image);
        }
        setOgMeta("og:type", type);
    }, [title, description, path, image, type]);
}
