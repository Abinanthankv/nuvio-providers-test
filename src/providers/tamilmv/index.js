// TamilMV Scraper for Nuvio Local Scrapers
// React Native compatible version with full original functionality

const cheerio = require('cheerio-without-node-native');

// TMDB API Configuration
const TMDB_API_KEY = '1b3113663c9004682ed61086cf967c44';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// TamilMV Configuration
const POTENTIAL_DOMAINS = [
  "https://www.1tamilmv.durban",
  "https://www.1tamilmv.cymru",
  "https://www.1tamilmv.immo",
  "https://www.1tamilmv.pm",
  "https://www.1tamilmv.org",
  "https://www.1tamilmv.lat",
  "https://www.1tamilmv.vin",
  "https://www.1tamilmv.st",
];

let MAIN_URL = POTENTIAL_DOMAINS[0];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Referer": `${MAIN_URL}/`,
};

/**
 * Finds a working TamilMV domain
 */
async function getReadyDomain() {
  console.log("[TamilMV] Checking for a working domain...");
  
  for (const domain of POTENTIAL_DOMAINS) {
    try {
      const response = await fetchWithTimeout(domain, { method: 'HEAD' }, 5000);
      if (response.ok) {
        console.log(`[TamilMV] Found working domain: ${domain}`);
        return domain;
      }
      const getResponse = await fetchWithTimeout(domain, { method: 'GET' }, 5000);
      if (getResponse.ok) {
        console.log(`[TamilMV] Found working domain: ${domain}`);
        return domain;
      }
    } catch (e) {
      // Domain unreachable
    }
  }

  return POTENTIAL_DOMAINS[0];
}

/**
 * Fetch with timeout using Promise.race for better RN compatibility
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  return Promise.race([
    fetch(url, { ...options }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
    )
  ]);
}

/**
 * De-obfuscates Packer-encoded string
 */
function unpack(p, a, c, k) {
  while (c--) {
    if (k[c]) {
      const placeholder = c.toString(a);
      p = p.replace(new RegExp('\\b' + placeholder + '\\b', 'g'), k[c]);
    }
  }
  return p;
}

/**
 * Normalizes title for comparison
 * @param {string} title 
 * @returns {string}
 */
function normalizeTitle(title) {
  if (!title) return '';
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts string to Title Case
 */
function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Calculates similarity score between two titles
 */
function calculateTitleSimilarity(title1, title2) {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);

  // Exact match after normalization
  if (norm1 === norm2) return 1.0;

  // Substring matches
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

  // Word-based similarity
  const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Finds the best title match from watch links
 * @param {Object} mediaInfo TMDB media info
 * @param {Array} watchLinks Watch links array
 * @returns {Object|null} Best matching result
 */
function findBestTitleMatch(mediaInfo, watchLinks) {
  if (!watchLinks || watchLinks.length === 0) return null;

  const targetTitle = mediaInfo.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetYear = mediaInfo.year ? parseInt(mediaInfo.year) : null;

  let bestMatch = null;
  let bestScore = 0;

  for (const result of watchLinks) {
    const normalizedResultTitle = result.title.toLowerCase().replace(/[^a-z0-9]/g, "");

    let score = calculateTitleSimilarity(mediaInfo.title, result.title);

    // Specific match logic from original tamilmv.js
    const titleMatch = normalizedResultTitle.includes(targetTitle) || targetTitle.includes(normalizedResultTitle);

    // Year matching logic from original tamilmv.js
    const yearMatch = !targetYear ||
      result.title.includes(targetYear.toString()) ||
      result.title.includes((targetYear + 1).toString()) ||
      result.title.includes((targetYear - 1).toString());

    if (titleMatch && yearMatch) {
      score += 0.5; // High priority for original match logic
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = result;
    }
  }

  if (bestMatch && bestScore > 0.4) {
    console.log(`[TamilMV] Best title match: "${bestMatch.title}" (score: ${bestScore.toFixed(2)})`);
    return bestMatch;
  }

  return null;
}

/**
 * Formats a rich multi-line title for a stream
 */
function formatStreamTitle(mediaInfo, stream) {
  const { title: movieTitle, year } = mediaInfo;
  const { quality = "Unknown", size = "Unknown", language = "Tamil", type = "Movie" } = stream;

  const displayTitle = toTitleCase(movieTitle);
  const yearStr = year ? ` (${year})` : "";
  
  const typeLine = type ? `📹: ${type}\n` : "";
  const sizeLine = size && size !== "Unknown" ? `💾: ${size}\n` : "";

  return `TamilMV (Instant) (${quality})
${typeLine}📼: ${displayTitle}${yearStr} ${quality}
${sizeLine}🌐: ${language.toUpperCase()}`;
}

// =================================================================================
// HOST EXTRACTORS
// =================================================================================

/**
 * Attempts to extract direct stream URL from various embed hosts
 * @param {string} embedUrl The embed URL
 * @returns {Promise<string|null>} Direct stream URL or null
 */
async function extractDirectStream(embedUrl) {
  try {
    console.log(`[TamilMV] Processing URL: ${embedUrl}`);
    const url = new URL(embedUrl);
    const hostname = url.hostname.toLowerCase();

    // If it's a TamilMV topic URL, scrape it for external stream links
    if (hostname.includes('1tamilmv')) {
      console.log(`[TamilMV] Topic page detected, scraping for stream links...`);
      const topicRes = await fetchWithTimeout(embedUrl, { headers: HEADERS }, 8000);
      if (!topicRes.ok) return null;
      const topicHtml = await topicRes.text();
      const $ = cheerio.load(topicHtml);
      
      // Look for external stream URLs
      let streamUrl = null;
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (!href || streamUrl) return;
        
        const h = href.toLowerCase();
        if (h.includes('vidnest') || h.includes('hglink') || h.includes('hubglink') || 
            h.includes('luluvid') || h.includes('luluvdo') || h.includes('wishonly') ||
            h.includes('dhcplay') || h.includes('strmup') || h.includes('gdriveplayer') ||
            h.includes('streamcash') || h.includes('streamdady')) {
          streamUrl = href;
        }
      });
      
      if (!streamUrl) return null;
      console.log(`[TamilMV] Found stream link: ${streamUrl}`);
      return await extractDirectStream(streamUrl);
    }

    // If it's a known embed host, use the generic extractor directly
    console.log(`[TamilMV] Attempting to extract from: ${hostname}`);
    return await extractFromGenericEmbed(embedUrl, hostname);

  } catch (error) {
    console.error(`[TamilMV] Extraction error: ${error.message}`);
    return null;
  }
}

/**
 * Specialized extractor for strmup.cc
 */
async function extractFromStrmup(embedUrl) {
  try {
    const url = new URL(embedUrl);
    const host = url.origin;
    const filecode = url.pathname.split('/').filter(p => p).pop();

    if (!filecode) return null;

    console.log(`[TamilMV] Strmup filecode: ${filecode}`);
    const ajaxUrl = `${host}/ajax/stream?filecode=${filecode}`;

    const response = await fetchWithTimeout(ajaxUrl, {
      headers: {
        ...HEADERS,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': embedUrl
      }
    }, 5000);

    const data = await response.json();
    if (data && data.streaming_url) {
      console.log(`[TamilMV] Found direct URL from strmup: ${data.streaming_url}`);
      return data.streaming_url;
    }
    return null;
  } catch (error) {
    console.error(`[TamilMV] Strmup extraction failed: ${error.message}`);
    return null;
  }
}

/**
 * Generic extractor that looks for common video source patterns
 */
async function extractFromGenericEmbed(embedUrl, hostName) {
  try {
    const embedBase = new URL(embedUrl).origin;
    const response = await fetchWithTimeout(embedUrl, {
      headers: {
        ...HEADERS,
        'Referer': MAIN_URL
      }
    }, 5000);
    let html = await response.text();

    // Check if it's a landing page
    if (html.includes('<title>Loading...</title>') || html.includes('Page is loading')) {
      console.log(`[TamilMV] Detected landing page on ${hostName}, trying mirrors...`);
      const mirrors = ['yuguaab.com', 'cavanhabg.com'];
      for (const mirror of mirrors) {
        if (hostName.includes(mirror)) continue;
        const mirrorUrl = embedUrl.replace(hostName, mirror);
        try {
          const mirrorRes = await fetchWithTimeout(mirrorUrl, { headers: { ...HEADERS, 'Referer': MAIN_URL } }, 3000);
          const mirrorHtml = await mirrorRes.text();
          if (mirrorHtml.includes('jwplayer') || mirrorHtml.includes('sources') || mirrorHtml.includes('eval(function(p,a,c,k,e,d)')) {
            html = mirrorHtml;
            break;
          }
        } catch (e) { }
      }
    }

    // Check for Packer obfuscation
    const packerMatch = html.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\s*\((.*)\)\s*\)/s);
    if (packerMatch) {
      const rawArgs = packerMatch[1].trim();
      const pMatch = rawArgs.match(/^'(.*)',\s*(\d+),\s*(\d+),\s*'(.*?)'\.split\(/s);
      if (pMatch) {
        const unpacked = unpack(pMatch[1], parseInt(pMatch[2]), parseInt(pMatch[3]), pMatch[4].split('|'));
        html += "\n" + unpacked;
      }
    }

    // Common patterns for video sources
    const patterns = [
      /["']hls[2-4]["']\s*:\s*["']([^"']+)["']/gi,
      /sources\s*:\s*\[\s*{\s*file\s*:\s*["']([^"']+)["']/gi,
      /https?:\/\/[^\s"']+\.m3u8[^\s"']*/gi,
      /["'](\/[^\s"']+\.m3u8[^\s"']*)["']/gi,
      /https?:\/\/[^\s"']+\.mp4[^\s"']*/gi,
      /(?:source|file|src)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi,
    ];

    const allFoundUrls = [];
    for (const pattern of patterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (let match of matches) {
          let videoUrl = match;
          const kvMatch = match.match(/["']:[ ]*["']([^"']+)["']/);
          if (kvMatch) videoUrl = kvMatch[1];
          else {
            const quoteMatch = match.match(/["']([^"']+)["']/);
            if (quoteMatch) videoUrl = quoteMatch[1];
          }

          const absUrlMatch = videoUrl.match(/https?:\/\/[^\s"']+/);
          if (absUrlMatch) videoUrl = absUrlMatch[0];

          videoUrl = videoUrl.replace(/[\\"'\)\]]+$/, '');
          if (!videoUrl || videoUrl.length < 5 || videoUrl.includes('google.com') || videoUrl.includes('youtube.com')) continue;

          if (videoUrl.startsWith('/') && !videoUrl.startsWith('//')) {
            videoUrl = embedBase + videoUrl;
          }
          allFoundUrls.push(videoUrl);
        }
      }
    }

    if (allFoundUrls.length > 0) {
      allFoundUrls.sort((a, b) => {
        const isM3U8A = a.toLowerCase().includes('.m3u8');
        const isM3U8B = b.toLowerCase().includes('.m3u8');
        if (isM3U8A !== isM3U8B) return isM3U8B ? 1 : -1;
        return a.length - b.length;
      });

      const bestUrl = allFoundUrls[0];
      console.log(`[TamilMV] Found direct URL from ${hostName}: ${bestUrl}`);
      return bestUrl;
    }

    console.log(`[TamilMV] No direct URL found in ${hostName}, skipping`);
    return null;

  } catch (error) {
    console.error(`[TamilMV] Error extracting from ${hostName}: ${error.message}`);
    return null;
  }
}

// =================================================================================
// CORE FUNCTIONS
// =================================================================================

/**
 * Fetches metadata from TMDB
 */
async function getTMDBDetails(tmdbId, mediaType) {
  const type = mediaType === 'movie' ? 'movie' : 'tv';
  const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;

  try {
    const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) {
      throw new Error(`TMDB error: ${response.status}`);
    }
    const data = await response.json();

    if (!data.title && !data.name) {
      throw new Error('TMDB returned no title');
    }

    const info = {
      title: data.title || data.name,
      year: (data.release_date || data.first_air_date || "").split("-")[0]
    };
    console.log(`[TamilMV] TMDB Info: "${info.title}" (${info.year || 'N/A'})`);
    return info;
  } catch (error) {
    console.error("[TamilMV] Error fetching TMDB metadata:", error.message);
    throw error;
  }
}

/**
 * Searches TamilMV for movies
 */
async function searchTamilMV(query, year = null) {
  const results = [];
  
  let domainsToTry = [MAIN_URL, ...POTENTIAL_DOMAINS.filter(d => d !== MAIN_URL)];

  for (const domain of domainsToTry) {
    try {
      console.log(`[TamilMV] Trying domain: ${domain}`);
      
      // 1. Fetch homepage and extract all movie topic links
      const homeResponse = await fetchWithTimeout(domain, { headers: { ...HEADERS, Referer: `${domain}/` } }, 8000);
      if (homeResponse.ok) {
        const homeHtml = await homeResponse.text();
        const watchLinks = extractHomepageWatchLinks(homeHtml);
        
        if (watchLinks.length > 0) {
          // Filter by title similarity to find matching movies
          const matchingLinks = watchLinks.filter(link => {
            const score = calculateTitleSimilarity(query, link.title);
            return score > 0.2 || link.title.toLowerCase().includes(query.toLowerCase());
          });
          
          if (matchingLinks.length > 0) {
            console.log(`[TamilMV] Found ${matchingLinks.length} matching links on homepage`);
            for (const wl of matchingLinks) {
              results.push({ 
                title: wl.title, 
                url: wl.watchUrl.startsWith('http') ? wl.watchUrl : domain + (wl.watchUrl.startsWith('/') ? '' : '/') + wl.watchUrl 
              });
            }
            if (domain !== MAIN_URL) {
              MAIN_URL = domain;
              HEADERS.Referer = `${MAIN_URL}/`;
            }
            return results;
          }
          
          // If no match found, return all links for broader matching later
          if (watchLinks.length > 0) {
            for (const wl of watchLinks.slice(0, 20)) {
              results.push({ 
                title: wl.title, 
                url: wl.watchUrl.startsWith('http') ? wl.watchUrl : domain + (wl.watchUrl.startsWith('/') ? '' : '/') + wl.watchUrl 
              });
            }
          }
        }
      }

      if (results.length > 0) {
        if (domain !== MAIN_URL) {
          MAIN_URL = domain;
          HEADERS.Referer = `${MAIN_URL}/`;
        }
        return results;
      }

    } catch (e) {
      console.log(`[TamilMV] Domain ${domain} failed: ${e.message}`);
    }
  }
  
  return results;
}

/**
 * Extracts watch links from homepage or topic page.
 * Handles both old [WATCH] format and new direct topic link format.
 */
function extractHomepageWatchLinks(html) {
  const $ = cheerio.load(html);
  const results = [];

  // Method 1: Extract [W] / [WATCH] links with their preceding title
  $('a').each((i, el) => {
    const text = $(el).text().trim();
    if (text !== '[W]' && text !== '[WATCH]') return;

    const watchUrl = $(el).attr('href');
    if (!watchUrl) return;

    // Walk up to find the parent strong element, then look backwards for the title
    let titleNode = null;
    let parent = el.parentNode;
    
    // Look for previous sibling <strong> that contains the movie title
    let prev = parent.previousSibling;
    while (prev && !titleNode) {
      if (prev.tagName && prev.tagName.toLowerCase() === 'strong') {
        const strongText = $(prev).text().trim();
        if (strongText && strongText.length > 10 && !strongText.includes('Login') && !strongText.includes('Register')) {
          titleNode = prev;
        }
      }
      prev = prev.previousSibling;
    }
    
    // If not a strong, get the parent's previous strong sibling
    if (!titleNode) {
      let p = parent;
      while (p && !titleNode) {
        let s = p.previousSibling;
        while (s && !titleNode) {
          if (s.tagName && s.tagName.toLowerCase() === 'strong') {
            const strongText = $(s).text().trim();
            if (strongText && strongText.length > 10 && !strongText.includes('Login') && !strongText.includes('Register')) {
              titleNode = s;
            }
          }
          s = s.previousSibling;
        }
        p = p.parentNode;
      }
    }

    let title = titleNode ? $(titleNode).text().trim() : '';
    // Clean title - remove quality info after dash
    title = title.replace(/\s*-\s*\[.*?\]\s*$/, '').trim();
    // Remove any link text within
    title = title.replace(/<a[^>]*>.*?<\/a>/gi, '').trim();
    title = title.replace(/\s*-\s*$/, '').trim();
    
    if (title) {
      results.push({ title, watchUrl });
    }
  });

  // Method 2: Extract direct streamcash links not paired with [W]
  $('a[href*="streamcash.to/embed/"], a[href*="luluvid.com/e/"], a[href*="luluvdo.com/e/"]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href || results.some(r => r.watchUrl === href)) return;
    
    const parentStrong = $(el).closest('strong');
    const prevStrong = parentStrong.length ? parentStrong.prevAll('strong').first() : null;
    
    let title = '';
    if (prevStrong.length) {
      title = prevStrong.text().trim();
    } else {
      title = $(el).closest('div, p').text().trim();
    }
    
    title = title.replace(/\s*-\s*\[.*?\]\s*$/, '').trim();
    title = title.replace(/<a[^>]*>.*?<\/a>/gi, '').trim();
    
    if (title && title.length > 5) {
      results.push({ title, watchUrl: href });
    }
  });

  // Method 3: Extract direct topic links as fallback
  $('a[href*="/forums/topic/"]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (results.some(r => r.watchUrl === href)) return;
    
    const parentText = $(el).parent().text().trim();
    const linkText = $(el).text().trim();
    
    let title = parentText || linkText;
    if (linkText.match(/^\[.*\]$/) || linkText.match(/^\d+p/)) {
      title = parentText.replace(linkText, '').replace(/\s*-\s*$/, '').trim();
    }
    
    if (title && title.length > 5 && !title.includes('login') && !title.includes('register')) {
      results.push({ title, watchUrl: href });
    }
  });

  return results;
}

/**
 * Main function for Nuvio integration
 * @param {string} tmdbId TMDB ID or movie title
 * @param {string} mediaType "movie" or "tv"
 * @param {number} season Season number (TV only)
 * @param {number} episode Episode number (TV only)
 * @returns {Promise<Array>} Array of stream objects
 */
async function getStreams(tmdbId, mediaType = 'movie', season = null, episode = null) {
  console.log(`[TamilMV] Processing ${mediaType} ${tmdbId}`);

  try {
    let mediaInfo;

    const isNumericId = /^\d+$/.test(tmdbId);
    if (isNumericId) {
      try {
        mediaInfo = await getTMDBDetails(tmdbId, mediaType);
      } catch (error) {
        mediaInfo = { title: tmdbId, year: null };
      }
    } else {
      mediaInfo = { title: tmdbId, year: null };
      const yearMatch = tmdbId.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        mediaInfo.year = yearMatch[0];
        mediaInfo.title = tmdbId.replace(yearMatch[0], '').trim();
      }
    }

    // Dynamic Domain Discovery
    try {
      const workingDomain = await getReadyDomain();
      if (workingDomain !== MAIN_URL) {
        console.log(`[TamilMV] Switching MAIN_URL: ${MAIN_URL} -> ${workingDomain}`);
        MAIN_URL = workingDomain;
        HEADERS.Referer = `${MAIN_URL}/`;
      }
    } catch (e) {
      console.log(`[TamilMV] Domain discovery failed: ${e.message}`);
    }

    console.log(`[TamilMV] Searching for: ${mediaInfo.title} (${mediaInfo.year})`);
    const searchResults = await searchTamilMV(mediaInfo.title, mediaInfo.year);
    
    if (!searchResults || searchResults.length === 0) {
      console.warn("[TamilMV] No search results found");
      return [];
    }

    const matches = searchResults.filter(r => calculateTitleSimilarity(mediaInfo.title, r.title) > 0.35);

    if (matches.length === 0) {
      console.warn("[Tamilmv] No matching titles found");
      // As a fallback, try matching with the movie name directly if search results exist
      const directMatches = searchResults.filter(r => r.title.toLowerCase().includes(mediaInfo.title.toLowerCase()));
      if (directMatches.length > 0) matches.push(...directMatches);
      else return [];
    }

    const finalStreams = [];
    const topMatches = matches.slice(0, 5); // Process up to 5 matches
    
    for (const match of topMatches) {
      console.log(`[Tamilmv] Processing match: ${match.title}`);
      
      const watchUrl = match.url; // searchTamilMV result now has url property
      if (!watchUrl) continue;

      try {
        const directUrl = await extractDirectStream(watchUrl);
        if (directUrl) {
          const quality = match.title.includes("2160p") || match.title.includes("4K") ? "4K" :
                          match.title.includes("1080p") ? "1080p" :
                          match.title.includes("720p") ? "720p" : 
                          match.title.includes("480p") ? "480p" : "HD";
          
          let size = "Unknown";
          const sizeMatch = match.title.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
          if (sizeMatch) size = sizeMatch[1];

          const streamObj = {
            quality,
            size,
            language: match.title.toLowerCase().includes("tam") ? "Tamil" : "Multi",
            type: mediaType === 'movie' ? "Movie" : "TV Show"
          };

          finalStreams.push({
            name: "Tamilmv",
            title: formatStreamTitle(mediaInfo, streamObj),
            url: directUrl,
            quality: quality,
            headers: {
              "Referer": MAIN_URL,
              "User-Agent": HEADERS["User-Agent"]
            },
            provider: 'Tamilmv'
          });
        }
      } catch (e) {
        console.error(`[Tamilmv] Failed to process match ${match.title}:`, e.message);
      }
    }

    console.log(`[Tamilmv] Returning ${finalStreams.length} streams`);
    return finalStreams;

  } catch (error) {
    console.error("[TamilMV] getStreams failed:", error.message);
    return [];
  }
}

// Export the main function
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  // For React Native environment
  global.getStreams = { getStreams };
}
