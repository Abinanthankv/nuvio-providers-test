/**
 * tamilmv - Built from src/tamilmv/
 * Generated: 2026-03-05T14:23:58.945Z
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

// src/providers/tamilmv/index.js
var cheerio = require("cheerio-without-node-native");
var TMDB_API_KEY = "1b3113663c9004682ed61086cf967c44";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var MAIN_URL = "https://www.1tamilmv.lc";
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
function unpack(p, a, c, k) {
  while (c--) {
    if (k[c]) {
      const placeholder = c.toString(a);
      p = p.replace(new RegExp("\\b" + placeholder + "\\b", "g"), k[c]);
    }
  }
  return p;
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
function findBestTitleMatch(mediaInfo, watchLinks) {
  if (!watchLinks || watchLinks.length === 0)
    return null;
  const targetTitle = mediaInfo.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetYear = mediaInfo.year ? parseInt(mediaInfo.year) : null;
  let bestMatch = null;
  let bestScore = 0;
  for (const result of watchLinks) {
    const normalizedResultTitle = result.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    let score = calculateTitleSimilarity(mediaInfo.title, result.title);
    const titleMatch = normalizedResultTitle.includes(targetTitle) || targetTitle.includes(normalizedResultTitle);
    const yearMatch = !targetYear || result.title.includes(targetYear.toString()) || result.title.includes((targetYear + 1).toString()) || result.title.includes((targetYear - 1).toString());
    if (titleMatch && yearMatch) {
      score += 0.5;
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
function extractDirectStream(embedUrl) {
  return __async(this, null, function* () {
    try {
      console.log(`[TamilMV] Embed URL: ${embedUrl}`);
      const url = new URL(embedUrl);
      const hostname = url.hostname.toLowerCase();
      console.log(`[TamilMV] Attempting to extract from: ${hostname}`);
      if (hostname.includes("hglink") || hostname.includes("hubglink")) {
        return yield extractFromGenericEmbed(embedUrl, "hglink");
      } else if (hostname.includes("luluvid")) {
        return yield extractFromGenericEmbed(embedUrl, "luluvid");
      } else if (hostname.includes("wishonly")) {
        return yield extractFromGenericEmbed(embedUrl, "wishonly");
      } else if (hostname.includes("dhcplay")) {
        return yield extractFromGenericEmbed(embedUrl, "dhcplay");
      } else if (hostname.includes("vidnest")) {
        return yield extractFromGenericEmbed(embedUrl, "vidnest");
      } else if (hostname.includes("strmup")) {
        return yield extractFromStrmup(embedUrl);
      }
      console.log(`[TamilMV] No extractor for ${hostname}, skipping`);
      return null;
    } catch (error) {
      console.error(`[TamilMV] Extraction error: ${error.message}`);
      return null;
    }
  });
}
function extractFromStrmup(embedUrl) {
  return __async(this, null, function* () {
    try {
      const url = new URL(embedUrl);
      const host = url.origin;
      const filecode = url.pathname.split("/").filter((p) => p).pop();
      if (!filecode)
        return null;
      console.log(`[TamilMV] Strmup filecode: ${filecode}`);
      const ajaxUrl = `${host}/ajax/stream?filecode=${filecode}`;
      const response = yield fetchWithTimeout(ajaxUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "X-Requested-With": "XMLHttpRequest",
          "Referer": embedUrl
        })
      }, 5e3);
      const data = yield response.json();
      if (data && data.streaming_url) {
        console.log(`[TamilMV] Found direct URL from strmup: ${data.streaming_url}`);
        return data.streaming_url;
      }
      return null;
    } catch (error) {
      console.error(`[TamilMV] Strmup extraction failed: ${error.message}`);
      return null;
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
      if (html.includes("<title>Loading...</title>") || html.includes("Page is loading")) {
        console.log(`[TamilMV] Detected landing page on ${hostName}, trying mirrors...`);
        const mirrors = ["yuguaab.com", "cavanhabg.com"];
        for (const mirror of mirrors) {
          if (hostName.includes(mirror))
            continue;
          const mirrorUrl = embedUrl.replace(hostName, mirror);
          try {
            const mirrorRes = yield fetchWithTimeout(mirrorUrl, { headers: __spreadProps(__spreadValues({}, HEADERS), { "Referer": MAIN_URL }) }, 3e3);
            const mirrorHtml = yield mirrorRes.text();
            if (mirrorHtml.includes("jwplayer") || mirrorHtml.includes("sources") || mirrorHtml.includes("eval(function(p,a,c,k,e,d)")) {
              html = mirrorHtml;
              break;
            }
          } catch (e) {
          }
        }
      }
      const packerMatch = html.match(new RegExp("eval\\(function\\(p,a,c,k,e,d\\)\\{.*?\\}\\s*\\((.*)\\)\\s*\\)", "s"));
      if (packerMatch) {
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
        if (matches) {
          for (let match of matches) {
            let videoUrl = match;
            const kvMatch = match.match(/["']:[ ]*["']([^"']+)["']/);
            if (kvMatch)
              videoUrl = kvMatch[1];
            else {
              const quoteMatch = match.match(/["']([^"']+)["']/);
              if (quoteMatch)
                videoUrl = quoteMatch[1];
            }
            const absUrlMatch = videoUrl.match(/https?:\/\/[^\s"']+/);
            if (absUrlMatch)
              videoUrl = absUrlMatch[0];
            videoUrl = videoUrl.replace(/[\\"'\)\]]+$/, "");
            if (!videoUrl || videoUrl.length < 5 || videoUrl.includes("google.com") || videoUrl.includes("youtube.com"))
              continue;
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
        console.log(`[TamilMV] Found direct URL from ${hostName}: ${bestUrl}`);
        return bestUrl;
      }
      console.log(`[TamilMV] No direct URL found in ${hostName}, skipping`);
      return null;
    } catch (error) {
      console.error(`[TamilMV] Error extracting from ${hostName}: ${error.message}`);
      return null;
    }
  });
}
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "movie" ? "movie" : "tv";
    const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    try {
      const response = yield fetchWithTimeout(url, {}, 8e3);
      if (!response.ok) {
        throw new Error(`TMDB error: ${response.status}`);
      }
      const data = yield response.json();
      if (!data.title && !data.name) {
        throw new Error("TMDB returned no title");
      }
      const info = {
        title: data.title || data.name,
        year: (data.release_date || data.first_air_date || "").split("-")[0]
      };
      console.log(`[TamilMV] TMDB Info: "${info.title}" (${info.year || "N/A"})`);
      return info;
    } catch (error) {
      console.error("[TamilMV] Error fetching TMDB metadata:", error.message);
      throw error;
    }
  });
}
function extractHomepageWatchLinks(html) {
  const $ = cheerio.load(html);
  const results = [];
  $('a:contains("[WATCH]")').each((i, el) => {
    const watchUrl = $(el).attr("href");
    if (!watchUrl)
      return;
    let titleNodes = [];
    let curr = el.previousSibling;
    if (!curr && el.parentNode) {
      curr = el.parentNode.previousSibling;
    }
    while (curr) {
      const $curr = $(curr);
      const tag = curr.tagName ? curr.tagName.toLowerCase() : null;
      if (tag === "br" || tag === "p" || tag === "hr" || tag === "div")
        break;
      if ($curr.text().includes("[WATCH]"))
        break;
      titleNodes.unshift(curr);
      curr = curr.previousSibling;
    }
    let title = $(titleNodes).text().trim();
    title = title.replace(/^[- \t\n\r|\[\], \u00A0]+/, "").replace(/[- \t\n\r|\[\], \u00A0]+$/, "").trim();
    if (title) {
      results.push({
        title,
        watchUrl
      });
    }
  });
  return results;
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    console.log(`[TamilMV] Processing ${mediaType} ${tmdbId}`);
    try {
      let mediaInfo;
      const isNumericId = /^\d+$/.test(tmdbId);
      if (isNumericId) {
        try {
          mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
        } catch (error) {
          console.log(`[TamilMV] TMDB fetch failed for ${tmdbId}, using as search query`);
          mediaInfo = { title: tmdbId, year: null };
        }
      } else {
        console.log(`[TamilMV] Using "${tmdbId}" as search query directly`);
        mediaInfo = { title: tmdbId, year: null };
      }
      console.log(`[TamilMV] Looking for ${mediaInfo.title} (${mediaInfo.year}) on homepage`);
      const homeResponse = yield fetch(MAIN_URL, { headers: HEADERS });
      const homeHtml = yield homeResponse.text();
      const watchLinks = extractHomepageWatchLinks(homeHtml);
      const bestMatch = findBestTitleMatch(mediaInfo, watchLinks);
      if (!bestMatch) {
        console.warn("[TamilMV] No matching title with [WATCH] link found on homepage");
        return [];
      }
      console.log(`[TamilMV] Found watch link for: ${bestMatch.title}`);
      console.log(`[TamilMV] Extracting direct stream from watch URL...`);
      const directUrl = yield extractDirectStream(bestMatch.watchUrl);
      if (!directUrl) {
        console.log(`[TamilMV] Could not extract direct stream, skipping`);
        return [];
      }
      return [{
        name: "TamilMV",
        title: bestMatch.title.split(" - ")[0].trim(),
        // Clean title
        url: directUrl,
        quality: bestMatch.title.includes("720p") ? "720p" : bestMatch.title.includes("1080p") ? "1080p" : "Unknown",
        headers: {
          "Referer": MAIN_URL,
          "User-Agent": HEADERS["User-Agent"]
        },
        provider: "TamilMV"
      }];
    } catch (error) {
      console.error("[TamilMV] getStreams failed:", error.message);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
