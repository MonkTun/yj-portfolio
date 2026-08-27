/**
 * Shared body-size cap for /api/admin/upload — one constant so the client
 * preflight, the route's check, and next.config.ts's proxyClientMaxBodySize
 * can't drift apart. The proxy clone TRUNCATES bigger bodies mid-stream,
 * which corrupts the multipart payload and makes the route's formData()
 * throw a cryptic "Invalid form data" — so the client must reject oversize
 * files before sending, and the proxy cap must be >= this value.
 *
 * Sized for animated GIFs (screen recordings run tens of MB): unlike other
 * formats they skip the browser-side downscale in downscale-image.ts —
 * there's no GIF encoder in the browser — so they arrive at full size.
 */
export const UPLOAD_MAX_BYTES = 64 * 1024 * 1024;

export const UPLOAD_MAX_MB = Math.round(UPLOAD_MAX_BYTES / (1024 * 1024));
