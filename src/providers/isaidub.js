/**
 * isaidub - Built from src/isaidub/
 * Generated: 2026-03-05T16:24:28.553Z
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

// src/providers/isaidub/index.js
var cheerio = require("cheerio-without-node-native");
var TMDB_API_KEY = "1b3113663c9004682ed61086cf967c44";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var MAIN_URL = "https://isaidub.love";
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
        signal: controller.signal,
        redirect: "follow"
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
function toTitleCase(str) {
  if (!str)
    return "";
  return str.toLowerCase().split(" ").map(function(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ");
}
function calculateTitleSimilarity(title1, title2) {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  if (norm1 === norm2)
    return 1;
  if (norm1.length > 5 && norm2.length > 5) {
    if (norm2.includes(norm1) || norm1.includes(norm2)) {
      return 0.9;
    }
  }
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
        score += 0.2;
      } else if (result.title.match(/\(\d{4}\)/)) {
        const yearMatch = result.title.match(/\((\d{4})\)/);
        if (yearMatch && parseInt(yearMatch[1]) !== targetYear) {
          score -= 0.1;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = result;
    }
  }
  if (bestMatch && bestScore > 0.45) {
    console.log(`[Isaidub] Best match: "${bestMatch.title}" (score: ${bestScore.toFixed(2)})`);
    return bestMatch;
  }
  return null;
}
function formatStreamTitle(mediaInfo, stream) {
  const quality = stream.quality || "Unknown";
  const title = toTitleCase(mediaInfo.title || "Unknown");
  const year = mediaInfo.year || "";
  let size = stream.size || "";
  if (!size) {
    const sizeMatch = stream.text ? stream.text.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i) : null;
    if (sizeMatch)
      size = sizeMatch[1];
  }
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
  let seInfo = "";
  const sMatch = searchString.match(/season\s*(\d+)/i);
  const eMatch = searchString.match(/epi\s*(\d+)|episode\s*(\d+)/i);
  if (sMatch)
    seInfo += ` S${sMatch[1].padStart(2, "0")}`;
  if (eMatch)
    seInfo += ` E${(eMatch[1] || eMatch[2]).padStart(2, "0")}`;
  if (!seInfo) {
    const slugParts = searchString.match(/s(\d+)e(\d+)|s(\d+)\s*e(\d+)/i);
    if (slugParts) {
      seInfo = ` S${(slugParts[1] || slugParts[3]).padStart(2, "0")} E${(slugParts[2] || slugParts[4]).padStart(2, "0")}`;
    }
  }
  const typeLine = type ? `\u{1F4F9}: ${type}
` : "";
  const sizeLine = size ? `\u{1F4BE}: ${size}
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
  return `Isaidub (Instant) (${quality})
${typeLine}\u{1F4FC}: ${title}${yearStr}${seInfo} ${quality}
${sizeLine}\u{1F310}: ${language}`;
}
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "movie" ? "movie" : "tv";
    const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    try {
      const response = yield fetchWithTimeout(url, {}, 8e3);
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
      const data = yield response.json();
      const info = {
        title: data.title || data.name,
        year: (data.release_date || data.first_air_date || "").split("-")[0]
      };
      console.log(`[Isaidub] TMDB Info: "${info.title}" (${info.year || "N/A"})`);
      return info;
    } catch (error) {
      console.error("[Isaidub] Error fetching TMDB metadata:", error.message);
      throw error;
    }
  });
}
function searchTMDBByTitle(title, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "movie" ? "movie" : "tv";
    const url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    try {
      console.log(`[Isaidub] Searching TMDB for: "${title}"`);
      const response = yield fetchWithTimeout(url, {}, 8e3);
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
      const data = yield response.json();
      if (data.results && data.results.length > 0) {
        const firstResult = data.results[0];
        const info = {
          title: firstResult.title || firstResult.name,
          year: (firstResult.release_date || firstResult.first_air_date || "").split("-")[0]
        };
        console.log(`[Isaidub] TMDB Search Result: "${info.title}" (${info.year || "N/A"})`);
        return info;
      }
      console.log(`[Isaidub] No TMDB results found for "${title}"`);
      return null;
    } catch (error) {
      console.error("[Isaidub] Error searching TMDB:", error.message);
      return null;
    }
  });
}
function search(query, year = null, mediaType) {
  return __async(this, null, function* () {
    var _a;
    if (!year) {
      const yearMatch = query.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        year = yearMatch[0];
        query = query.replace(year, "").trim();
      }
    }
    console.log(`[Isaidub] Searching for: "${query}" (year: ${year || "any"}, type: ${mediaType})`);
    try {
      const results = [];
      const baseTitle = query.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
      const slugBase = baseTitle.toLowerCase().replace(/\s+/g, "-");
      const guesses = [];
      if (mediaType === "tv") {
        const suffixes = ["-tamil-dubbed-web-series", "-web-series"];
        for (const suffix of suffixes) {
          if (year) {
            guesses.push(`${MAIN_URL}/movie/${slugBase}-${year}${suffix}/`);
            guesses.push(`${MAIN_URL}/movie/${slugBase}${suffix}/`);
          } else {
            guesses.push(`${MAIN_URL}/movie/${slugBase}${suffix}/`);
          }
        }
      } else {
        const suffixes = ["-tamil-dubbed-movie", "-hindi-dubbed-movie", "-movie"];
        for (const suffix of suffixes) {
          if (year) {
            guesses.push(`${MAIN_URL}/movie/${slugBase}-${year}${suffix}/`);
            guesses.push(`${MAIN_URL}/movie/${slugBase}-${year}/`);
          }
          guesses.push(`${MAIN_URL}/movie/${slugBase}${suffix}/`);
          guesses.push(`${MAIN_URL}/movie/${slugBase}-2024${suffix}/`);
          guesses.push(`${MAIN_URL}/movie/${slugBase}-2025${suffix}/`);
        }
      }
      console.log(`[Isaidub] Trying ${guesses.length} guessed URLs...`);
      for (const guessUrl of guesses) {
        try {
          const response = yield fetchWithTimeout(guessUrl, { headers: HEADERS }, 5e3);
          if (response.ok) {
            const pageHtml = yield response.text();
            const $ = cheerio.load(pageHtml);
            const pageTitle = $("title").text().trim();
            if (!pageTitle || pageTitle.includes("404"))
              continue;
            const titleMatch = pageTitle.match(/^(.+?)\s*\(/);
            const foundTitle = titleMatch ? titleMatch[1].replace(/\s*Tamil Dubbed Movie$/i, "").trim() : baseTitle;
            const foundYear = ((_a = pageTitle.match(/\((\d{4})\)/)) == null ? void 0 : _a[1]) || year;
            console.log(`[Isaidub] Found page: ${pageTitle}`);
            results.push({
              title: foundTitle + (foundYear ? ` (${foundYear})` : ""),
              href: guessUrl,
              foundYear,
              isGuessed: true
            });
            break;
          }
        } catch (e) {
          console.log(`[Isaidub] Failed: ${guessUrl} - ${e.message}`);
        }
      }
      if (results.length === 0) {
        console.log(`[Isaidub] No direct matches, checking latest movies page...`);
        const latestUrl = mediaType === "tv" ? `${MAIN_URL}/tamil-dubbed-web-series/` : `${MAIN_URL}/tamil-dubbed-movies-collections/`;
        try {
          const response = yield fetchWithTimeout(latestUrl, { headers: HEADERS }, 6e3);
          if (response.ok) {
            const html = yield response.text();
            const $ = cheerio.load(html);
            $('a[href*="/movie/"]').each((i, el) => {
              const href = $(el).attr("href");
              const text = $(el).text().trim();
              if (!href || href.includes("/genre/") || href.match(/\/\d+\/$/) || href.endsWith("-movies/"))
                return;
              if (text.length < 3)
                return;
              const fullUrl = href.startsWith("http") ? href : `${MAIN_URL}${href}`;
              if (!results.some((r) => r.href === fullUrl)) {
                results.push({ title: text, href: fullUrl });
              }
            });
          }
        } catch (e) {
        }
      }
      console.log(`[Isaidub] Found ${results.length} total links`);
      return results;
    } catch (error) {
      console.error("[Isaidub] Search error:", error.message);
      return [];
    }
  });
}
function extractFromGenericEmbed(embedUrl, hostName) {
  return __async(this, null, function* () {
    try {
      const embedBase = new URL(embedUrl).origin;
      const response = yield fetchWithTimeout(embedUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { "Referer": MAIN_URL })
      }, 8e3);
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("video/")) {
        console.log(`[Isaidub] Direct video response from generic embed: ${response.url}`);
        return response.url;
      }
      let html = yield response.text();
      const $ = cheerio.load(html);
      const videoSources = [];
      $("video source, video").each((i, el) => {
        const src = $(el).attr("src");
        if (src)
          videoSources.push(src);
      });
      if (videoSources.length > 0)
        return videoSources[0];
      const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
      if (m3u8Match)
        return m3u8Match[0];
      const watchOnlineLink = $('a:contains("Watch Online"), a:contains("Stream"), a:contains("Server")').attr("href");
      if (watchOnlineLink) {
        const fullWatchUrl = watchOnlineLink.startsWith("http") ? watchOnlineLink : watchOnlineLink.startsWith("//") ? "https:" + watchOnlineLink : embedBase + watchOnlineLink;
        if (fullWatchUrl !== embedUrl && !fullWatchUrl.includes("ads")) {
          return yield extractDirectStream(fullWatchUrl);
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
            if (videoUrl.startsWith("/") && !videoUrl.startsWith("//"))
              videoUrl = embedBase + videoUrl;
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
        return allFoundUrls[0];
      }
      return null;
    } catch (error) {
      return null;
    }
  });
}
function extractDirectStream(_0) {
  return __async(this, arguments, function* (embedUrl, seenUrls = /* @__PURE__ */ new Set()) {
    if (seenUrls.has(embedUrl))
      return null;
    seenUrls.add(embedUrl);
    if (seenUrls.size > 5)
      return null;
    try {
      console.log(`[Isaidub] Extracting from embed: ${embedUrl}`);
      const url = new URL(embedUrl);
      const hostname = url.hostname.toLowerCase();
      if (hostname.includes("onestream.watch") || hostname.includes("dubmv.top") || hostname.includes("dubshare.one") || hostname.includes("uptodub.ch") || hostname.includes("dubpage.xyz")) {
        return yield extractFromStreamPage(embedUrl, seenUrls);
      }
      return yield extractFromGenericEmbed(embedUrl, hostname);
    } catch (error) {
      return null;
    }
  });
}
function extractFromStreamPage(_0) {
  return __async(this, arguments, function* (embedUrl, seenUrls = /* @__PURE__ */ new Set()) {
    console.log(`[Isaidub] Extracting from stream page: ${embedUrl}`);
    try {
      const response = yield fetchWithTimeout(embedUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { "Referer": MAIN_URL })
      }, 12e3);
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("video/")) {
        console.log(`[Isaidub] Found direct video source via redirect: ${response.url}`);
        return response.url;
      }
      let html = yield response.text();
      const $ = cheerio.load(html);
      const videoSources = [];
      $("video source, video").each((i, el) => {
        const src = $(el).attr("src");
        if (src)
          videoSources.push(src);
      });
      if (videoSources.length > 0)
        return videoSources[0];
      const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
      if (m3u8Match)
        return m3u8Match[0];
      const mp4Match = html.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/i);
      if (mp4Match)
        return mp4Match[0];
      const watchLink = $('a:contains("Watch Online"), a:contains("Stream"), a:contains("Server")').attr("href");
      if (watchLink) {
        const nextUrl = watchLink.startsWith("http") ? watchLink : new URL(embedUrl).origin + watchLink;
        if (nextUrl !== embedUrl && !nextUrl.includes("ads")) {
          return yield extractDirectStream(nextUrl, seenUrls);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  });
}
function parseMoviePage(url, depth = 0, contextText = "", season = null, episode = null) {
  return __async(this, null, function* () {
    if (depth > 5)
      return [];
    console.log(`[Isaidub] Parsing page (depth ${depth}, S: ${season || "any"}, E: ${episode || "any"}): ${url}`);
    try {
      const response = yield fetchWithTimeout(url, { headers: HEADERS }, 8e3);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const pageTitle = $("title").text().trim() || "";
      const combinedContext = (contextText + " " + pageTitle).trim();
      const downloadLinks = [];
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (href && href.includes("/download/page/")) {
          if (season) {
            const otherSeasonMatch = (combinedContext + " " + text).match(/(?:season|s)\s*0*(\d+)\b/i);
            if (otherSeasonMatch && parseInt(otherSeasonMatch[1]) !== parseInt(season))
              return;
          }
          if (episode) {
            const ePattern = new RegExp(`(?:epi|episode|e)\\s*0*${episode}\\b`, "i");
            if (!ePattern.test(text) && !ePattern.test(combinedContext))
              return;
          }
          const fullUrl = href.startsWith("http") ? href : `${MAIN_URL}${href}`;
          const qualityMatch = text.match(/\b(360p|480p|720p|1080p|4K)\b/i);
          const quality = qualityMatch ? qualityMatch[0] : "HD";
          downloadLinks.push({
            url: fullUrl,
            quality,
            type: "download",
            text: (combinedContext + " " + text).trim()
          });
        }
      });
      if (downloadLinks.length > 0) {
        console.log(`[Isaidub] Found ${downloadLinks.length} download links`);
        return downloadLinks;
      }
      const subLinks = [];
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim().toLowerCase();
        if (!href || href === "/" || href === "#" || !href.includes("/movie/") && !href.match(/\/\d+\/$/))
          return;
        const keywords = ["360p", "480p", "720p", "1080p", "4K", "hd", "dvd", "scr", "rip", "bluray", "brrip", "web", "webrip", "original", "season", "episode", "epi"];
        let isMatch = false;
        for (const kw of keywords) {
          if (text.includes(kw)) {
            isMatch = true;
            break;
          }
        }
        if (!isMatch && text.match(/\d+x\d+/))
          isMatch = true;
        if (isMatch) {
          if (season) {
            const sMatch = text.match(/season\s*(\d+)/i);
            if (sMatch && parseInt(sMatch[1]) !== parseInt(season))
              return;
          }
          const fullUrl = href.startsWith("http") ? href : `${MAIN_URL}${href}`;
          subLinks.push({ url: fullUrl, text: $(el).text().trim() });
        }
      });
      if (subLinks.length > 0) {
        console.log(`[Isaidub] Found ${subLinks.length} sub-links, following...`);
        const streams = [];
        for (const subLink of subLinks) {
          const subStreams = yield parseMoviePage(subLink.url, depth + 1, (combinedContext + " " + subLink.text).trim(), season, episode);
          streams.push(...subStreams);
          if (streams.length >= 10)
            break;
        }
        return streams;
      }
      return [];
    } catch (error) {
      return [];
    }
  });
}
function extractFinalDownloadUrl(downloadPageUrl) {
  return __async(this, null, function* () {
    console.log(`[Isaidub] Extracting final URL from: ${downloadPageUrl}`);
    try {
      const response = yield fetchWithTimeout(downloadPageUrl, { headers: HEADERS }, 1e4);
      const html = yield response.text();
      const $ = cheerio.load(html);
      let size = null;
      const sizeMatch = html.match(/File Size:<\/strong>\s*([^<]+)/i);
      if (sizeMatch)
        size = sizeMatch[1].trim();
      const downloadLinks = [];
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim().toLowerCase();
        if (href && !href.includes("isaidub.love") && !href.startsWith("#")) {
          if (text.includes("download") || text.includes("server") || href.includes("dubmv.top") || href.includes("onestream.watch")) {
            const fullUrl = href.startsWith("http") ? href : `https:${href}`;
            downloadLinks.push(fullUrl);
          }
        }
      });
      if (downloadLinks.length > 0) {
        const downloadUrl = downloadLinks[0];
        const needsExtraction = downloadUrl.includes("dubmv.top/") || downloadUrl.includes("onestream.watch/") || downloadUrl.includes("uptodub.ch/") || downloadUrl.includes("dubpage.xyz/");
        return { url: downloadUrl, needsExtraction, size };
      }
      return null;
    } catch (error) {
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    if (mediaType === "movie") {
      season = null;
      episode = null;
    }
    console.log(`[Isaidub] Processing ${mediaType} ${tmdbId} (S:${season}, E:${episode})`);
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
        try {
          const tmdbResult = yield searchTMDBByTitle(tmdbId, mediaType);
          mediaInfo = tmdbResult || { title: tmdbId, year: null };
        } catch (error) {
          mediaInfo = { title: tmdbId, year: null };
        }
      }
      let searchResults = yield search(mediaInfo.title, mediaInfo.year, mediaType);
      const bestMatch = findBestTitleMatch(mediaInfo, searchResults);
      if (!bestMatch) {
        console.warn("[Isaidub] No matching title found");
        return [];
      }
      const rawStreams = yield parseMoviePage(bestMatch.href, 0, "", season, episode);
      if (rawStreams.length === 0)
        return [];
      const limitedStreams = rawStreams.slice(0, 10);
      console.log(`[Isaidub] Extracting streams from ${limitedStreams.length} links in batches...`);
      const finalStreams = [];
      for (let i = 0; i < limitedStreams.length; i += 3) {
        const batch = limitedStreams.slice(i, i + 3);
        const batchResults = yield Promise.all(batch.map((stream) => __async(this, null, function* () {
          let timeoutId;
          try {
            return yield Promise.race([
              (() => __async(this, null, function* () {
                let finalUrl = stream.url;
                let extractedSize = null;
                if (stream.type === "download") {
                  const result = yield extractFinalDownloadUrl(stream.url);
                  if (!result)
                    return null;
                  extractedSize = result.size;
                  if (result.needsExtraction) {
                    const directUrl = yield extractDirectStream(result.url);
                    if (!directUrl)
                      return null;
                    finalUrl = directUrl;
                  } else {
                    finalUrl = result.url;
                  }
                }
                return {
                  name: "Isaidub",
                  title: formatStreamTitle(mediaInfo, __spreadProps(__spreadValues({}, stream), { size: extractedSize })),
                  url: finalUrl,
                  quality: stream.quality,
                  headers: { "Referer": MAIN_URL, "User-Agent": HEADERS["User-Agent"] },
                  provider: "Isaidub"
                };
              }))(),
              new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("Timeout")), 3e4);
              })
            ]).finally(() => {
              if (timeoutId)
                clearTimeout(timeoutId);
            });
          } catch (error) {
            console.warn(`[Isaidub] Extraction failed for ${stream.url}: ${error.message}`);
            return null;
          }
        })));
        finalStreams.push(...batchResults.filter((r) => r !== null));
        if (finalStreams.length >= 5)
          break;
      }
      console.log(`[Isaidub] Found ${finalStreams.length} final streamable links`);
      return finalStreams;
    } catch (error) {
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
