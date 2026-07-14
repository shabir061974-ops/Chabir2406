// Floating WhatsApp contact button — self-contained (inline SVG + scoped CSS, no external deps).
// Rendered once by StoreLayout so it appears on every customer-facing page.

// WhatsApp number +965 90986000 with an Arabic pre-filled message.
// encodeURIComponent guarantees correct URL-encoding of the Arabic text in every browser.
const WA_PHONE = "96590986000";
const WA_MESSAGE = "مرحباً، أود الاستفسار عن منتجات وخدمات جمعية الفيحاء التعاونية. شكراً لكم.";
const WA_URL = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(WA_MESSAGE)}`;

const CSS = `
.faiha-wa-btn {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 45;
    direction: ltr;            /* keep icon-left / text-right even on RTL (Arabic) pages */
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px 12px 15px;
    background: #25D366;       /* official WhatsApp green */
    color: #ffffff;
    font-family: inherit;
    font-weight: 600;
    font-size: 15px;
    line-height: 1;
    text-decoration: none;
    border-radius: 999px;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.22), 0 3px 8px rgba(37, 211, 102, 0.40);
    transition: transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s ease, background-color .25s ease;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
    animation: faiha-wa-in .35s ease-out both;
}
.faiha-wa-btn:hover {
    background: #1ebe5d;
    transform: translateY(-3px) scale(1.04);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.26), 0 6px 14px rgba(37, 211, 102, 0.50);
}
.faiha-wa-btn:active { transform: translateY(-1px) scale(.99); }
.faiha-wa-btn:focus-visible { outline: 3px solid rgba(37, 211, 102, .45); outline-offset: 2px; }

.faiha-wa-btn .faiha-wa-icon { display: inline-flex; }
.faiha-wa-btn .faiha-wa-icon svg { width: 26px; height: 26px; display: block; fill: #ffffff; }
.faiha-wa-btn .faiha-wa-text { white-space: nowrap; }

@keyframes faiha-wa-in {
    from { opacity: 0; transform: translateY(16px) scale(.9); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Tablet */
@media (max-width: 768px) {
    .faiha-wa-btn { right: 20px; bottom: 20px; font-size: 14px; padding: 11px 17px 11px 14px; }
    .faiha-wa-btn .faiha-wa-icon svg { width: 24px; height: 24px; }
}

/* Mobile */
@media (max-width: 480px) {
    .faiha-wa-btn { right: 14px; bottom: 14px; gap: 8px; font-size: 13px; padding: 10px 15px 10px 13px; }
    .faiha-wa-btn .faiha-wa-icon svg { width: 22px; height: 22px; }
}

@media (prefers-reduced-motion: reduce) {
    .faiha-wa-btn { animation: none; transition: none; }
    .faiha-wa-btn:hover { transform: none; }
}
`;

export function WhatsAppButton() {
    return (
        <>
            <style>{CSS}</style>
            <a
                className="faiha-wa-btn"
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with us on WhatsApp"
                data-testid="whatsapp-button"
            >
                <span className="faiha-wa-icon" aria-hidden="true">
                    <svg viewBox="0 0 448 512" role="img">
                        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 438.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                    </svg>
                </span>
                <span className="faiha-wa-text">Chat with Us on WhatsApp</span>
            </a>
        </>
    );
}
