/**
 * moviesda - Built from src/moviesda/
 * Generated: 2026-03-05T16:00:59.452Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// src/providers/moviesda/index.js
var cheerio = require("cheerio-without-node-native");
var TMDB_API_KEY = "1b3113663c9004682ed61086cf967c44";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var MAIN_URL = "https://moviesda15.com";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Referer": `${MAIN_URL}/`
};
function fetchWithTimeout(_0) {
  return __async(this, arguments, function* (url, options = {}, timeout = 1e4) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = yield fetch(url, __spreadProps(__spreadValues({}, options), {
        signal: controller.signal
      }));
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
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
function unpack(p, a, c, k) {
  while (c--) {
    if (k[c]) {
      const placeholder = c.toString(a);
      p = p.replace(new RegExp("\\b" + placeholder + "\\b", "g"), k[c]);
    }
  }
  return p;
}
function findBestTitleMatch(mediaInfo, searchResults) {
  if (!searchResults || searchResults.length === 0)
    return null;
  const targetYear = mediaInfo.year ? parseInt(mediaInfo.year) : null;
  let bestMatch = null;
  let bestScore = 0;
  for (const result of searchResults) {
    let score = calculateTitleSimilarity(mediaInfo.title, result.title);
    if (targetYear) {
      if (result.title.includes(targetYear.toString())) {
        score += 0.3;
      } else if (result.title.includes((targetYear + 1).toString()) || result.title.includes((targetYear - 1).toString())) {
        score += 0.1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = result;
    }
  }
  if (bestMatch && bestScore > 0.4) {
    console.log(`[Moviesda] Best match: "${bestMatch.title}" (score: ${bestScore.toFixed(2)})`);
    return bestMatch;
  }
  return null;
}
function formatStreamTitle(mediaInfo, stream) {
  const quality = stream.quality || "Unknown";
  const title = mediaInfo.title || "Unknown";
  const year = mediaInfo.year || "";
  let size = "";
  const sizeMatch = stream.text ? stream.text.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i) : null;
  if (sizeMatch)
    size = sizeMatch[1];
  let type = "";
  const searchString = ((stream.text || "") + " " + (stream.url || "")).toLowerCase();
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
  const typeLine = type ? `\u{1F4F9}: ${type}
` : "";
  const sizeLine = size ? `\u{1F4BE}: ${size} | \u{1F69C}: moviesda
` : "";
  const yearStr = year && year !== "N/A" ? ` ${year}` : "";
  const langMarkers = {
    "TAMIL": /tamil/i,
    "HINDI": /hindi/i,
    "TELUGU": /telugu/i,
    "MALAYALAM": /malayalam/i,
    "KANNADA": /kannada/i,
    "ENGLISH": /english|eng/i,
    "MULTI AUDIO": /multi/i
  };
  let language = "TAMIL";
  for (const [name, regex] of Object.entries(langMarkers)) {
    if (regex.test(searchString)) {
      language = name;
      break;
    }
  }
  return `Moviesda (Instant) (${quality})
${typeLine}\u{1F4FC}: ${title}${yearStr} ${quality}
${sizeLine}\u{1F310}: ${language}`;
}
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "movie" ? "movie" : "tv";
    const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    try {
      const response = yield fetchWithTimeout(url, {}, 8e3);
      const data = yield response.json();
      const info = {
        title: data.title || data.name,
        year: (data.release_date || data.first_air_date || "").split("-")[0]
      };
      console.log(`[Moviesda] TMDB Info: "${info.title}" (${info.year || "N/A"})`);
      return info;
    } catch (error) {
      console.error("[Moviesda] Error fetching TMDB metadata:", error.message);
      throw error;
    }
  });
}
function searchTMDBByTitle(title, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "movie" ? "movie" : "tv";
    const url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    try {
      console.log(`[Moviesda] Searching TMDB for: "${title}"`);
      const response = yield fetchWithTimeout(url, {}, 8e3);
      const data = yield response.json();
      if (data.results && data.results.length > 0) {
        const firstResult = data.results[0];
        const info = {
          title: firstResult.title || firstResult.name,
          year: (firstResult.release_date || firstResult.first_air_date || "").split("-")[0]
        };
        console.log(`[Moviesda] TMDB Search Result: "${info.title}" (${info.year || "N/A"})`);
        return info;
      }
      console.log(`[Moviesda] No TMDB results found for "${title}"`);
      return null;
    } catch (error) {
      console.error("[Moviesda] Error searching TMDB:", error.message);
      return null;
    }
  });
}
function search(query, year = null) {
  return __async(this, null, function* () {
    console.log(`[Moviesda] Searching for: "${query}" (year: ${year || "any"})`);
    try {
      const results = [];
      const categoriesToCheck = [];
      if (year) {
        categoriesToCheck.push(`${MAIN_URL}/tamil-${year}-movies/`);
      } else {
        const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
        for (let y = currentYear; y >= currentYear - 2; y--) {
          categoriesToCheck.push(`${MAIN_URL}/tamil-${y}-movies/`);
        }
      }
      console.log(`[Moviesda] Checking ${categoriesToCheck.length} category pages`);
      for (const categoryUrl of categoriesToCheck) {
        try {
          const response = yield fetchWithTimeout(categoryUrl, { headers: HEADERS }, 8e3);
          const html = yield response.text();
          const $ = cheerio.load(html);
          $('a[href*="-tamil-movie"], a[href*="-movie/"]').each((i, el) => {
            const href = $(el).attr("href");
            const text = $(el).text().trim();
            if (!href || href.includes("/tamil-movies/") || href === "#" || text.length < 3) {
              return;
            }
            const match = text.match(/^(.+?)\s*(?:\((\d{4})\))?$/);
            if (match) {
              const title = match[1].trim();
              const movieYear = match[2] || null;
              const fullUrl = href.startsWith("http") ? href : `${MAIN_URL}${href}`;
              results.push({
                title: text,
                // Keep full text with year
                cleanTitle: title,
                year: movieYear,
                href: fullUrl
              });
            }
          });
        } catch (error) {
          console.error(`[Moviesda] Error browsing ${categoryUrl}: ${error.message}`);
        }
      }
      console.log(`[Moviesda] Found ${results.length} total movies in categories`);
      return results;
    } catch (error) {
      console.error("[Moviesda] Search error:", error.message);
      return [];
    }
  });
}
function extractFromGenericEmbed(embedUrl, hostName) {
  return __async(this, null, function* () {
    try {
      const embedBase = new URL(embedUrl).origin;
      const response = yield fetchWithTimeout(embedUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Referer": MAIN_URL
        })
      }, 5e3);
      let html = yield response.text();
      const packerMatch = html.match(new RegExp("eval\\(function\\(p,a,c,k,e,d\\)\\{.*?\\}\\s*\\((.*)\\)\\s*\\)", "s"));
      if (packerMatch) {
        console.log(`[Moviesda] Detected Packer obfuscation on ${hostName}, unpacking...`);
        const rawArgs = packerMatch[1].trim();
        const pMatch = rawArgs.match(new RegExp("^'(.*)',\\s*(\\d+),\\s*(\\d+),\\s*'(.*?)'\\.split\\(", "s"));
        if (pMatch) {
          const unpacked = unpack(pMatch[1], parseInt(pMatch[2]), parseInt(pMatch[3]), pMatch[4].split("|"));
          html += "\n" + unpacked;
        }
      }
      const patterns = [
        /["']hls[2-4]["']\s*:\s*["']([^"']+)["']/gi,
        /sources\s*:\s*\[\s*{\s*file\s*:\s*["']([^"']+)["']/gi,
        /https?:\/\/[^\s"']+\.m3u8[^\s"']*/gi,
        /["'](\/[^\s"']+\.m3u8[^\s"']*)["']/gi,
        /https?:\/\/[^\s"']+\.mp4[^\s"']*/gi,
        /(?:source|file|src)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi
      ];
      const allFoundUrls = [];
      for (const pattern of patterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          for (let match of matches) {
            let videoUrl = match;
            const kvMatch = match.match(/["']:[ ]*["']([^"']+)["']/);
            if (kvMatch) {
              videoUrl = kvMatch[1];
            } else {
              const quoteMatch = match.match(/["']([^"']+)["']/);
              if (quoteMatch)
                videoUrl = quoteMatch[1];
            }
            const absUrlMatch = videoUrl.match(/https?:\/\/[^\s"']+/);
            if (absUrlMatch)
              videoUrl = absUrlMatch[0];
            videoUrl = videoUrl.replace(/[\\"'\)\]]+$/, "");
            if (!videoUrl || videoUrl.length < 5 || videoUrl.includes("google.com") || videoUrl.includes("youtube.com")) {
              continue;
            }
            if (videoUrl.startsWith("/") && !videoUrl.startsWith("//")) {
              videoUrl = embedBase + videoUrl;
            }
            allFoundUrls.push(videoUrl);
          }
        }
      }
      if (allFoundUrls.length > 0) {
        allFoundUrls.sort((a, b) => {
          const isM3U8A = a.toLowerCase().includes(".m3u8");
          const isM3U8B = b.toLowerCase().includes(".m3u8");
          if (isM3U8A !== isM3U8B)
            return isM3U8B ? 1 : -1;
          return a.length - b.length;
        });
        const bestUrl = allFoundUrls[0];
        console.log(`[Moviesda] Found direct URL from ${hostName}: ${bestUrl}`);
        return bestUrl;
      }
      console.log(`[Moviesda] No direct URL found in ${hostName}, skipping`);
      return null;
    } catch (error) {
      console.error(`[Moviesda] Error extracting from ${hostName}: ${error.message}`);
      return null;
    }
  });
}
function extractDirectStream(embedUrl) {
  return __async(this, null, function* () {
    try {
      console.log(`[Moviesda] Extracting from embed: ${embedUrl}`);
      const url = new URL(embedUrl);
      const hostname = url.hostname.toLowerCase();
      if (hostname.includes("onestream.watch")) {
        return yield extractFromOnestream(embedUrl);
      }
      return yield extractFromGenericEmbed(embedUrl, hostname);
    } catch (error) {
      console.error(`[Moviesda] Extraction error: ${error.message}`);
      return null;
    }
  });
}
function extractFromOnestream(embedUrl) {
  return __async(this, null, function* () {
    console.log(`[Moviesda] Extracting from onestream.watch: ${embedUrl}`);
    try {
      const response = yield fetchWithTimeout(embedUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Referer": MAIN_URL
        })
      }, 8e3);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const videoSources = [];
      $("video source").each((i, el) => {
        const src = $(el).attr("src");
        const type = $(el).attr("type");
        if (src) {
          videoSources.push({ src, type });
        }
      });
      if (videoSources.length > 0) {
        const directUrl = videoSources[0].src;
        console.log(`[Moviesda] Found direct URL from onestream: ${directUrl}`);
        return directUrl;
      }
      const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
      if (m3u8Match) {
        console.log(`[Moviesda] Found m3u8 URL: ${m3u8Match[0]}`);
        return m3u8Match[0];
      }
      const mp4Match = html.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/i);
      if (mp4Match) {
        console.log(`[Moviesda] Found mp4 URL: ${mp4Match[0]}`);
        return mp4Match[0];
      }
      console.log(`[Moviesda] No direct URL found in onestream page`);
      return null;
    } catch (error) {
      console.error(`[Moviesda] Onestream extraction error: ${error.message}`);
      return null;
    }
  });
}
function parseMoviePage(url) {
  return __async(this, null, function* () {
    console.log(`[Moviesda] Parsing movie page: ${url}`);
    try {
      const response = yield fetchWithTimeout(url, { headers: HEADERS }, 8e3);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const streams = [];
      const originalLink = $('a[href*="-original-movie"]');
      if (originalLink.length > 0) {
        const originalUrl = originalLink.attr("href");
        const fullOriginalUrl = originalUrl.startsWith("http") ? originalUrl : `${MAIN_URL}${originalUrl}`;
        console.log(`[Moviesda] Found original page link: ${fullOriginalUrl}`);
        return yield parseOriginalPage(fullOriginalUrl);
      }
      const qualityLinks = [];
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (href && text.match(/\b(360p|480p|720p|1080p|4K)\s*HD\b/i)) {
          const qualityMatch = text.match(/\b(360p|480p|720p|1080p|4K)\b/i);
          const quality = qualityMatch ? qualityMatch[0] : "Unknown";
          const fullUrl = href.startsWith("http") ? href : `${MAIN_URL}${href}`;
          qualityLinks.push({ url: fullUrl, quality });
        }
      });
      if (qualityLinks.length > 0) {
        console.log(`[Moviesda] Found ${qualityLinks.length} quality pages`);
        for (const qualityLink of qualityLinks) {
          const qualityStreams = yield parseQualityPage(qualityLink.url, qualityLink.quality);
          qualityStreams.forEach((s) => {
            if (!s.text)
              s.text = qualityLink.text || "";
          });
          streams.push(...qualityStreams);
        }
        return streams;
      }
      const downloadLinks = [];
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (href && href.includes("/download/")) {
          const fullUrl = href.startsWith("http") ? href : `${MAIN_URL}${href}`;
          downloadLinks.push({ url: fullUrl, text });
        }
      });
      if (downloadLinks.length > 0) {
        console.log(`[Moviesda] Found ${downloadLinks.length} download links on quality page`);
        downloadLinks.forEach((link) => {
          streams.push({
            url: link.url,
            quality: "Unknown",
            type: "download"
          });
        });
      }
      console.log(`[Moviesda] Found ${streams.length} streams on page`);
      return streams;
    } catch (error) {
      console.error("[Moviesda] Movie page parse error:", error.message);
      return [];
    }
  });
}
function parseOriginalPage(url) {
  return __async(this, null, function* () {
    console.log(`[Moviesda] Parsing original page: ${url}`);
    try {
      const response = yield fetchWithTimeout(url, { headers: HEADERS }, 8e3);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const streams = [];
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (href && text.match(/\b(360p|480p|720p|1080p|4K)\s*HD\b/i)) {
          const qualityMatch = text.match(/\b(360p|480p|720p|1080p|4K)\b/i);
          const quality = qualityMatch ? qualityMatch[0] : "Unknown";
          const fullUrl = href.startsWith("http") ? href : `${MAIN_URL}${href}`;
          streams.push({
            url: fullUrl,
            quality,
            type: "quality_page"
          });
        }
      });
      console.log(`[Moviesda] Found ${streams.length} quality pages on original page`);
      const finalStreams = [];
      for (const stream of streams) {
        const qualityStreams = yield parseQualityPage(stream.url, stream.quality);
        finalStreams.push(...qualityStreams);
      }
      return finalStreams;
    } catch (error) {
      console.error("[Moviesda] Original page parse error:", error.message);
      return [];
    }
  });
}
function parseQualityPage(url, quality) {
  return __async(this, null, function* () {
    console.log(`[Moviesda] Parsing quality page (${quality}): ${url}`);
    try {
      const response = yield fetchWithTimeout(url, { headers: HEADERS }, 8e3);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const streams = [];
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (href && href.includes("/download/")) {
          const fullUrl = href.startsWith("http") ? href : `${MAIN_URL}${href}`;
          streams.push({
            url: fullUrl,
            quality,
            type: "download",
            text
            // Keep text for size extraction
          });
        }
      });
      console.log(`[Moviesda] Found ${streams.length} download links for ${quality}`);
      return streams;
    } catch (error) {
      console.error(`[Moviesda] Quality page parse error (${quality}): ${error.message}`);
      return [];
    }
  });
}
function extractFinalDownloadUrl(downloadPageUrl) {
  return __async(this, null, function* () {
    console.log(`[Moviesda] Extracting final URL from: ${downloadPageUrl}`);
    try {
      const response = yield fetchWithTimeout(downloadPageUrl, { headers: HEADERS }, 8e3);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const downloadLinks = [];
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim().toLowerCase();
        if (href && !href.includes("moviesda15.com") && !href.includes("/tamil-movies/") && !href.startsWith("#") && (text.includes("download") || text.includes("server"))) {
          const fullUrl = href.startsWith("http") ? href : `https:${href}`;
          downloadLinks.push(fullUrl);
        }
      });
      if (downloadLinks.length > 0) {
        const downloadUrl = downloadLinks[0];
        console.log(`[Moviesda] Found download URL: ${downloadUrl}`);
        if (downloadUrl.includes("download.moviespage.xyz/download/file/")) {
          const fileIdMatch = downloadUrl.match(/\/file\/(\d+)/);
          if (fileIdMatch) {
            const fileId = fileIdMatch[1];
            const streamUrl = `https://play.onestream.watch/stream/page/${fileId}`;
            console.log(`[Moviesda] Converted to onestream URL: ${streamUrl}`);
            return { url: streamUrl, needsExtraction: true };
          }
        }
        return { url: downloadUrl, needsExtraction: false };
      }
      console.log(`[Moviesda] No final download URL found on page`);
      return null;
    } catch (error) {
      console.error(`[Moviesda] Error extracting final URL: ${error.message}`);
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    console.log(`[Moviesda] Processing ${mediaType} ${tmdbId}`);
    try {
      let mediaInfo;
      const isNumericId = /^\d+$/.test(tmdbId);
      if (isNumericId) {
        try {
          mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
        } catch (error) {
          console.log(`[Moviesda] TMDB fetch failed, using "${tmdbId}" as search query`);
          mediaInfo = { title: tmdbId, year: null };
        }
      } else {
        console.log(`[Moviesda] Using "${tmdbId}" as search query`);
        try {
          const tmdbResult = yield searchTMDBByTitle(tmdbId, mediaType);
          if (tmdbResult && tmdbResult.year) {
            mediaInfo = tmdbResult;
          } else {
            mediaInfo = { title: tmdbId, year: null };
          }
        } catch (error) {
          console.log(`[Moviesda] TMDB search failed: ${error.message}`);
          mediaInfo = { title: tmdbId, year: null };
        }
      }
      console.log(`[Moviesda] Looking for: "${mediaInfo.title}" (${mediaInfo.year || "N/A"})`);
      let searchResults = yield search(mediaInfo.title, mediaInfo.year);
      const bestMatch = findBestTitleMatch(mediaInfo, searchResults);
      if (!bestMatch) {
        console.warn("[Moviesda] No matching title found in category pages");
        const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
        const yearsToTry = mediaInfo.year ? [mediaInfo.year, currentYear, currentYear - 1] : (
          // Try recent years first (most likely), then expand backwards to 2010
          [
            currentYear,
            currentYear - 1,
            currentYear + 1,
            currentYear - 2,
            currentYear - 3,
            currentYear - 4
          ]
        );
        for (const year of yearsToTry) {
          const slug = mediaInfo.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");
          const directUrl = `${MAIN_URL}/${slug}-${year}-tamil-movie/`;
          console.log(`[Moviesda] Trying direct URL: ${directUrl}`);
          try {
            const response = yield fetchWithTimeout(directUrl, { headers: HEADERS }, 5e3);
            if (response.ok) {
              const html = yield response.text();
              if (html.includes("entry-title") || html.includes("movie")) {
                console.log(`[Moviesda] \u2713 Direct URL found: ${directUrl}`);
                const rawStreams2 = yield parseMoviePage(directUrl);
                if (rawStreams2.length > 0) {
                  const limitedStreams2 = rawStreams2.slice(0, 5);
                  const finalStreams2 = [];
                  for (const stream of limitedStreams2) {
                    let finalUrl = stream.url;
                    if (stream.type === "download") {
                      try {
                        const result = yield Promise.race([
                          extractFinalDownloadUrl(stream.url),
                          new Promise(
                            (_, reject) => setTimeout(() => reject(new Error("Extraction timeout")), 5e3)
                          )
                        ]);
                        if (!result)
                          continue;
                        if (result.needsExtraction) {
                          try {
                            const directUrl2 = yield Promise.race([
                              extractFromOnestream(result.url),
                              new Promise(
                                (_, reject) => setTimeout(() => reject(new Error("Onestream extraction timeout")), 5e3)
                              )
                            ]);
                            if (!directUrl2)
                              continue;
                            finalUrl = directUrl2;
                          } catch (error) {
                            console.error(`[Moviesda] Onestream extraction failed: ${error.message}`);
                            continue;
                          }
                        } else {
                          finalUrl = result.url;
                        }
                      } catch (error) {
                        console.error(`[Moviesda] Download URL extraction failed: ${error.message}`);
                        continue;
                      }
                    }
                    finalStreams2.push({
                      name: "Moviesda",
                      title: formatStreamTitle(mediaInfo, stream),
                      url: finalUrl,
                      quality: stream.quality || "Unknown",
                      headers: {
                        "Referer": MAIN_URL,
                        "User-Agent": HEADERS["User-Agent"]
                      },
                      provider: "Moviesda"
                    });
                  }
                  console.log(`[Moviesda] Successfully extracted ${finalStreams2.length} streams`);
                  return finalStreams2;
                }
              }
            }
          } catch (error) {
            console.log(`[Moviesda] Direct URL failed for ${year}: ${error.message}`);
          }
        }
        console.warn("[Moviesda] No results found via category search or direct URL");
        return [];
      }
      console.log(`[Moviesda] Processing match: ${bestMatch.title}`);
      const rawStreams = yield parseMoviePage(bestMatch.href);
      if (rawStreams.length === 0) {
        console.warn("[Moviesda] No streams found on movie page");
        return [];
      }
      const limitedStreams = rawStreams.slice(0, 5);
      if (rawStreams.length > 5) {
        console.log(`[Moviesda] Limiting to first 5 streams out of ${rawStreams.length}`);
      }
      const finalStreams = [];
      for (const stream of limitedStreams) {
        let finalUrl = stream.url;
        if (stream.type === "download") {
          try {
            const result = yield Promise.race([
              extractFinalDownloadUrl(stream.url),
              new Promise(
                (_, reject) => setTimeout(() => reject(new Error("Extraction timeout")), 5e3)
              )
            ]);
            if (!result) {
              console.log(`[Moviesda] Failed to extract final URL from download page, skipping`);
              continue;
            }
            if (result.needsExtraction) {
              console.log(`[Moviesda] URL needs extraction from onestream`);
              try {
                const directUrl = yield Promise.race([
                  extractFromOnestream(result.url),
                  new Promise(
                    (_, reject) => setTimeout(() => reject(new Error("Onestream extraction timeout")), 5e3)
                  )
                ]);
                if (!directUrl) {
                  console.log(`[Moviesda] Failed to extract from onestream, skipping`);
                  continue;
                }
                finalUrl = directUrl;
              } catch (error) {
                console.error(`[Moviesda] Onestream extraction failed: ${error.message}`);
                continue;
              }
            } else {
              finalUrl = result.url;
            }
          } catch (error) {
            console.error(`[Moviesda] Download URL extraction failed: ${error.message}`);
            continue;
          }
        } else if (stream.type === "embed") {
          try {
            const extractedUrl = yield Promise.race([
              extractDirectStream(stream.url),
              new Promise(
                (_, reject) => setTimeout(() => reject(new Error("Extraction timeout")), 5e3)
              )
            ]);
            if (!extractedUrl) {
              console.log(`[Moviesda] Failed to extract from embed, skipping`);
              continue;
            }
            finalUrl = extractedUrl;
          } catch (error) {
            console.error(`[Moviesda] Embed extraction failed: ${error.message}`);
            continue;
          }
        }
        finalStreams.push({
          name: "Moviesda",
          title: formatStreamTitle(mediaInfo, stream),
          url: finalUrl,
          quality: stream.quality,
          headers: {
            "Referer": MAIN_URL,
            "User-Agent": HEADERS["User-Agent"]
          },
          provider: "Moviesda"
        });
      }
      console.log(`[Moviesda] Successfully extracted ${finalStreams.length} streams`);
      return finalStreams;
    } catch (error) {
      console.error("[Moviesda] getStreams failed:", error.message);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
