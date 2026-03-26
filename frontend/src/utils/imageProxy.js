/**
 * Converts a Yupoo image URL to use the backend proxy,
 * avoiding ORB/CORS blocking by the browser.
 */
export function proxyImage(url) {
    if (!url || !url.includes('photo.yupoo.com')) return url;
    return `/api/yupoo/image-proxy?url=${encodeURIComponent(url)}`;
}
