const cheerio = require('cheerio-without-node-native');

const TMDB_API_KEY = '1b3113663c9004682ed61086cf967c44';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

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

const EMBED_ONLY_HOSTS = [
  /streamcash\.to/i, /luluvid\.com/i, /luluvdo\.com/i,
  /vidnest/i, /hglink/i, /hubglink/i, /wishonly/i,
  /dhcplay/i, /gdriveplayer/i, /streamdady/i,
  /yuguaab/i, /cavanhabg/i, /drakkar\.st/i,
  /seekplays\.pro/i, /brainzaps\.tv/i
];

const FILE_HOST_PATTERNS = [
  /1tamilmv\./i, /strmup/i,
  /mdrive\.(buzz|ink)/i, /gdflix\.(dev|app)/i,
  /hubcloud/i, /gdxcloud/i, /vcloud\.zip/i, /filebee\.xyz/i,
  /filepress/i, /fastdl\.zip/i, /busycdn\.xyz/i, /fastcdn-dl/i,
  /goflix\.sbs/i, /nexdrive/i,
  /pub-[a-z0-9]+\.r2\.dev/i,
  /gamerxyt\.com/i,
  /cdn\.fsl-buckets\.life/i,
  /hubcloud\.fans/i
];

const SKIP_HOST_PATTERNS = [
  /google(apis)?\./i, /cloudflare/i, /cdnjs\./i,
  /facebook/i, /twitter/i, /bit\.ly/i, /tinyurl/i,
  /w3\.org/i, /googletagmanager/i, /fonts\.googleapis/i,
  /gstatic/i, /gravatar/i, /linkedin/i, /instagram/i,
  /youtube/i, /github/i, /wordpress/i, /litespeed/i,
  /megaup/i, /gofile/i, /vikingfile/i,
  /gdflix\.(dev|app)/i
];

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  return Promise.race([
    fetch(url, { ...options }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
    )
  ]);
}

async function getReadyDomain() {
  console.log("[TamilMV] Checking domains concurrently...");
  const results = await Promise.allSettled(
    POTENTIAL_DOMAINS.map(async (domain) => {
      await fetchWithTimeout(domain, { method: 'GET' }, 5000);
      return domain;
    })
  );
  for (const r of results) {
    if (r.status === 'fulfilled') {
      console.log(`[TamilMV] Found working domain: ${r.value}`);
      return r.value;
    }
  }
  console.log("[TamilMV] No working domain found, using default");
  return POTENTIAL_DOMAINS[0];
}

function unpack(p, a, c, k) {
  while (c--) {
    if (k[c]) {
      const placeholder = c.toString(a);
      p = p.replace(new RegExp('\\b' + placeholder + '\\b', 'g'), k[c]);
    }
  }
  return p;
}

function normalizeTitle(title) {
  if (!title) return '';
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function calculateTitleSimilarity(title1, title2) {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  if (norm1 === norm2) return 1.0;
  const words1 = norm1.split(/\s+/).filter(w => w.length > 2);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 2);
  const wordSet1 = new Set(words1);
  const wordSet2 = new Set(words2);
  const sharedWords = words1.filter(w => wordSet2.has(w));
  const sharedScore = sharedWords.length / Math.max(words1.length, words2.length);
  if (sharedScore >= 0.5) return 0.9;
  const intersection = new Set([...wordSet1].filter(w => wordSet2.has(w)));
  const union = new Set([...wordSet1, ...wordSet2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function findBestTitleMatch(mediaInfo, watchLinks) {
  if (!watchLinks || watchLinks.length === 0) return null;
  const targetTitle = mediaInfo.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const targetYear = mediaInfo.year ? parseInt(mediaInfo.year) : null;
  let bestMatch = null;
  let bestScore = 0;
  for (const result of watchLinks) {
    const normalizedResultTitle = result.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    let score = calculateTitleSimilarity(mediaInfo.title, result.title);
    const wordBoundaryMatch = new RegExp('\\b' + targetTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    const titleMatch = wordBoundaryMatch.test(normalizedResultTitle);
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
    console.log(`[TamilMV] Best title match: "${bestMatch.title}" (score: ${bestScore.toFixed(2)})`);
    return bestMatch;
  }
  return null;
}

function formatStreamTitle(mediaInfo, stream) {
  const { title: movieTitle, year } = mediaInfo;
  const { quality = "Unknown", size = "Unknown", language = "Tamil", type = "Movie" } = stream;
  const displayTitle = toTitleCase(movieTitle);
  const yearStr = year ? ` (${year})` : "";
  const isTorrent = stream.streamType === 'torrent';
  const sizeLine = size && size !== "Unknown" ? `💾: ${size}\n` : "";
  if (isTorrent) {
    return `TamilMV (Torrent) (${quality})
📼: ${displayTitle}${yearStr} ${quality}
${sizeLine}🌐: ${language.toUpperCase()}`;
  }
  const typeLine = type ? `📹: ${type}\n` : "";
  return `TamilMV (Instant) (${quality})
${typeLine}📼: ${displayTitle}${yearStr} ${quality}
${sizeLine}🌐: ${language.toUpperCase()}`;
}

function extractQuality(text) {
  if (/2160p|4K/i.test(text)) return '4K';
  if (/1080p/i.test(text)) return '1080p';
  if (/720p/i.test(text)) return '720p';
  if (/480p/i.test(text)) return '480p';
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

  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, script] of scripts) {
    if (!script.includes('eval(function(p,a,c,k')) continue;
    const callStart = script.indexOf("}(");
    if (callStart === -1) continue;
    const callStr = script.substring(callStart + 2);
    let depth = 0, parts = [], current = '', inString = false, stringChar = null;
    for (let i = 0; i < callStr.length; i++) {
      const ch = callStr[i];
      if (inString) {
        if (ch === '\\') { current += ch + callStr[++i]; continue; }
        current += ch;
        if (ch === stringChar) inString = false;
        continue;
      }
      if (ch === "'" || ch === '"') { inString = true; stringChar = ch; current += ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') { depth++; current += ch; continue; }
      if (ch === ')' || ch === ']' || ch === '}') { depth--; current += ch; continue; }
      if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
      current += ch;
    }
    if (current) parts.push(current);
    if (parts.length < 4) continue;
    const data = parts[0].replace(/^'/, '').replace(/'$/, '');
    const a = parseInt(parts[1]);
    const c = parseInt(parts[2]);
    let kStr = parts[3].replace(/\.split\(['"]\|['"]\)\)?\s*;?\s*$/, '').replace(/^'/, '').replace(/'$/, '');
    const k = kStr.split('|');
    const decoded = unpack(data, a, c, k);
    const vidUrls = decoded.match(/https?:\/\/[^\"'\s<>,;)]+\.(?:m3u8|mp4|mkv|webm)[^\"'\s<>,;)]*/gi);
    if (vidUrls) vidUrls.forEach(u => urls.add(u));
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
      else if (url.startsWith('?')) continue;
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
    const timeout = depth === 0 ? 8000 : 5000;
    const res = await fetchWithTimeout(url, { headers: HEADERS, redirect: 'follow' }, timeout);
    const ct = res.headers.get('content-type') || '';

    if (ct.startsWith('video/') || /\.(mp4|mkv|webm|m3u8)(\?|$)/i.test(url)) {
      return [{ url, quality: extractQuality(url), isMaster: false }];
    }

    if (!ct.includes('text/html')) return streams;

    const html = await res.text();

    const directUrls = extractDirectVideoUrls(html);
    for (const u of directUrls) {
      if (!visited.has(u)) {
        visited.add(u);
        streams.push({ url: u, quality: extractQuality(u), isMaster: false });
      }
    }

    const isEmbedOnly = EMBED_ONLY_HOSTS.some(p => p.test(url));

    if (depth < maxDepth && !isEmbedOnly) {
      const links = extractExternalLinks(html, url);
      const hostLinks = links.filter(l => isFileHost(l) && !isSkippable(l));
      const batchSize = 3;
      for (let i = 0; i < hostLinks.length; i += batchSize) {
        const batch = hostLinks.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(link =>
          smartExtract(link, depth + 1, maxDepth, visited)
        ));
        results.forEach(r => streams.push(...r));
      }
    }
  } catch (e) {
    if (depth === 0) console.error(`[TamilMV] Extract error: ${e.message}`);
  }
  return streams;
}

async function extractMagnetLinks(topicUrl) {
  try {
    console.log(`[TamilMV] Scanning topic page for magnet links: ${topicUrl}`);
    const response = await fetchWithTimeout(topicUrl, { headers: HEADERS }, 8000);
    if (!response.ok) return [];
    const html = await response.text();

    const magnets = [];
    const magnetRegex = /<a[^>]*href="(magnet:[^"]+)"[^>]*>/gi;
    let match;
    while ((match = magnetRegex.exec(html)) !== null) {
      const magnetUrl = match[1].replace(/&amp;/g, '&');
      let quality = 'Unknown';
      let size = 'Unknown';
      const dnMatch = magnetUrl.match(/[?&]dn=([^&]+)/);
      if (dnMatch) {
        const dn = decodeURIComponent(dnMatch[1].replace(/\+/g, ' '));
        if (/2160p|4K/i.test(dn)) quality = '4K';
        else if (/1080p/i.test(dn)) quality = '1080p';
        else if (/720p/i.test(dn)) quality = '720p';
        else if (/480p/i.test(dn)) quality = '480p';
        const sizeMatch = dn.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
        if (sizeMatch) size = sizeMatch[1] + ' ' + sizeMatch[2];
      }
      magnets.push({ url: magnetUrl, quality, size });
    }

    const seen = new Set();
    const unique = magnets.filter(m => {
      const hash = m.url.match(/btih:([a-f0-9]+)/i);
      const key = hash ? hash[1] : m.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[TamilMV] Found ${unique.length} unique magnet links`);
    return unique;
  } catch (error) {
    console.error(`[TamilMV] Error extracting magnet links: ${error.message}`);
    return [];
  }
}

const DIRECT_HOST_PATTERNS = [
  /mdrive\.(buzz|ink)/i, /gdflix\.(dev|app)/i,
  /pub-[a-z0-9]+\.r2\.dev/i, /goflix\.sbs/i,
  /filepress/i, /nexdrive/i, /hubcloud/i,
  /gamerxyt\.com/i,
  /cdn\.fsl-buckets\.life/i
];

async function extractTopicDirectLinks(topicUrl) {
  const streams = [];
  try {
    const res = await fetchWithTimeout(topicUrl, { headers: HEADERS }, 8000);
    if (!res.ok) return streams;
    const html = await res.text();

    const links = [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>/gi)];
    const fileHostUrls = [];
    for (const [, href] of links) {
      try {
        const url = href.startsWith('http') ? href : new URL(href, topicUrl).href;
        if (DIRECT_HOST_PATTERNS.some(p => p.test(url))) {
          fileHostUrls.push(url);
        }
      } catch(e) {}
    }

    console.log(`[TamilMV] Found ${fileHostUrls.length} direct file host links on topic page`);
    const visited = new Set();
    for (const url of fileHostUrls.slice(0, 5)) {
      const extracted = await smartExtract(url, 0, 1, visited);
      streams.push(...extracted);
    }
  } catch (e) {
    console.error(`[TamilMV] extractTopicDirectLinks error: ${e.message}`);
  }
  return streams;
}

async function getTMDBDetails(tmdbId, mediaType) {
  const type = mediaType === 'movie' ? 'movie' : 'tv';
  const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  try {
    const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) throw new Error(`TMDB error: ${response.status}`);
    const data = await response.json();
    if (!data.title && !data.name) throw new Error('TMDB returned no title');
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

async function resolveImdbId(imdbId) {
  try {
    const url = `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    const response = await fetchWithTimeout(url, {}, 8000);
    const data = await response.json();
    const movie = data.movie_results?.[0];
    const tv = data.tv_results?.[0];
    if (movie) {
      const info = { title: movie.title, year: (movie.release_date || '').split('-')[0] };
      console.log(`[TamilMV] IMDb ${imdbId} -> Movie: "${info.title}" (${info.year || 'N/A'})`);
      return info;
    }
    if (tv) {
      const info = { title: tv.name, year: (tv.first_air_date || '').split('-')[0] };
      console.log(`[TamilMV] IMDb ${imdbId} -> TV: "${info.title}" (${info.year || 'N/A'})`);
      return info;
    }
    console.log(`[TamilMV] IMDb ${imdbId} not found on TMDB`);
    return null;
  } catch (error) {
    console.error(`[TamilMV] Error resolving IMDb ID ${imdbId}:`, error.message);
    return null;
  }
}

function extractHomepageWatchLinks(html) {
  const $ = cheerio.load(html);
  const results = [];

  const wLinkRegex = /<a[^>]*href="([^"]+)"[^>]*>\[W\]<\/a>/gi;
  let match;
  while ((match = wLinkRegex.exec(html)) !== null) {
    const watchUrl = match[1];
    if (!watchUrl || results.some(r => r.watchUrl === watchUrl)) continue;

    const brBefore = html.lastIndexOf('<br', match.index);
    const sectionStart = brBefore > -1 ? html.indexOf('>', brBefore) + 1 : Math.max(0, match.index - 300);
    const sectionEnd = match.index + match[0].length;
    let section = html.substring(sectionStart, sectionEnd);

    const topicMatch = section.match(/<a[^>]*href="([^"]*\/forums\/topic\/[^"]*)"[^>]*>/i);
    const topicUrl = topicMatch ? topicMatch[1] : null;

    const $sec = cheerio.load('<div>' + section + '</div>');
    let title = $sec.root().text().trim();
    title = title.replace(/\s*-\s*\[.*?\]\s*$/, '').trim();
    title = title.replace(/\s*-\s*$/, '').trim();
    title = title.replace(/\s+/g, ' ').trim();

    if (title && title.length > 5 && title.length <= 200 && !title.includes('\n')) {
      results.push({ title, watchUrl, topicUrl });
    }
  }

  $('a[href*="/forums/topic/"]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (results.some(r => r.watchUrl === href || r.topicUrl === href)) return;

    let title = $(el).parent().text().trim();
    const linkText = $(el).text().trim();
    if (linkText.match(/^\[.*\]$/) || linkText.match(/^\d+p/)) {
      title = title.replace(linkText, '').replace(/\s*-\s*$/, '').trim();
    }
    title = title.replace(/\s+/g, ' ').trim();

    if (title && title.length > 5 && title.length <= 200 && !title.includes('\n') && !title.includes('login') && !title.includes('register')) {
      results.push({ title, watchUrl: href, topicUrl: href });
    }
  });

  return results;
}

async function searchTamilMV(query, year = null) {
  const results = [];
  const domainsToTry = [MAIN_URL];

  for (const domain of domainsToTry) {
    try {
      console.log(`[TamilMV] Trying domain: ${domain}`);
      const homeResponse = await fetchWithTimeout(domain, { method: 'GET' }, 8000);
      let homeHtml = null;
      if (typeof homeResponse === 'string') {
        homeHtml = homeResponse;
      } else if (homeResponse) {
        try {
          homeHtml = typeof homeResponse.text === 'function' ? await homeResponse.text()
            : homeResponse.body || homeResponse._body || null;
        } catch (_) {}
      }
      if (!homeHtml) continue;
      const watchLinks = extractHomepageWatchLinks(homeHtml);
      if (watchLinks.length > 0) {
        const matchingLinks = watchLinks.filter(link => {
          const score = calculateTitleSimilarity(query, link.title);
          return score > 0.2 || link.title.toLowerCase().includes(query.toLowerCase());
        });
        if (matchingLinks.length > 0) {
          console.log(`[TamilMV] Found ${matchingLinks.length} matching links on homepage`);
          for (const wl of matchingLinks) {
            results.push({
              title: wl.title,
              url: wl.watchUrl.startsWith('http') ? wl.watchUrl : domain + (wl.watchUrl.startsWith('/') ? '' : '/') + wl.watchUrl,
              topicUrl: wl.topicUrl ? (wl.topicUrl.startsWith('http') ? wl.topicUrl : domain + (wl.topicUrl.startsWith('/') ? '' : '/') + wl.topicUrl) : null
            });
          }
          if (domain !== MAIN_URL) {
            MAIN_URL = domain;
            HEADERS.Referer = `${MAIN_URL}/`;
          }
          return results;
        }
        if (watchLinks.length > 0) {
          for (const wl of watchLinks.slice(0, 20)) {
            results.push({
              title: wl.title,
              url: wl.watchUrl.startsWith('http') ? wl.watchUrl : domain + (wl.watchUrl.startsWith('/') ? '' : '/') + wl.watchUrl,
              topicUrl: wl.topicUrl ? (wl.topicUrl.startsWith('http') ? wl.topicUrl : domain + (wl.topicUrl.startsWith('/') ? '' : '/') + wl.topicUrl) : null
            });
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

async function getStreams(tmdbId, mediaType = 'movie', season = null, episode = null) {
  console.log(`[TamilMV] Processing ${mediaType} ${tmdbId}`);

  try {
    let mediaInfo;

    const imdbMatch = tmdbId.match(/^[Tt][Tt]?(\d+)$/);
    if (imdbMatch) {
      mediaInfo = await resolveImdbId(imdbMatch[0]);
      if (!mediaInfo) {
        console.log(`[TamilMV] IMDb resolve failed for "${tmdbId}", using as-is`);
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
        const yearMatch = tmdbId.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          mediaInfo.year = yearMatch[0];
          mediaInfo.title = tmdbId.replace(yearMatch[0], '').trim();
        }
      }
    }

    const workingDomain = await getReadyDomain();
    if (workingDomain !== MAIN_URL) {
      console.log(`[TamilMV] Switching MAIN_URL: ${MAIN_URL} -> ${workingDomain}`);
      MAIN_URL = workingDomain;
      HEADERS.Referer = `${MAIN_URL}/`;
    }

    console.log(`[TamilMV] Searching for: ${mediaInfo.title} (${mediaInfo.year})`);
    const searchResults = await searchTamilMV(mediaInfo.title, mediaInfo.year);
    if (!searchResults || searchResults.length === 0) {
      console.warn("[TamilMV] No search results found");
      return [];
    }

    const finalStreams = [];

    const bestMatch = findBestTitleMatch(mediaInfo, searchResults);
    if (!bestMatch) {
      console.warn("[TamilMV] No best match found, trying first 2 results");
      const topResults = searchResults.slice(0, 2);
      for (const match of topResults) {
        const magnets = match.topicUrl ? await extractMagnetLinks(match.topicUrl) : [];
        for (const magnet of magnets) {
          if (finalStreams.some(s => s.url === magnet.url)) continue;
          const obj = { quality: magnet.quality, size: magnet.size, language: "Tamil", type: mediaType === 'movie' ? "Movie" : "TV Show", streamType: "torrent" };
          finalStreams.push({ name: "Tamilmv", title: formatStreamTitle(mediaInfo, obj), url: magnet.url, quality: magnet.quality, headers: { "Referer": MAIN_URL, "User-Agent": HEADERS["User-Agent"] }, provider: 'Tamilmv', type: 'torrent' });
        }
      }
      console.log(`[Tamilmv] Returning ${finalStreams.length} streams`);
      return finalStreams;
    }

    console.log(`[TamilMV] Best match: "${bestMatch.title}"`);

    try {
      const visited = new Set();

      const watchUrl = bestMatch.url;
      const isTopicUrl = /\/forums\/topic\//i.test(watchUrl) || /1tamilmv\.(report|durban|cymru|immo|pm|org|lat|vin|st)\/index/i.test(watchUrl);

      if (watchUrl && !isTopicUrl) {
        console.log(`[TamilMV] Extracting from: ${watchUrl.substring(0, 80)}`);
        const extracted = await smartExtract(watchUrl, 0, 2, visited);
        for (const result of extracted) {
          if (result.url && !finalStreams.some(s => s.url === result.url)) {
            const quality = bestMatch.title.includes("2160p") || bestMatch.title.includes("4K") ? "4K" :
              bestMatch.title.includes("1080p") ? "1080p" :
              bestMatch.title.includes("720p") ? "720p" : (result.quality || "HD");
            let size = "Unknown";
            const sizeMatch = bestMatch.title.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
            if (sizeMatch) size = sizeMatch[1];
            const streamObj = { quality, size, language: "Tamil", type: mediaType === 'movie' ? "Movie" : "TV Show" };
            finalStreams.push({ name: "Tamilmv", title: formatStreamTitle(mediaInfo, streamObj), url: result.url, quality, headers: { "Referer": MAIN_URL, "User-Agent": HEADERS["User-Agent"] }, provider: 'Tamilmv' });
          }
        }
      }

      if (bestMatch.topicUrl) {
        console.log(`[TamilMV] Scanning topic for magnets and direct links: ${bestMatch.topicUrl.substring(0, 80)}`);
        const magnets = await extractMagnetLinks(bestMatch.topicUrl);
        for (const magnet of magnets) {
          if (finalStreams.some(s => s.url === magnet.url)) continue;
          const magnetObj = { quality: magnet.quality, size: magnet.size, language: "Tamil", type: "Movie", streamType: "torrent" };
          finalStreams.push({ name: "Tamilmv", title: formatStreamTitle(mediaInfo, magnetObj), url: magnet.url, quality: magnet.quality, headers: { "Referer": MAIN_URL, "User-Agent": HEADERS["User-Agent"] }, provider: 'Tamilmv', type: 'torrent' });
        }

        const directStreams = await extractTopicDirectLinks(bestMatch.topicUrl);
        for (const ds of directStreams) {
          if (!finalStreams.some(s => s.url === ds.url)) {
            const streamObj = { quality: ds.quality || "HD", size: "Unknown", language: "Tamil", type: "Movie" };
            finalStreams.push({ name: "Tamilmv", title: formatStreamTitle(mediaInfo, streamObj), url: ds.url, quality: ds.quality || "HD", headers: { "Referer": MAIN_URL, "User-Agent": HEADERS["User-Agent"] }, provider: 'Tamilmv' });
          }
        }
      }
    } catch (e) {
      console.error(`[Tamilmv] Failed to process match ${bestMatch.title}:`, e.message);
    }

    console.log(`[Tamilmv] Returning ${finalStreams.length} streams`);
    return finalStreams;
  } catch (error) {
    console.error("[TamilMV] getStreams failed:", error.message);
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
