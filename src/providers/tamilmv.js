/**
 * tamilmv - Built from src/tamilmv/
 * Generated: 2026-07-03T14:21:59.787Z
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
var POTENTIAL_DOMAINS = [
  "https://www.1tamilmv.durban",
  "https://www.1tamilmv.cymru",
  "https://www.1tamilmv.immo",
  "https://www.1tamilmv.pm",
  "https://www.1tamilmv.org",
  "https://www.1tamilmv.lat",
  "https://www.1tamilmv.vin",
  "https://www.1tamilmv.st"
];
var MAIN_URL = POTENTIAL_DOMAINS[0];
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Referer": `${MAIN_URL}/`
};
function getReadyDomain() {
  return __async(this, null, function* () {
    console.log("[TamilMV] Checking for a working domain...");
    for (const domain of POTENTIAL_DOMAINS) {
      try {
        const response = yield fetchWithTimeout(domain, { method: "HEAD" }, 5e3);
        if (response.ok) {
          console.log(`[TamilMV] Found working domain: ${domain}`);
          return domain;
        }
        const getResponse = yield fetchWithTimeout(domain, { method: "GET" }, 5e3);
        if (getResponse.ok) {
          console.log(`[TamilMV] Found working domain: ${domain}`);
          return domain;
        }
      } catch (e) {
      }
    }
    return POTENTIAL_DOMAINS[0];
  });
}
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
function toTitleCase(str) {
  if (!str)
    return "";
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
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
function formatStreamTitle(mediaInfo, stream) {
  const { title: movieTitle, year } = mediaInfo;
  const { quality = "Unknown", size = "Unknown", language = "Tamil", type = "Movie" } = stream;
  const displayTitle = toTitleCase(movieTitle);
  const yearStr = year ? ` (${year})` : "";
  const typeLine = type ? `\u{1F4F9}: ${type}
` : "";
  const sizeLine = size && size !== "Unknown" ? `\u{1F4BE}: ${size}
` : "";
  return `TamilMV (Instant) (${quality})
${typeLine}\u{1F4FC}: ${displayTitle}${yearStr} ${quality}
${sizeLine}\u{1F310}: ${language.toUpperCase()}`;
}
function extractDirectStream(embedUrl) {
  return __async(this, null, function* () {
    try {
      console.log(`[TamilMV] Processing URL: ${embedUrl}`);
      const url = new URL(embedUrl);
      const hostname = url.hostname.toLowerCase();
      if (hostname.includes("1tamilmv")) {
        console.log(`[TamilMV] Topic page detected, scraping for stream links...`);
        const topicRes = yield fetchWithTimeout(embedUrl, { headers: HEADERS }, 8e3);
        if (!topicRes.ok)
          return null;
        const topicHtml = yield topicRes.text();
        const $ = cheerio.load(topicHtml);
        let streamUrl = null;
        $("a[href]").each((i, el) => {
          const href = $(el).attr("href");
          if (!href || streamUrl)
            return;
          const h = href.toLowerCase();
          if (h.includes("vidnest") || h.includes("hglink") || h.includes("hubglink") || h.includes("luluvid") || h.includes("luluvdo") || h.includes("wishonly") || h.includes("dhcplay") || h.includes("strmup") || h.includes("gdriveplayer") || h.includes("streamcash") || h.includes("streamdady")) {
            streamUrl = href;
          }
        });
        if (!streamUrl)
          return null;
        console.log(`[TamilMV] Found stream link: ${streamUrl}`);
        return yield extractDirectStream(streamUrl);
      }
      console.log(`[TamilMV] Attempting to extract from: ${hostname}`);
      return yield extractFromGenericEmbed(embedUrl, hostname);
    } catch (error) {
      console.error(`[TamilMV] Extraction error: ${error.message}`);
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
function searchTamilMV(query, year = null) {
  return __async(this, null, function* () {
    const results = [];
    let domainsToTry = [MAIN_URL, ...POTENTIAL_DOMAINS.filter((d) => d !== MAIN_URL)];
    for (const domain of domainsToTry) {
      try {
        console.log(`[TamilMV] Trying domain: ${domain}`);
        const homeResponse = yield fetchWithTimeout(domain, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: `${domain}/` }) }, 8e3);
        if (homeResponse.ok) {
          const homeHtml = yield homeResponse.text();
          const watchLinks = extractHomepageWatchLinks(homeHtml);
          if (watchLinks.length > 0) {
            const matchingLinks = watchLinks.filter((link) => {
              const score = calculateTitleSimilarity(query, link.title);
              return score > 0.2 || link.title.toLowerCase().includes(query.toLowerCase());
            });
            if (matchingLinks.length > 0) {
              console.log(`[TamilMV] Found ${matchingLinks.length} matching links on homepage`);
              for (const wl of matchingLinks) {
                results.push({
                  title: wl.title,
                  url: wl.watchUrl.startsWith("http") ? wl.watchUrl : domain + (wl.watchUrl.startsWith("/") ? "" : "/") + wl.watchUrl
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
                  url: wl.watchUrl.startsWith("http") ? wl.watchUrl : domain + (wl.watchUrl.startsWith("/") ? "" : "/") + wl.watchUrl
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
  });
}
function extractHomepageWatchLinks(html) {
  const $ = cheerio.load(html);
  const results = [];
  $("a").each((i, el) => {
    const text = $(el).text().trim();
    if (text !== "[W]" && text !== "[WATCH]")
      return;
    const watchUrl = $(el).attr("href");
    if (!watchUrl)
      return;
    let titleNode = null;
    let parent = el.parentNode;
    let prev = parent.previousSibling;
    while (prev && !titleNode) {
      if (prev.tagName && prev.tagName.toLowerCase() === "strong") {
        const strongText = $(prev).text().trim();
        if (strongText && strongText.length > 10 && !strongText.includes("Login") && !strongText.includes("Register")) {
          titleNode = prev;
        }
      }
      prev = prev.previousSibling;
    }
    if (!titleNode) {
      let p = parent;
      while (p && !titleNode) {
        let s = p.previousSibling;
        while (s && !titleNode) {
          if (s.tagName && s.tagName.toLowerCase() === "strong") {
            const strongText = $(s).text().trim();
            if (strongText && strongText.length > 10 && !strongText.includes("Login") && !strongText.includes("Register")) {
              titleNode = s;
            }
          }
          s = s.previousSibling;
        }
        p = p.parentNode;
      }
    }
    let title = titleNode ? $(titleNode).text().trim() : "";
    title = title.replace(/\s*-\s*\[.*?\]\s*$/, "").trim();
    title = title.replace(/<a[^>]*>.*?<\/a>/gi, "").trim();
    title = title.replace(/\s*-\s*$/, "").trim();
    if (title) {
      results.push({ title, watchUrl });
    }
  });
  $('a[href*="streamcash.to/embed/"], a[href*="luluvid.com/e/"], a[href*="luluvdo.com/e/"]').each((i, el) => {
    const href = $(el).attr("href");
    if (!href || results.some((r) => r.watchUrl === href))
      return;
    const parentStrong = $(el).closest("strong");
    const prevStrong = parentStrong.length ? parentStrong.prevAll("strong").first() : null;
    let title = "";
    if (prevStrong.length) {
      title = prevStrong.text().trim();
    } else {
      title = $(el).closest("div, p").text().trim();
    }
    title = title.replace(/\s*-\s*\[.*?\]\s*$/, "").trim();
    title = title.replace(/<a[^>]*>.*?<\/a>/gi, "").trim();
    if (title && title.length > 5) {
      results.push({ title, watchUrl: href });
    }
  });
  $('a[href*="/forums/topic/"]').each((i, el) => {
    const href = $(el).attr("href");
    if (!href)
      return;
    if (results.some((r) => r.watchUrl === href))
      return;
    const parentText = $(el).parent().text().trim();
    const linkText = $(el).text().trim();
    let title = parentText || linkText;
    if (linkText.match(/^\[.*\]$/) || linkText.match(/^\d+p/)) {
      title = parentText.replace(linkText, "").replace(/\s*-\s*$/, "").trim();
    }
    if (title && title.length > 5 && !title.includes("login") && !title.includes("register")) {
      results.push({ title, watchUrl: href });
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
          mediaInfo = { title: tmdbId, year: null };
        }
      } else {
        mediaInfo = { title: tmdbId, year: null };
        const yearMatch = tmdbId.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          mediaInfo.year = yearMatch[0];
          mediaInfo.title = tmdbId.replace(yearMatch[0], "").trim();
        }
      }
      try {
        const workingDomain = yield getReadyDomain();
        if (workingDomain !== MAIN_URL) {
          console.log(`[TamilMV] Switching MAIN_URL: ${MAIN_URL} -> ${workingDomain}`);
          MAIN_URL = workingDomain;
          HEADERS.Referer = `${MAIN_URL}/`;
        }
      } catch (e) {
        console.log(`[TamilMV] Domain discovery failed: ${e.message}`);
      }
      console.log(`[TamilMV] Searching for: ${mediaInfo.title} (${mediaInfo.year})`);
      const searchResults = yield searchTamilMV(mediaInfo.title, mediaInfo.year);
      if (!searchResults || searchResults.length === 0) {
        console.warn("[TamilMV] No search results found");
        return [];
      }
      const matches = searchResults.filter((r) => calculateTitleSimilarity(mediaInfo.title, r.title) > 0.35);
      if (matches.length === 0) {
        console.warn("[Tamilmv] No matching titles found");
        const directMatches = searchResults.filter((r) => r.title.toLowerCase().includes(mediaInfo.title.toLowerCase()));
        if (directMatches.length > 0)
          matches.push(...directMatches);
        else
          return [];
      }
      const finalStreams = [];
      const topMatches = matches.slice(0, 5);
      for (const match of topMatches) {
        console.log(`[Tamilmv] Processing match: ${match.title}`);
        const watchUrl = match.url;
        if (!watchUrl)
          continue;
        try {
          const directUrl = yield extractDirectStream(watchUrl);
          if (directUrl) {
            const quality = match.title.includes("2160p") || match.title.includes("4K") ? "4K" : match.title.includes("1080p") ? "1080p" : match.title.includes("720p") ? "720p" : match.title.includes("480p") ? "480p" : "HD";
            let size = "Unknown";
            const sizeMatch = match.title.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
            if (sizeMatch)
              size = sizeMatch[1];
            const streamObj = {
              quality,
              size,
              language: match.title.toLowerCase().includes("tam") ? "Tamil" : "Multi",
              type: mediaType === "movie" ? "Movie" : "TV Show"
            };
            finalStreams.push({
              name: "Tamilmv",
              title: formatStreamTitle(mediaInfo, streamObj),
              url: directUrl,
              quality,
              headers: {
                "Referer": MAIN_URL,
                "User-Agent": HEADERS["User-Agent"]
              },
              provider: "Tamilmv"
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
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
