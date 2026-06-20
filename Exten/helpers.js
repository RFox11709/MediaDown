// Direct-download-detectable extensions
export const DIRECT_EXTS = new Set([
    'exe', 'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'dmg',
    'apk', 'iso', 'pdf', 'msi', 'deb', 'rpm', 'pkg', 'cab',
    'jar', 'war', 'ear', 'AppImage', 'snap',
    'mp3', 'mp4', 'mkv', 'avi', 'mov', 'webm', // also media served as direct files
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp' // image formats
]);

export function sanitize(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
}

export function detectDirectDownload(url) {
    try {
        const u = new URL(url);
        const pathname = u.pathname.toLowerCase();
        const ext = pathname.split('.').pop().split('?')[0];
        return DIRECT_EXTS.has(ext);
    } catch { return false; }
}

export function getExtFromUrl(url) {
    try {
        const u = new URL(url);
        const pathname = u.pathname.toLowerCase();
        return pathname.split('.').pop().split('?')[0] || 'bin';
    } catch { return 'bin'; }
}

export function getFilenameFromUrl(url) {
    try {
        const u = new URL(url);
        const parts = u.pathname.split('/');
        const last = parts[parts.length - 1] || 'download';
        return decodeURIComponent(last.split('.')[0]) || 'download';
    } catch { return 'download'; }
}