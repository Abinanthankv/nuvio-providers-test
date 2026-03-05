/**
 * tamilblasters - Built from src/tamilblasters/
 * Generated: 2026-03-05T14:23:58.940Z
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

// src/providers/tamilblasters/index.js
var cheerio = require("cheerio-without-node-native");
var TMDB_API_KEY = "1b3113663c9004682ed61086cf967c44";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var MAIN_URL = "https://www.1tamilblasters.business";
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
function checkLink(_0) {
  return __async(this, arguments, function* (url, headers = {}) {
    try {
      const response = yield fetchWithTimeout(url, {
        method: "GET",
        headers: __spreadProps(__spreadValues({}, headers), {
          "Range": "bytes=0-0"
        })
      }, 5e3);
      return response.ok || response.status === 206;
    } catch (error) {
      return false;
    }
  });
}
function toTitleCase(str) {
  if (!str)
    return "";
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
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
function findAllTitleMatches(mediaInfo, searchResults) {
  if (!searchResults || searchResults.length === 0)
    return [];
  const targetTitle = mediaInfo.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetYear = mediaInfo.year ? parseInt(mediaInfo.year) : null;
  const matches = [];
  for (const result of searchResults) {
    const normalizedResultTitle = result.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    let score = calculateTitleSimilarity(mediaInfo.title, result.title);
    const titleMatch = normalizedResultTitle.includes(targetTitle);
    const yearMatch = !targetYear || result.title.includes(targetYear.toString()) || result.title.includes((targetYear + 1).toString()) || result.title.includes((targetYear - 1).toString());
    if (titleMatch && yearMatch) {
      score += 0.5;
    }
    if (score > 0.4) {
      console.log(`[Tamilblasters] Match found: "${result.title}" (score: ${score.toFixed(2)})`);
      matches.push(result);
    }
  }
  return matches;
}
function formatStreamTitle(mediaInfo, stream) {
  const { title, year } = mediaInfo;
  const { quality, type, size, language, seasonCode, episodeCode, label, baseTitle } = stream;
  const displayTitle = title.toLowerCase() === baseTitle.toLowerCase() || title === title.toLowerCase() ? baseTitle : title;
  const displayYear = year || stream.year;
  const yearStr = displayYear ? ` (${displayYear})` : "";
  const isTV = !!(seasonCode || episodeCode);
  let tapeLine = `\u{1F4FC}: ${displayTitle}${yearStr}`;
  if (isTV) {
    tapeLine += ` - ${seasonCode || "S01"} ${episodeCode || ""}`;
  } else if (label && !label.includes("Stream")) {
    tapeLine += ` (${label})`;
  }
  tapeLine += ` - ${quality !== "Unknown" ? quality : ""}`;
  const typeLine = type && type !== "UNKNOWN" ? `\u{1F4FA}: ${type}
` : "";
  const sizeLine = size && size !== "UNKNOWN" ? `\u{1F4BE}: ${size} | \u{1F69C}: tamilblasters
` : "";
  let lang = language || "TAMIL";
  if (stream.audioInfo)
    lang = stream.audioInfo;
  return `Tamilblasters (Instant) (${quality})
${typeLine}${tapeLine}
${sizeLine}\u{1F310}: ${lang.toUpperCase()}`;
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
      console.log(`[Tamilblasters] TMDB Info: "${info.title}" (${info.year || "N/A"})`);
      return info;
    } catch (error) {
      console.error("[Tamilblasters] Error fetching TMDB metadata:", error.message);
      throw error;
    }
  });
}
function search(query) {
  return __async(this, null, function* () {
    const url = `${MAIN_URL}/?s=${encodeURIComponent(query)}`;
    console.log(`[Tamilblasters] Searching: ${url}`);
    try {
      const response = yield fetchWithTimeout(url, { headers: HEADERS }, 8e3);
      if (response.url && !response.url.includes(new URL(MAIN_URL).hostname)) {
        try {
          const finalUrl = new URL(response.url);
          if (finalUrl.protocol.startsWith("http")) {
            console.log(`[Tamilblasters] Domain redirect detected: ${MAIN_URL} -> ${finalUrl.origin}`);
            MAIN_URL = finalUrl.origin;
            HEADERS.Referer = `${MAIN_URL}/`;
          }
        } catch (e) {
        }
      }
      const html = yield response.text();
      const $ = cheerio.load(html);
      const results = [];
      $(".posts-wrapper article, .nv-index-posts article").each((i, el) => {
        const titleEl = $(el).find("h2.entry-title a");
        const title = titleEl.text().trim();
        const href = titleEl.attr("href");
        if (title && href) {
          results.push({ title, href });
        }
      });
      return results;
    } catch (error) {
      console.error("[Tamilblasters] Search error:", error.message);
      return [];
    }
  });
}
function detectQualityFromM3U8(m3u8Url) {
  return __async(this, null, function* () {
    try {
      const response = yield fetchWithTimeout(m3u8Url, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Referer": MAIN_URL
        })
      }, 5e3);
      const content = yield response.text();
      if (!content.includes("#EXTM3U")) {
        return { variants: [{ url: m3u8Url, quality: "Unknown" }], audios: [], isMaster: false, masterUrl: m3u8Url };
      }
      const variants = [];
      const audios = [];
      let isMaster = false;
      const audioMatches = content.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO.*?NAME="([^"]+)"(?:.*?CHANNELS="([^"]+)")?/g);
      for (const match of audioMatches) {
        let audioName = match[1];
        const channels = match[2];
        if (channels) {
          const channelMap = { "1": "1.0", "2": "2.0", "6": "5.1", "8": "7.1" };
          audioName += ` (${channelMap[channels] || channels})`;
        }
        if (!audios.includes(audioName))
          audios.push(audioName);
      }
      if (content.includes("#EXT-X-STREAM-INF")) {
        isMaster = true;
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes("#EXT-X-STREAM-INF")) {
            let quality2 = "Unknown";
            const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
            if (resMatch) {
              const height = parseInt(resMatch[2]);
              if (height >= 2160)
                quality2 = "4K";
              else if (height >= 1080)
                quality2 = "1080p";
              else if (height >= 720)
                quality2 = "720p";
              else if (height >= 480)
                quality2 = "480p";
              else
                quality2 = `${height}p`;
            }
            let j = i + 1;
            while (j < lines.length && (lines[j].trim().startsWith("#") || !lines[j].trim()))
              j++;
            if (j < lines.length) {
              let variantUrl = lines[j].trim();
              if (variantUrl && !variantUrl.startsWith("#")) {
                if (!variantUrl.startsWith("http")) {
                  const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1);
                  variantUrl = baseUrl + variantUrl;
                }
                variants.push({ url: variantUrl, quality: quality2 });
              }
            }
            i = j;
          }
        }
      }
      if (variants.length > 0) {
        const qualityWeights = { "4K": 2160, "1080p": 1080, "720p": 720, "480p": 480, "Unknown": 0 };
        variants.sort((a, b) => (qualityWeights[b.quality] || 0) - (qualityWeights[a.quality] || 0));
        return { variants, audios, isMaster, masterUrl: m3u8Url };
      }
      const qualityMatch = content.match(/\b(2160p|1080p|720p|480p|4K|UHD|HD)\b/i);
      const quality = qualityMatch ? qualityMatch[0] : "Unknown";
      return { variants: [{ url: m3u8Url, quality }], audios, isMaster: false, masterUrl: m3u8Url };
    } catch (error) {
      console.error(`[Tamilblasters] Error detecting quality: ${error.message}`);
      return { variants: [{ url: m3u8Url, quality: "Unknown" }], audios: [], isMaster: false, masterUrl: m3u8Url };
    }
  });
}
function extractDirectStream(embedUrl) {
  return __async(this, null, function* () {
    try {
      console.log(`[Tamilblasters] Embed URL: ${embedUrl}`);
      const url = new URL(embedUrl);
      const hostname = url.hostname.toLowerCase();
      console.log(`[Tamilblasters] Attempting universal extraction from: ${hostname}`);
      return yield extractFromGenericEmbed(embedUrl, hostname);
    } catch (error) {
      console.error(`[Tamilblasters] Extraction error: ${error.message}`);
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
      if (html.includes("<title>Loading...</title>") || html.includes("Page is loading")) {
        console.log(`[Tamilblasters] Detected landing page on ${hostName}, trying mirrors...`);
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
        /["'](\/[^\s"']+\.m3u8[^\s"']*)["']/gi
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
          const hasParamA = a.includes("?");
          const hasParamB = b.includes("?");
          if (hasParamA !== hasParamB)
            return hasParamB ? 1 : -1;
          const isM3U8A = a.toLowerCase().includes(".m3u8");
          const isM3U8B = b.toLowerCase().includes(".m3u8");
          if (isM3U8A !== isM3U8B)
            return isM3U8B ? 1 : -1;
          return a.length - b.length;
        });
        const bestUrl = allFoundUrls[0];
        console.log(`[Tamilblasters] Detected best URL: ${bestUrl}. Resolving quality...`);
        return yield detectQualityFromM3U8(bestUrl);
      }
      return [];
    } catch (error) {
      console.error(`[Tamilblasters] Error extracting from ${hostName}: ${error.message}`);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    console.log(`[Tamilblasters] Processing ${mediaType} ${tmdbId}`);
    try {
      let mediaInfo;
      const isNumericId = /^\d+$/.test(tmdbId);
      if (isNumericId) {
        try {
          mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
        } catch (error) {
          console.log(`[Tamilblasters] TMDB fetch failed, using "${tmdbId}" as search query`);
          mediaInfo = {
            title: tmdbId,
            year: null
          };
        }
      } else {
        console.log(`[Tamilblasters] Using "${tmdbId}" as search query indirectly`);
        mediaInfo = {
          title: toTitleCase(tmdbId),
          year: null
        };
      }
      const searchResults = yield search(mediaInfo.title);
      const allMatches = findAllTitleMatches(mediaInfo, searchResults);
      if (allMatches.length === 0) {
        console.warn("[Tamilblasters] No matching titles found in search results");
        return [];
      }
      const uniqueMatches = [];
      const seenUrls = /* @__PURE__ */ new Set();
      for (const match of allMatches) {
        if (!seenUrls.has(match.href)) {
          seenUrls.add(match.href);
          uniqueMatches.push(match);
        }
      }
      const topMatches = uniqueMatches.slice(0, 3);
      console.log(`[Tamilblasters] Processing top ${topMatches.length} unique matches out of ${allMatches.length} total`);
      const allValidStreams = [];
      const targetResults = 5;
      const matchConcurrencyLimit = 2;
      const matchActiveTasks = /* @__PURE__ */ new Set();
      let isTerminated = false;
      const processMatch = (match) => __async(this, null, function* () {
        var _a;
        if (allValidStreams.length >= targetResults || isTerminated)
          return;
        console.log(`[Tamilblasters] Processing match: ${match.title} -> ${match.href}`);
        try {
          const pageResponse = yield fetchWithTimeout(match.href, { headers: HEADERS }, 8e3);
          const pageHtml = yield pageResponse.text();
          const $ = cheerio.load(pageHtml);
          const fullPageTitle = $("h1.entry-title").text().trim() || match.title;
          console.log(`[Tamilblasters] Full Page Title: ${fullPageTitle}`);
          const rawStreams = [];
          const matchTitle = match.title;
          const yearMatch = matchTitle.match(/[\(\[](\d{4})[\)\]]/);
          let movieName = matchTitle;
          let yearStr = "";
          let baseLanguage = "Original";
          if (yearMatch) {
            yearStr = yearMatch[1];
            movieName = matchTitle.split(yearMatch[0])[0].trim();
            baseLanguage = ((_a = matchTitle.split(yearMatch[0])[1]) == null ? void 0 : _a.trim()) || "Original";
          }
          $("iframe").each((i, el) => {
            let streamurl = $(el).attr("src");
            if (!streamurl || streamurl.includes("google.com") || streamurl.includes("youtube.com"))
              return;
            let episodeLabel = "";
            let current = $(el);
            for (let j = 0; j < 5; j++) {
              let prev = current.prev();
              if (prev.length === 0) {
                current = current.parent();
                if (current.is("body") || current.length === 0)
                  break;
                continue;
              }
              const text = prev.text().trim();
              if (text.toLowerCase().includes("episode")) {
                episodeLabel = text.replace(/[\r\n]+/g, " ").trim();
                break;
              }
              current = prev;
            }
            let displayLabel = episodeLabel || $(el).closest("div").prev("p").text().trim() || "Stream " + (i + 1);
            if (displayLabel.toLowerCase().includes("episode")) {
              const epMatch = displayLabel.match(/Episode\s*[–-ー]\s*(\d+)/i) || displayLabel.match(/Episode\s*(\d+)/i);
              if (epMatch) {
                displayLabel = `EP${epMatch[1]}`;
              }
            }
            const isTVShow = mediaType === "tv" || matchTitle.match(/S\d+.*EP/i) || matchTitle.match(/Season.*Episode/i) || displayLabel.match(/EP\s*\d+/i) || displayLabel.match(/Episode\s*\d+/i);
            let seasonCode = "";
            let episodeCode = "";
            let langStr = baseLanguage;
            if (isTVShow) {
              const sMatch = matchTitle.match(/S(\d+)/i);
              seasonCode = sMatch ? `S${sMatch[1].padStart(2, "0")}` : "S01";
              let episodeNum = null;
              const epLabelMatch = displayLabel.match(/EP\s*(\d+)/i) || displayLabel.match(/Episode\s*(\d+)/i);
              if (epLabelMatch) {
                episodeNum = epLabelMatch[1];
              } else {
                const epTitleMatch = matchTitle.match(/EP\s*(\d+)/i);
                if (epTitleMatch)
                  episodeNum = epTitleMatch[1];
              }
              episodeCode = episodeNum ? `E${episodeNum.padStart(2, "0")}` : displayLabel;
              langStr = langStr.replace(/S\d+/gi, "").replace(/EP\s*\(.*?\)/gi, "").replace(/EP\d+/gi, "").replace(/\s+/g, " ").trim();
              langStr = langStr.replace(/^[-\s,[\]]+|[-\s,[\]]+$/g, "").trim();
            }
            let type = "UNKNOWN";
            const searchMeta = (fullPageTitle + " " + displayLabel).toLowerCase();
            if (searchMeta.includes("bluray") || searchMeta.includes("brrip"))
              type = "BluRay";
            else if (searchMeta.includes("web-dl") || searchMeta.includes("webdl"))
              type = "WEB-DL";
            else if (searchMeta.includes("webrip"))
              type = "WEBRip";
            else if (searchMeta.includes("hdrip"))
              type = "HDRip";
            else if (searchMeta.includes("dvdrip"))
              type = "DVDRip";
            rawStreams.push({
              baseTitle: movieName,
              year: yearStr,
              language: langStr,
              seasonCode,
              episodeCode,
              type,
              url: streamurl,
              label: displayLabel,
              matchTitle: match.title
            });
          });
          const limitedStreams = rawStreams.slice(0, 5);
          if (rawStreams.length > 5) {
            console.log(`[Tamilblasters] Limiting to first 5 iframes out of ${rawStreams.length} for performance`);
          }
          console.log(`[Tamilblasters] Extracting direct streams from ${limitedStreams.length} embed URLs for "${match.title}"...`);
          const directStreams = [];
          const seenUrls2 = /* @__PURE__ */ new Set();
          const concurrencyLimit = 5;
          const activeTasks = /* @__PURE__ */ new Set();
          const itemProcessEmbed = (stream) => __async(this, null, function* () {
            if (allValidStreams.length >= targetResults || isTerminated)
              return;
            try {
              const result = yield Promise.race([
                extractDirectStream(stream.url),
                new Promise(
                  (_, reject) => setTimeout(() => reject(new Error("Extraction timeout after 5 seconds")), 5e3)
                )
              ]);
              if (result && result.variants && result.variants.length > 0) {
                const audioInfo = result.audios.length > 0 ? result.audios.join(", ") : "";
                if (result.isMaster && result.audios.length > 1) {
                  const bestQuality = result.variants[0].quality;
                  const streamData = __spreadProps(__spreadValues({}, stream), {
                    url: result.masterUrl,
                    quality: bestQuality,
                    audioInfo,
                    isMaster: true
                  });
                  const isWorking = yield checkLink(streamData.url, { "Referer": MAIN_URL, "User-Agent": HEADERS["User-Agent"] });
                  if (isWorking && !seenUrls2.has(streamData.url)) {
                    seenUrls2.add(streamData.url);
                    directStreams.push(streamData);
                  }
                } else {
                  for (const variant of result.variants) {
                    const streamData = __spreadProps(__spreadValues({}, stream), {
                      url: variant.url,
                      quality: variant.quality,
                      audioInfo,
                      isMaster: false
                    });
                    const isWorking = yield checkLink(streamData.url, { "Referer": MAIN_URL, "User-Agent": HEADERS["User-Agent"] });
                    if (isWorking && !seenUrls2.has(streamData.url)) {
                      seenUrls2.add(streamData.url);
                      directStreams.push(streamData);
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`[Tamilblasters] Failed to extract stream: ${error.message}`);
            }
          });
          for (const stream of limitedStreams) {
            if (allValidStreams.length >= targetResults || isTerminated)
              break;
            const task = itemProcessEmbed(stream).then(() => activeTasks.delete(task));
            activeTasks.add(task);
            if (activeTasks.size >= concurrencyLimit) {
              yield Promise.race(activeTasks);
            }
          }
          yield Promise.all(activeTasks);
          let validStreams = directStreams;
          const shouldFilter = season !== null || episode !== null;
          if (shouldFilter) {
            const reqEpUpper = episode !== null ? `EP${episode.toString().padStart(2, "0")}` : null;
            const reqEpLower = episode !== null ? `e${episode.toString().padStart(2, "0")}` : null;
            const reqEpSpaced = episode !== null ? `e ${episode.toString().padStart(2, "0")}` : null;
            const reqSeason = season !== null ? `S${season.toString().padStart(2, "0")}` : null;
            const reqSeasonLower = season !== null ? `s${season.toString().padStart(2, "0")}` : null;
            const matchHasCorrectSeason = !reqSeason || match.title.toUpperCase().includes(reqSeason) || match.title.toLowerCase().includes(reqSeasonLower);
            if (matchHasCorrectSeason) {
              const filtered = validStreams.filter((s) => {
                if (!reqEpUpper)
                  return true;
                const streamEpInfo = `${s.label} ${s.episodeCode}`.toUpperCase();
                const hasStreamEp = streamEpInfo.includes("EP") || streamEpInfo.includes("E") || /\d+/.test(s.episodeCode);
                if (hasStreamEp) {
                  const searchStr = streamEpInfo;
                  const searchStrLower = searchStr.toLowerCase();
                  return searchStr.includes(reqEpUpper) || searchStrLower.includes(reqEpLower) || searchStrLower.includes(reqEpSpaced) || searchStr.includes(`EPISODE ${episode}`);
                } else {
                  const searchStr = `${s.matchTitle}`.toUpperCase();
                  const searchStrLower = searchStr.toLowerCase();
                  return searchStr.includes(reqEpUpper) || searchStrLower.includes(reqEpLower) || searchStrLower.includes(reqEpSpaced) || searchStr.includes(`EPISODE ${episode}`);
                }
              });
              validStreams = filtered;
              if (filtered.length > 0) {
                console.log(`[Tamilblasters] Filtered to ${validStreams.length} streams for episode ${episode}`);
              } else {
                console.log(`[Tamilblasters] No streams found matching epsiode ${episode}`);
              }
            } else {
              validStreams = [];
            }
          }
          if (validStreams.length > 0) {
            allValidStreams.push(...validStreams);
          }
          if (allValidStreams.length >= targetResults) {
            isTerminated = true;
          }
        } catch (innerError) {
          console.error(`[Tamilblasters] Failed to process match ${match.title}:`, innerError.message);
        }
      });
      for (const match of topMatches) {
        if (allValidStreams.length >= targetResults || isTerminated)
          break;
        const task = processMatch(match).then(() => matchActiveTasks.delete(task));
        matchActiveTasks.add(task);
        if (matchActiveTasks.size >= matchConcurrencyLimit) {
          yield Promise.race(matchActiveTasks);
        }
      }
      yield Promise.all(matchActiveTasks);
      console.log(`[Tamilblasters] Final validation of ${allValidStreams.length} candidate streams...`);
      const finalStreams = [];
      const validationTasks = /* @__PURE__ */ new Set();
      const validationConcurrency = 5;
      const validateAndFormat = (s) => __async(this, null, function* () {
        try {
          const isWorking = yield checkLink(s.url, { "Referer": MAIN_URL, "User-Agent": HEADERS["User-Agent"] });
          if (isWorking) {
            const quality = s.quality || "Unknown";
            let size = "UNKNOWN";
            if (s.matchTitle && quality !== "Unknown") {
              const qualityPattern = new RegExp(`${quality}\\s*[\\[\\(]([^\\]\\)]+)[\\]\\)]`, "i");
              const sizeMatch = s.matchTitle.match(qualityPattern);
              if (sizeMatch)
                size = sizeMatch[1].toUpperCase();
            }
            const streamObj = __spreadProps(__spreadValues({}, s), {
              quality,
              size
            });
            finalStreams.push({
              name: "Tamilblasters",
              title: formatStreamTitle(mediaInfo, streamObj),
              url: s.url,
              quality: streamObj.quality,
              headers: {
                "Referer": MAIN_URL,
                "User-Agent": HEADERS["User-Agent"]
              },
              provider: "Tamilblasters"
            });
          }
        } catch (err) {
          console.error(`[Tamilblasters] Validation failed for ${s.url}:`, err.message);
        }
      });
      for (const stream of allValidStreams) {
        const task = validateAndFormat(stream).then(() => validationTasks.delete(task));
        validationTasks.add(task);
        if (validationTasks.size >= validationConcurrency) {
          yield Promise.race(validationTasks);
        }
      }
      yield Promise.all(validationTasks);
      console.log(`[Tamilblasters] Returning ${finalStreams.length} valid streams out of ${allValidStreams.length} candidates`);
      return finalStreams;
    } catch (error) {
      console.error("[Tamilblasters] getStreams failed:", error.message);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
