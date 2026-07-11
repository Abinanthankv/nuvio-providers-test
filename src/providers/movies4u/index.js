const cheerio = require('cheerio-without-node-native');

const TMDB_API_KEY = '1b3113663c9004682ed61086cf967c44';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const MAIN_URL = "https://movies4u.mw";
const M4UPLAY_BASE = "https://m4uplay.store";

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Referer": `${MAIN_URL}/`,
};

const FILE_HOST_PATTERNS = [
    /mdrive\.(buzz|ink)/i, /gdflix\.(dev|app)/i,
    /hubcloud/i, /gdxcloud/i,
    /vcloud\.zip/i, /filebee\.xyz/i, /filepress/i,
    /fastdl\.zip/i, /busycdn\.xyz/i, /fastcdn-dl/i,
    /goflix\.sbs/i, /nexdrive/i,
    /pub-[a-z0-9]+\.r2\.dev/i
];

const SKIP_HOST_PATTERNS = [
    /google(apis)?\./i, /cloudflare/i, /cdnjs\./i,
    /facebook/i, /twitter/i, /bit\.ly/i, /tinyurl/i,
    /w3\.org/i, /googletagmanager/i, /fonts\.googleapis/i,
    /gstatic/i, /gravatar\.com/i, /linkedin/i, /instagram/i,
    /youtube/i, /github/i, /wordpress/i, /litespeed/i,
    /megaup\.net/i, /gofile\.io/i, /vikingfile/i
];

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    return Promise.race([
        fetch(url, { ...options }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        )
    ]);
}

function toTitleCase(str) {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function normalizeTitle(title) {
    if (!title) return '';
    return title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function calculateTitleSimilarity(title1, title2) {
    const norm1 = normalizeTitle(title1);
    const norm2 = normalizeTitle(title2);
    if (norm1 === norm2) return 1.0;
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;
    const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));
    if (words1.size === 0 || words2.size === 0) return 0;
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
}

function findBestTitleMatch(mediaInfo, searchResults) {
    if (!searchResults || searchResults.length === 0) return null;
    const targetTitle = mediaInfo.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetYear = mediaInfo.year ? parseInt(mediaInfo.year) : null;
    let bestMatch = null;
    let bestScore = 0;
    for (const result of searchResults) {
        const normalizedResultTitle = result.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        let score = calculateTitleSimilarity(mediaInfo.title, result.title);
        const titleMatch = normalizedResultTitle.includes(targetTitle) || targetTitle.includes(normalizedResultTitle);
        const yearMatch = !targetYear ||
            result.title.includes(targetYear.toString()) ||
            result.title.includes((targetYear + 1).toString()) ||
            result.title.includes((targetYear - 1).toString());
        if (titleMatch && yearMatch) score += 0.5;
        if (score > bestScore) {
            bestScore = score;
            bestMatch = result;
        }
    }
    if (bestMatch && bestScore > 0.4) {
        console.log(`[Movies4u] Best title match: "${bestMatch.title}" (score: ${bestScore.toFixed(2)})`);
        return bestMatch;
    }
    return null;
}

function formatStreamTitle(mediaInfo, stream) {
    const quality = stream.quality || "Unknown";
    const title = mediaInfo.title || "Unknown";
    let year = mediaInfo.year || "";
    if (!year || year === "N/A") {
        const yearMatch = (title + " " + (stream.text || "")).match(/\b(19|20)\d{2}\b/);
        if (yearMatch) year = yearMatch[0];
    }
    let size = "UNKNOWN";
    const sizeMatch = stream.text ? stream.text.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i) : null;
    if (sizeMatch) size = sizeMatch[1].toUpperCase();
    let type = "UNKNOWN";
    const searchString = ((stream.text || "") + " " + (stream.url || "") + " " + (stream.label || "")).toLowerCase();
    if (searchString.includes('bluray') || searchString.includes('brrip')) type = "BluRay";
    else if (searchString.includes('web-dl')) type = "WEB-DL";
    else if (searchString.includes('webrip')) type = "WEBRip";
    else if (searchString.includes('hdrip')) type = "HDRip";
    else if (searchString.includes('dvdrip')) type = "DVDRip";
    else if (searchString.includes('bdrip')) type = "BDRip";
    else if (searchString.includes('hdtv')) type = "HDTV";
    const yearStr = year ? ` (${year})` : "";
    const displayQuality = quality;
    const typeLine = (type && type !== "UNKNOWN") ? `📺: ${type}\n` : "";
    const sizeLine = (size && size !== "UNKNOWN") ? `💾: ${size} | 🚜: movies4u\n` : "";
    return `Movies4u (Instant) (${displayQuality})
${typeLine}📼: ${title}${yearStr} - ${displayQuality}
${sizeLine}🌐: UNKNOWN`;
}

function extractQuality(text) {
    if (/1080p|2160p/i.test(text)) return '1080p';
    if (/720p/i.test(text)) return '720p';
    if (/480p/i.test(text)) return '480p';
    if (/4K/i.test(text)) return '4K';
    return 'HD';
}

function isFileHost(url) {
    return FILE_HOST_PATTERNS.some(p => p.test(url));
}

function isSkippable(url) {
    return SKIP_HOST_PATTERNS.some(p => p.test(url));
}

function extractDirectVideoUrls(html) {
    const urls = new Set();
    const patterns = [
        /https?:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\"'\\s<>]+\.(?:mp4|mkv|webm)(?:\?[^\"'\\s<>]*)?/gi,
        /https?:\/\/[^\"'\\s<>]+\.(?:mp4|mkv|webm)(?:\?[^\"'\\s<>]*)?/gi,
        /https?:\/\/[^\"'\\s<>]+\.(?:m3u8|txt)(?:\?[^\"'\\s<>]*)?/gi
    ];
    for (const p of patterns) {
        const matches = html.match(p);
        if (matches) matches.forEach(u => urls.add(u));
    }
    return [...urls];
}

function extractExternalLinks(html, baseUrl) {
    let base = '';
    try { base = baseUrl ? new URL(baseUrl).origin : ''; } catch(e) {}
    const anchors = [...html.matchAll(/<a[^>]*href=\"([^\"]+)\"[^>]*>/gi)];
    const links = [];
    const seen = new Set();
    for (const [, href] of anchors) {
        try {
            let url = href.trim();
            if (url.startsWith('//')) url = 'https:' + url;
            else if (url.startsWith('/') && base) url = base + url;
            if (!url.startsWith('http')) continue;
            new URL(url);
            if (seen.has(url)) continue;
            seen.add(url);
            links.push(url);
        } catch(e) {}
    }
    return links;
}

async function smartExtract(url, depth = 0, maxDepth = 2, visited = new Set()) {
    if (depth > maxDepth || visited.has(url)) return [];
    visited.add(url);

    const streams = [];
    try {
        const res = await fetchWithTimeout(url, { headers: HEADERS, redirect: 'follow' }, 8000);
        const ct = res.headers.get('content-type') || '';

        if (ct.startsWith('video/') || /\.(mp4|mkv|webm|m3u8)(\?|$)/i.test(url)) {
            console.log(`[Movies4u] Direct video: ${url.substring(0, 80)}`);
            return [{ url, quality: extractQuality(url), isMaster: false }];
        }

        if (!ct.includes('text/html') && !ct.includes('application/json')) return streams;

        const html = await res.text();

        const directUrls = extractDirectVideoUrls(html);
        for (const u of directUrls) {
            if (!visited.has(u)) {
                visited.add(u);
                streams.push({ url: u, quality: extractQuality(u), isMaster: false });
            }
        }

        if (depth < maxDepth) {
            const links = extractExternalLinks(html, url);
            const hostLinks = links.filter(l => isFileHost(l) && !isSkippable(l));

            const batchSize = 5;
            for (let i = 0; i < hostLinks.length; i += batchSize) {
                const batch = hostLinks.slice(i, i + batchSize);
                const results = await Promise.all(batch.map(link =>
                    smartExtract(link, depth + 1, maxDepth, visited)
                ));
                results.forEach(r => streams.push(...r));
            }
        }
    } catch (e) {
        if (depth === 0) console.error(`[Movies4u] Extract error: ${e.message}`);
    }
    return streams;
}

function extractWatchLinks(movieUrl) {
    return new Promise(async (resolve) => {
        try {
            console.log(`[Movies4u] Extracting watch links from: ${movieUrl}`);
            const response = await fetchWithTimeout(movieUrl, { headers: HEADERS }, 8000);
            const html = await response.text();
            const $ = cheerio.load(html);
            const watchLinks = [];

            $('a').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && (href.includes('m4uplay') || href.includes('mdrive.ink') || href.includes('filepress') || href.includes('mdrive.buzz'))) {
                    watchLinks.push({
                        url: href,
                        quality: text.includes('1080p') ? '1080p' :
                            text.includes('720p') ? '720p' :
                            text.includes('480p') ? '480p' :
                            text.includes('4K') || text.includes('2160p') ? '4K' : 'HD',
                        label: text
                    });
                }
            });

            console.log(`[Movies4u] Found ${watchLinks.length} watch links`);
            resolve(watchLinks);
        } catch (error) {
            console.error(`[Movies4u] Error extracting watch links: ${error.message}`);
            resolve([]);
        }
    });
}

async function getTMDBDetails(tmdbId, mediaType) {
    const type = mediaType === 'movie' ? 'movie' : 'tv';
    const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) throw new Error(`TMDB error: ${response.status}`);
    const data = await response.json();
    return {
        title: data.title || data.name,
        year: (data.release_date || data.first_air_date || "").split("-")[0]
    };
}

async function resolveImdbId(imdbId) {
    try {
        const url = `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        const response = await fetchWithTimeout(url, {}, 8000);
        const data = await response.json();
        const movie = data.movie_results?.[0];
        const tv = data.tv_results?.[0];
        if (movie) {
            const info = { title: movie.title, year: (movie.release_date || '').split('-')[0] };
            console.log(`[Movies4u] IMDb ${imdbId} -> Movie: "${info.title}" (${info.year || 'N/A'})`);
            return info;
        }
        if (tv) {
            const info = { title: tv.name, year: (tv.first_air_date || '').split('-')[0] };
            console.log(`[Movies4u] IMDb ${imdbId} -> TV: "${info.title}" (${info.year || 'N/A'})`);
            return info;
        }
        console.log(`[Movies4u] IMDb ${imdbId} not found on TMDB`);
        return null;
    } catch (error) {
        console.error(`[Movies4u] Error resolving IMDb ID ${imdbId}:`, error.message);
        return null;
    }
}

async function searchMovies(query) {
    try {
        const searchUrl = `${MAIN_URL}/?s=${encodeURIComponent(query)}`;
        console.log(`[Movies4u] Searching: ${searchUrl}`);
        const response = await fetchWithTimeout(searchUrl, { headers: HEADERS }, 8000);
        const html = await response.text();
        const $ = cheerio.load(html);
        const results = [];
        $('.entry-title a').each((i, el) => {
            const title = $(el).text().trim();
            const url = $(el).attr('href');
            if (title && url) results.push({ title, url });
        });
        console.log(`[Movies4u] Found ${results.length} search results`);
        return results;
    } catch (error) {
        console.error(`[Movies4u] Search error: ${error.message}`);
        return [];
    }
}

async function getStreams(tmdbId, mediaType = 'movie', season = null, episode = null) {
    console.log(`[Movies4u] Processing ${mediaType} ${tmdbId}`);
    try {
        let mediaInfo;

        const imdbMatch = tmdbId.match(/^[Tt][Tt]?(\d+)$/);
        if (imdbMatch) {
            mediaInfo = await resolveImdbId(imdbMatch[0]);
            if (!mediaInfo) {
                console.log(`[Movies4u] IMDb resolve failed for "${tmdbId}", using as-is`);
                mediaInfo = { title: tmdbId, year: null };
            }
        } else {
            const numericId = tmdbId.replace(/^[^\d]+/, '');
            const isNumericId = /^\d+$/.test(numericId);
            if (isNumericId) {
                try {
                    mediaInfo = await getTMDBDetails(numericId, mediaType);
                } catch (error) {
                    mediaInfo = { title: tmdbId, year: null };
                }
            } else {
                mediaInfo = { title: tmdbId, year: null };
            }
        }

        const searchResults = await searchMovies(mediaInfo.title);
        if (searchResults.length === 0) return [];
        const bestMatch = findBestTitleMatch(mediaInfo, searchResults);
        if (!bestMatch) return [];

        console.log(`[Movies4u] Found match: ${bestMatch.title}`);
        const yearMatch = bestMatch.title.match(/\((20\d{2}|19\d{2})\)/);
        if (mediaInfo.title.toLowerCase() === tmdbId.toLowerCase()) {
            mediaInfo.title = bestMatch.title.split('(')[0].trim();
            if (yearMatch) mediaInfo.year = yearMatch[1];
        }

        const watchLinks = await extractWatchLinks(bestMatch.url);
        if (watchLinks.length === 0) return [];

        const streams = [];
        const visited = new Set();
        for (const watchLink of watchLinks) {
            const results = await smartExtract(watchLink.url, 0, 2, visited);
            for (const result of results) {
                if (result.url) {
                    streams.push({
                        name: "Movies4u",
                        title: formatStreamTitle(mediaInfo, result),
                        url: result.url,
                        quality: result.quality || watchLink.quality,
                        headers: { Referer: watchLink.url }
                    });
                }
            }
        }

        console.log(`[Movies4u] Extracted ${streams.length} streams`);
        return streams;
    } catch (error) {
        console.error("[Movies4u] getStreams failed:", error.message);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = { getStreams };
}
