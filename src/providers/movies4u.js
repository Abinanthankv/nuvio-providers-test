/**
 * movies4u - Built from src/movies4u/
 * Generated: 2026-07-11T11:58:23.124Z
 */
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/providers/movies4u/index.js
var cheerio = require("cheerio-without-node-native");
var TMDB_API_KEY = "1b3113663c9004682ed61086cf967c44";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var MAIN_URL = "https://movies4u.mw";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Referer": `${MAIN_URL}/`
};
var FILE_HOST_PATTERNS = [
  /mdrive\.(buzz|ink)/i,
  /gdflix\.(dev|app)/i,
  /hubcloud/i,
  /gdxcloud/i,
  /vcloud\.zip/i,
  /filebee\.xyz/i,
  /filepress/i,
  /fastdl\.zip/i,
  /busycdn\.xyz/i,
  /fastcdn-dl/i,
  /goflix\.sbs/i,
  /nexdrive/i,
  /pub-[a-z0-9]+\.r2\.dev/i,
  /gamerxyt\.com/i,
  /cdn\.fsl-buckets\.life/i,
  /fsl\.gigabytes\.icu/i,
  /cdn\.fukggl\.buzz/i,
  /hubcloud\.fans/i
];
var SKIP_HOST_PATTERNS = [
  /google(apis)?\./i,
  /cloudflare/i,
  /cdnjs\./i,
  /facebook/i,
  /twitter/i,
  /bit\.ly/i,
  /tinyurl/i,
  /w3\.org/i,
  /googletagmanager/i,
  /fonts\.googleapis/i,
  /gstatic/i,
  /gravatar\.com/i,
  /linkedin/i,
  /instagram/i,
  /youtube/i,
  /github/i,
  /wordpress/i,
  /litespeed/i,
  /megaup\.net/i,
  /gofile\.io/i,
  /vikingfile/i,
  /gdflix\.(dev|app)/i
];
function fetchWithTimeout(_0) {
  return __async(this, arguments, function* (url, options = {}, timeout = 1e4) {
    return Promise.race([
      fetch(url, __spreadValues({}, options)),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
      )
    ]);
  });
}
function normalizeTitle(title) {
  if (!title)
    return "";
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}
function calculateTitleSimilarity(title1, title2) {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  if (norm1 === norm2)
    return 1;
  if (norm1.includes(norm2) || norm2.includes(norm1))
    return 0.9;
  const words1 = new Set(norm1.split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(norm2.split(/\s+/).filter((w) => w.length > 2));
  if (words1.size === 0 || words2.size === 0)
    return 0;
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = /* @__PURE__ */ new Set([...words1, ...words2]);
  return intersection.size / union.size;
}
function findBestTitleMatch(mediaInfo, searchResults) {
  if (!searchResults || searchResults.length === 0)
    return null;
  const targetTitle = mediaInfo.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetYear = mediaInfo.year ? parseInt(mediaInfo.year) : null;
  let bestMatch = null;
  let bestScore = 0;
  for (const result of searchResults) {
    const normalizedResultTitle = result.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    let score = calculateTitleSimilarity(mediaInfo.title, result.title);
    const titleMatch = normalizedResultTitle.includes(targetTitle) || targetTitle.includes(normalizedResultTitle);
    const yearMatch = !targetYear || result.title.includes(targetYear.toString()) || result.title.includes((targetYear + 1).toString()) || result.title.includes((targetYear - 1).toString());
    if (titleMatch && yearMatch)
      score += 0.5;
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
    if (yearMatch)
      year = yearMatch[0];
  }
  let size = "UNKNOWN";
  const sizeMatch = stream.text ? stream.text.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i) : null;
  if (sizeMatch)
    size = sizeMatch[1].toUpperCase();
  let type = "UNKNOWN";
  const searchString = ((stream.text || "") + " " + (stream.url || "") + " " + (stream.label || "")).toLowerCase();
  if (searchString.includes("bluray") || searchString.includes("brrip"))
    type = "BluRay";
  else if (searchString.includes("web-dl"))
    type = "WEB-DL";
  else if (searchString.includes("webrip"))
    type = "WEBRip";
  else if (searchString.includes("hdrip"))
    type = "HDRip";
  else if (searchString.includes("dvdrip"))
    type = "DVDRip";
  else if (searchString.includes("bdrip"))
    type = "BDRip";
  else if (searchString.includes("hdtv"))
    type = "HDTV";
  const yearStr = year ? ` (${year})` : "";
  const displayQuality = quality;
  const typeLine = type && type !== "UNKNOWN" ? `\u{1F4FA}: ${type}
` : "";
  const sizeLine = size && size !== "UNKNOWN" ? `\u{1F4BE}: ${size} | \u{1F69C}: movies4u
` : "";
  return `Movies4u (Instant) (${displayQuality})
${typeLine}\u{1F4FC}: ${title}${yearStr} - ${displayQuality}
${sizeLine}\u{1F310}: UNKNOWN`;
}
function extractQuality(text) {
  if (/1080p|2160p/i.test(text))
    return "1080p";
  if (/720p/i.test(text))
    return "720p";
  if (/480p/i.test(text))
    return "480p";
  if (/4K/i.test(text))
    return "4K";
  return "HD";
}
function isFileHost(url) {
  return FILE_HOST_PATTERNS.some((p) => p.test(url));
}
function isSkippable(url) {
  return SKIP_HOST_PATTERNS.some((p) => p.test(url));
}
function extractDirectVideoUrls(html) {
  const urls = /* @__PURE__ */ new Set();
  const patterns = [
    /https?:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\"'\\s<>]+\.(?:mp4|mkv|webm)(?:\?[^\"'\\s<>]*)?/gi,
    /https?:\/\/[^\"'\\s<>]+\.(?:mp4|mkv|webm)(?:\?[^\"'\\s<>]*)?/gi,
    /https?:\/\/[^\"'\\s<>]+\.(?:m3u8|txt)(?:\?[^\"'\\s<>]*)?/gi
  ];
  for (const p of patterns) {
    const matches = html.match(p);
    if (matches)
      matches.forEach((u) => urls.add(u));
  }
  return [...urls];
}
function extractExternalLinks(html, baseUrl) {
  let base = "";
  try {
    base = baseUrl ? new URL(baseUrl).origin : "";
  } catch (e) {
  }
  const anchors = [...html.matchAll(/<a[^>]*href=\"([^\"]+)\"[^>]*>/gi)];
  const links = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [, href] of anchors) {
    try {
      let url = href.trim();
      if (url.startsWith("//"))
        url = "https:" + url;
      else if (url.startsWith("/") && base)
        url = base + url;
      if (!url.startsWith("http"))
        continue;
      new URL(url);
      if (seen.has(url))
        continue;
      seen.add(url);
      links.push(url);
    } catch (e) {
    }
  }
  return links;
}
function smartExtract(_0) {
  return __async(this, arguments, function* (url, depth = 0, maxDepth = 2, visited = /* @__PURE__ */ new Set()) {
    if (depth > maxDepth || visited.has(url))
      return [];
    visited.add(url);
    const streams = [];
    try {
      const res = yield fetchWithTimeout(url, { headers: HEADERS, redirect: "follow" }, 8e3);
      const ct = res.headers.get("content-type") || "";
      if (ct.startsWith("video/") || /\.(mp4|mkv|webm|m3u8)(\?|$)/i.test(url)) {
        console.log(`[Movies4u] Direct video: ${url.substring(0, 80)}`);
        return [{ url, quality: extractQuality(url), isMaster: false }];
      }
      if (!ct.includes("text/html") && !ct.includes("application/json"))
        return streams;
      const html = yield res.text();
      let directUrls = extractDirectVideoUrls(html);
      const anchorVideos = extractExternalLinks(html, url).filter((l) => /\.(mp4|mkv|webm|m3u8)(\?|$)/i.test(l));
      for (const u of anchorVideos) {
        if (!directUrls.includes(u))
          directUrls = [...directUrls, u];
      }
      for (const u of directUrls) {
        if (!visited.has(u)) {
          visited.add(u);
          streams.push({ url: u, quality: extractQuality(u), isMaster: false });
        }
      }
      if (depth < maxDepth) {
        const links = extractExternalLinks(html, url);
        const hostLinks = links.filter((l) => isFileHost(l) && !isSkippable(l));
        const batchSize = 5;
        for (let i = 0; i < hostLinks.length; i += batchSize) {
          const batch = hostLinks.slice(i, i + batchSize);
          const results = yield Promise.all(batch.map(
            (link) => smartExtract(link, depth + 1, maxDepth, visited)
          ));
          results.forEach((r) => streams.push(...r));
        }
      }
    } catch (e) {
      if (depth === 0)
        console.error(`[Movies4u] Extract error: ${e.message}`);
    }
    return streams;
  });
}
function extractWatchLinks(movieUrl) {
  return new Promise((resolve) => __async(this, null, function* () {
    try {
      console.log(`[Movies4u] Extracting watch links from: ${movieUrl}`);
      const response = yield fetchWithTimeout(movieUrl, { headers: HEADERS }, 8e3);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const watchLinks = [];
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (href && (href.includes("m4uplay") || href.includes("mdrive.ink") || href.includes("filepress") || href.includes("mdrive.buzz"))) {
          watchLinks.push({
            url: href,
            quality: text.includes("1080p") ? "1080p" : text.includes("720p") ? "720p" : text.includes("480p") ? "480p" : text.includes("4K") || text.includes("2160p") ? "4K" : "HD",
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
  }));
}
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "movie" ? "movie" : "tv";
    const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = yield fetchWithTimeout(url, {}, 8e3);
    if (!response.ok)
      throw new Error(`TMDB error: ${response.status}`);
    const data = yield response.json();
    return {
      title: data.title || data.name,
      year: (data.release_date || data.first_air_date || "").split("-")[0]
    };
  });
}
function resolveImdbId(imdbId) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      const url = `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
      const response = yield fetchWithTimeout(url, {}, 8e3);
      const data = yield response.json();
      const movie = (_a = data.movie_results) == null ? void 0 : _a[0];
      const tv = (_b = data.tv_results) == null ? void 0 : _b[0];
      if (movie) {
        const info = { title: movie.title, year: (movie.release_date || "").split("-")[0] };
        console.log(`[Movies4u] IMDb ${imdbId} -> Movie: "${info.title}" (${info.year || "N/A"})`);
        return info;
      }
      if (tv) {
        const info = { title: tv.name, year: (tv.first_air_date || "").split("-")[0] };
        console.log(`[Movies4u] IMDb ${imdbId} -> TV: "${info.title}" (${info.year || "N/A"})`);
        return info;
      }
      console.log(`[Movies4u] IMDb ${imdbId} not found on TMDB`);
      return null;
    } catch (error) {
      console.error(`[Movies4u] Error resolving IMDb ID ${imdbId}:`, error.message);
      return null;
    }
  });
}
function searchMovies(query) {
  return __async(this, null, function* () {
    try {
      const searchUrl = `${MAIN_URL}/?s=${encodeURIComponent(query)}`;
      console.log(`[Movies4u] Searching: ${searchUrl}`);
      const response = yield fetchWithTimeout(searchUrl, { headers: HEADERS }, 8e3);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const results = [];
      $(".entry-title a").each((i, el) => {
        const title = $(el).text().trim();
        const url = $(el).attr("href");
        if (title && url)
          results.push({ title, url });
      });
      console.log(`[Movies4u] Found ${results.length} search results`);
      return results;
    } catch (error) {
      console.error(`[Movies4u] Search error: ${error.message}`);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    console.log(`[Movies4u] Processing ${mediaType} ${tmdbId}`);
    try {
      let mediaInfo;
      const imdbMatch = tmdbId.match(/^[Tt][Tt]?(\d+)$/);
      if (imdbMatch) {
        mediaInfo = yield resolveImdbId(imdbMatch[0]);
        if (!mediaInfo) {
          console.log(`[Movies4u] IMDb resolve failed for "${tmdbId}", using as-is`);
          mediaInfo = { title: tmdbId, year: null };
        }
      } else {
        const numericId = tmdbId.replace(/^[^\d]+/, "");
        const isNumericId = /^\d+$/.test(numericId);
        if (isNumericId) {
          try {
            mediaInfo = yield getTMDBDetails(numericId, mediaType);
          } catch (error) {
            mediaInfo = { title: tmdbId, year: null };
          }
        } else {
          mediaInfo = { title: tmdbId, year: null };
        }
      }
      const searchResults = yield searchMovies(mediaInfo.title);
      if (searchResults.length === 0)
        return [];
      const bestMatch = findBestTitleMatch(mediaInfo, searchResults);
      if (!bestMatch)
        return [];
      console.log(`[Movies4u] Found match: ${bestMatch.title}`);
      const yearMatch = bestMatch.title.match(/\((20\d{2}|19\d{2})\)/);
      if (mediaInfo.title.toLowerCase() === tmdbId.toLowerCase()) {
        mediaInfo.title = bestMatch.title.split("(")[0].trim();
        if (yearMatch)
          mediaInfo.year = yearMatch[1];
      }
      const watchLinks = yield extractWatchLinks(bestMatch.url);
      if (watchLinks.length === 0)
        return [];
      const streams = [];
      const visited = /* @__PURE__ */ new Set();
      for (const watchLink of watchLinks) {
        const results = yield smartExtract(watchLink.url, 0, 2, visited);
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
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
