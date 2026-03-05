/**
 * toonhub - Built from src/toonhub/
 * Generated: 2026-03-05T14:23:58.948Z
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

// src/providers/toonhub/index.js
var cheerio = require("cheerio-without-node-native");
var TMDB_API_KEY = "1b3113663c9004682ed61086cf967c44";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var MAIN_URL = "https://toonhub4u.co";
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
function normalizeTitle(title) {
  if (!title)
    return "";
  return title.toLowerCase().replace(/[-:]/g, " ").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}
function toTitleCase(str) {
  if (!str)
    return "";
  return str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function calculateTitleSimilarity(title1, title2) {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  if (norm1 === norm2)
    return 1;
  if (norm1.length > 5 && norm2.length > 5 && (norm2.includes(norm1) || norm1.includes(norm2)))
    return 0.9;
  const words1 = new Set(norm1.split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(norm2.split(/\s+/).filter((w) => w.length > 2));
  if (words1.size === 0 || words2.size === 0)
    return 0;
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = /* @__PURE__ */ new Set([...words1, ...words2]);
  return intersection.size / union.size;
}
function extractSeasonEpisodeFromFilename(filename) {
  if (!filename)
    return null;
  const match = filename.match(/S(\d+)E(\d+)/i);
  if (match) {
    return {
      season: parseInt(match[1]),
      episode: parseInt(match[2])
    };
  }
  return null;
}
function extractAudioInfoFromFilename(filename) {
  if (!filename)
    return null;
  const audioInfo = {
    languages: [],
    hasSubtitles: false,
    audioType: null
  };
  if (/ESub|Subtitle|Sub/i.test(filename)) {
    audioInfo.hasSubtitles = true;
  }
  if (/Multi\s*Audio/i.test(filename)) {
    audioInfo.audioType = "Multi Audio";
    audioInfo.languages = ["Hindi", "English", "Japanese"];
  } else if (/Dual\s*Audio/i.test(filename)) {
    audioInfo.audioType = "Dual Audio";
    const langMatches = filename.match(/\b(Hindi|Tamil|Telugu|English|Eng|Japanese|Korean|Chinese)\b/gi);
    if (langMatches) {
      audioInfo.languages = [...new Set(langMatches.map((l) => {
        if (l.toLowerCase() === "eng")
          return "English";
        return l.charAt(0).toUpperCase() + l.slice(1).toLowerCase();
      }))];
    }
  } else {
    const langMatches = filename.match(/\b(Hindi|Tamil|Telugu|English|Eng|Japanese|Korean|Chinese)\b/gi);
    if (langMatches) {
      audioInfo.languages = [...new Set(langMatches.map((l) => {
        if (l.toLowerCase() === "eng")
          return "English";
        return l.charAt(0).toUpperCase() + l.slice(1).toLowerCase();
      }))];
    }
  }
  return audioInfo;
}
function formatStreamTitle(mediaInfo, stream, seasonEpInfo, audioInfo, extraInfo = "") {
  const quality = stream.quality || "Unknown";
  const title = toTitleCase(mediaInfo.title || "Unknown");
  const year = mediaInfo.year ? ` (${mediaInfo.year})` : "";
  let episodeLabel = "";
  if (seasonEpInfo && seasonEpInfo.season && seasonEpInfo.episode) {
    episodeLabel = ` - S${String(seasonEpInfo.season).padStart(2, "0")}E${String(seasonEpInfo.episode).padStart(2, "0")}`;
  } else if (stream.label) {
    episodeLabel = ` - ${stream.label}`;
  }
  let audioLabel = "\u{1F310}: HINDI/ENGLISH";
  if (audioInfo && audioInfo.languages.length > 0) {
    const langs = audioInfo.languages.join("/");
    const subInfo = audioInfo.hasSubtitles ? " + ESub" : "";
    audioLabel = `\u{1F3A7}: ${langs}${subInfo}`;
  }
  const formatInfo = extraInfo ? ` | ${extraInfo}` : "";
  return `ToonHub (${quality})
\u{1F4F9}: ${title}${year}${episodeLabel}
${audioLabel}${formatInfo}`;
}
function parseFormatFromFilename(filename) {
  if (!filename)
    return "";
  const info = [];
  if (/x265|hevc|h265|10?bit/i.test(filename))
    info.push("H.265");
  else if (/x264|h264/i.test(filename))
    info.push("H.264");
  if (/aac/i.test(filename))
    info.push("AAC");
  const extMatch = filename.match(/\.(mkv|mp4|m3u8|avi|webm)(?:\?|$)/i);
  if (extMatch)
    info.push(extMatch[1].toUpperCase());
  return info.join("/");
}
function parseCodecs(codecString) {
  if (!codecString)
    return "";
  const codecs = codecString.split(",").map((c) => c.trim().toLowerCase());
  const info = [];
  for (const codec of codecs) {
    if (codec.startsWith("avc"))
      info.push("H.264");
    else if (codec.startsWith("hev") || codec.startsWith("hvc"))
      info.push("H.265");
    else if (codec.startsWith("mp4a"))
      info.push("AAC");
  }
  return info.join("/");
}
function getHlsFormatInfo(url) {
  return __async(this, null, function* () {
    try {
      const response = yield fetchWithTimeout(url, { headers: HEADERS }, 5e3);
      if (!response.ok)
        return "";
      const content = yield response.text();
      const codecMatch = content.match(/CODECS="([^"]+)"/i);
      if (codecMatch)
        return parseCodecs(codecMatch[1]);
      return "M3U8";
    } catch (e) {
      return "M3U8";
    }
  });
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
      return {
        title: data.title || data.name,
        year: (data.release_date || data.first_air_date || "").split("-")[0]
      };
    } catch (e) {
      console.warn("[ToonHub] TMDB details fetch failed:", e.message);
      throw e;
    }
  });
}
function searchTMDBByTitle(title, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "movie" ? "movie" : "tv";
    const url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    try {
      const response = yield fetchWithTimeout(url, {}, 8e3);
      if (!response.ok)
        return null;
      const data = yield response.json();
      if (data.results && data.results.length > 0) {
        const spinoffKeywords = ["vigilantes", "vigilante", "gaiden", "ova", "special", "recap"];
        const mainSeries = data.results.find((result) => {
          const resultTitle = (result.title || result.name || "").toLowerCase();
          return !spinoffKeywords.some((keyword) => resultTitle.includes(keyword));
        });
        const first = mainSeries || data.results[0];
        return {
          title: first.title || first.name,
          year: (first.release_date || first.first_air_date || "").split("-")[0]
        };
      }
    } catch (e) {
      console.warn("[ToonHub] TMDB search failed:", e.message);
    }
    return null;
  });
}
function searchToonHub(query) {
  return __async(this, null, function* () {
    console.log(`[ToonHub] Searching for: "${query}"`);
    const searchQueries = [
      query.split(":")[0].trim(),
      // Before colon (e.g., "Frieren" from "Frieren: Beyond Journey's End") - BEST
      query.split(" ")[0],
      // First word only
      query
      // Full title - try last as it might be too specific
    ];
    for (const searchQuery of searchQueries) {
      if (!searchQuery || searchQuery.length < 3)
        continue;
      try {
        const searchUrl = `${MAIN_URL}/?s=${encodeURIComponent(searchQuery)}`;
        const response = yield fetchWithTimeout(searchUrl, { headers: HEADERS }, 8e3);
        if (!response.ok)
          continue;
        const html = yield response.text();
        const $ = cheerio.load(html);
        const results = [];
        $("li.post-item").each((i, el) => {
          const a = $(el).find("h2.post-title a");
          const title = a.text().trim().split("[")[0].trim();
          const href = a.attr("href");
          if (href) {
            results.push({ title, href });
          }
        });
        if (results.length > 0) {
          console.log(`[ToonHub] Found ${results.length} results with query: "${searchQuery}"`);
          return results;
        }
      } catch (error) {
        console.warn(`[ToonHub] Search error for "${searchQuery}":`, error.message);
      }
    }
    console.log(`[ToonHub] No results found for any search query`);
    return [];
  });
}
function searchToonStream(query) {
  return __async(this, null, function* () {
    console.log(`[ToonHub] Searching ToonStream for: "${query}"`);
    try {
      const searchUrl = `https://toonstream.one/home/?s=${encodeURIComponent(query)}`;
      const response = yield fetchWithTimeout(searchUrl, { headers: HEADERS }, 1e4);
      if (!response.ok)
        return [];
      const html = yield response.text();
      const $ = cheerio.load(html);
      const results = [];
      $("article.post").each((i, el) => {
        const a = $(el).find("a.lnk-blk");
        const title = $(el).find(".entry-title").text().trim();
        const href = a.attr("href");
        if (href) {
          let type = "unknown";
          if (href.includes("/series/") || href.includes("/anime/"))
            type = "series";
          else if (href.includes("/movies/") || href.includes("/movie/"))
            type = "movie";
          else if (href.includes("/episode/"))
            type = "episode";
          results.push({ title, href, type });
        }
      });
      console.log(`[ToonHub] Found ${results.length} results on ToonStream`);
      return results;
    } catch (error) {
      console.error("[ToonHub] ToonStream search error:", error.message);
      return [];
    }
  });
}
function getToonStreamEpisodes(seriesUrl, episodeNumber) {
  return __async(this, null, function* () {
    console.log(`[ToonHub] Getting episode ${episodeNumber} from ToonStream: ${seriesUrl}`);
    try {
      const response = yield fetchWithTimeout(seriesUrl, { headers: HEADERS }, 1e4);
      if (!response.ok)
        return null;
      const html = yield response.text();
      const $ = cheerio.load(html);
      let epLink = null;
      const epPadded = episodeNumber.toString().padStart(2, "0");
      const epRegex = new RegExp(`(?:Episode|Ep)\\s*(${episodeNumber}|${epPadded})\\b`, "i");
      $("article.post.episodes").each((i, el) => {
        const text = $(el).text();
        if (epRegex.test(text)) {
          epLink = $(el).find("a.lnk-blk").attr("href");
          return false;
        }
      });
      if (!epLink) {
        $('a[href*="/episode/"]').each((i, a) => {
          const href = $(a).attr("href");
          if (href.includes(`-${episodeNumber}/`) || href.includes(`-ep-${episodeNumber}/`) || href.endsWith(`-${episodeNumber}`) || href.endsWith(`-ep-${episodeNumber}`)) {
            epLink = href;
            return false;
          }
        });
      }
      return epLink;
    } catch (error) {
      console.error("[ToonHub] ToonStream episode fetch error:", error.message);
      return null;
    }
  });
}
function extractDirectStream(url) {
  return __async(this, null, function* () {
    console.log(`[ToonHub] Extracting direct stream from: ${url}`);
    try {
      let finalUrl = url.replace(/&#038;/g, "&");
      if (finalUrl.includes("redirect/main") && finalUrl.includes(".php?url=")) {
        const b64 = finalUrl.split("url=")[1].split("&")[0];
        try {
          finalUrl = Buffer.from(b64, "base64").toString("utf8");
          console.log(`[ToonHub] Decoded redirect URL: ${finalUrl}`);
        } catch (e) {
          console.log("[ToonHub] Base64 decode failed for URL");
        }
      }
      if (finalUrl.includes("toonstream.") && finalUrl.includes("/episode/")) {
        console.log(`[ToonHub] Resolving ToonStream episode page: ${finalUrl}`);
        const response = yield fetchWithTimeout(finalUrl, { headers: HEADERS }, 1e4);
        const html = yield response.text();
        const trembedMatch = html.match(/https?:\/\/toonstream\.[^/]+\/home\/\?trembed=[^"']+/i);
        if (trembedMatch) {
          finalUrl = trembedMatch[0].replace(/&#038;/g, "&");
          console.log(`[ToonHub] Found Embed URL: ${finalUrl}`);
        }
      }
      if (finalUrl.includes("toonstream.") && finalUrl.includes("/home/")) {
        console.log(`[ToonHub] Resolving ToonStream embed: ${finalUrl}`);
        const response = yield fetchWithTimeout(finalUrl, { headers: HEADERS }, 1e4);
        const html = yield response.text();
        const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
        if (iframeMatch && iframeMatch[1]) {
          finalUrl = iframeMatch[1].replace(/&#038;/g, "&");
          console.log(`[ToonHub] Found internal host: ${finalUrl}`);
        }
      }
      if (finalUrl.includes("short.icu") || finalUrl.includes("as-cdn21.top") || finalUrl.includes("abyss.to")) {
        console.log(`[ToonHub] Extracting via Host API: ${finalUrl}`);
        const videoIdMatch = finalUrl.match(/\/(?:video|v)\/([a-zA-Z0-9]+)/) || finalUrl.match(/[\?&]v=([a-zA-Z0-9]+)/);
        if (videoIdMatch && videoIdMatch[1]) {
          const videoId = videoIdMatch[1];
          const hostBase = finalUrl.split("/video/")[0].split("/v/")[0];
          const apiUrl = `${hostBase}/player/index.php?data=${videoId}&do=getVideo`;
          console.log(`[ToonHub] Calling Host API for ID: ${videoId}`);
          try {
            const apiResponse = yield fetchWithTimeout(apiUrl, {
              method: "POST",
              headers: __spreadProps(__spreadValues({}, HEADERS), {
                "Referer": "https://toonstream.one/",
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded"
              }),
              body: `hash=${videoId}&r=https://toonstream.one/`
            }, 1e4);
            if (apiResponse.ok) {
              const data = yield apiResponse.json();
              if (data && data.videoSource) {
                console.log(`[ToonHub] Successfully retrieved signed stream: ${data.videoSource}`);
                return data.videoSource;
              }
            }
          } catch (e) {
            console.warn(`[ToonHub] Host API call failed: ${e.message}`);
          }
        }
        const hostHeaders = __spreadProps(__spreadValues({}, HEADERS), { "Referer": "https://toonstream.one/" });
        const response = yield fetchWithTimeout(finalUrl, { headers: hostHeaders }, 1e4);
        const html = yield response.text();
        const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
        if (m3u8Match)
          return m3u8Match[0].replace(/&#038;/g, "&");
        const mp4Match = html.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/i);
        if (mp4Match)
          return mp4Match[0].replace(/&#038;/g, "&");
      }
      if (finalUrl.includes("gdmirrorbot.nl")) {
        console.log(`[ToonHub] Extracting from gdmirrorbot.nl: ${finalUrl}`);
        try {
          const response = yield fetchWithTimeout(finalUrl, {
            headers: __spreadProps(__spreadValues({}, HEADERS), {
              "Referer": "https://toonhub4u.co/"
            })
          }, 1e4);
          const html = yield response.text();
          const fileurlMatch = html.match(/const\s+fileurl\s*=\s*"([^"]+)"/);
          if (fileurlMatch && fileurlMatch[1]) {
            const directUrl = fileurlMatch[1].replace(/\\/g, "");
            console.log(`[ToonHub] Found direct URL from gdmirrorbot: ${directUrl}`);
            return directUrl;
          }
        } catch (e) {
          console.warn(`[ToonHub] gdmirrorbot extraction failed: ${e.message}`);
        }
      }
      if (finalUrl.includes("/file/") || finalUrl.includes("/embed/")) {
        let embedUrl = finalUrl.replace("/file/", "/embed/");
        const response = yield fetchWithTimeout(embedUrl, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: MAIN_URL }) }, 1e4);
        const html = yield response.text();
        const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
        if (m3u8Match)
          return m3u8Match[0].replace(/&#038;/g, "&");
        const mp4Match = html.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/i);
        if (mp4Match)
          return mp4Match[0].replace(/&#038;/g, "&");
      }
      return finalUrl;
    } catch (error) {
      console.error(`[ToonHub] Extraction failed for ${url}:`, error.message);
      return url;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    if (mediaType === "movie") {
      season = null;
      episode = null;
    }
    console.log(`[ToonHub] Processing ${mediaType} ${tmdbId} (S:${season}, E:${episode})`);
    try {
      let mediaInfo;
      if (/^\d+$/.test(tmdbId)) {
        try {
          mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
        } catch (e) {
          mediaInfo = { title: tmdbId, year: null };
        }
      } else {
        try {
          mediaInfo = (yield searchTMDBByTitle(tmdbId, mediaType)) || { title: tmdbId, year: null };
        } catch (e) {
          mediaInfo = { title: tmdbId, year: null };
        }
      }
      const [toonHubResults, toonStreamResultsFallback] = yield Promise.all([
        searchToonHub(mediaInfo.title),
        searchToonStream(mediaInfo.title)
      ]);
      const searchResults = toonHubResults;
      let bestMatch = null;
      let maxScore = 0;
      for (const res of searchResults) {
        let score = calculateTitleSimilarity(mediaInfo.title, res.title);
        if (mediaType === "tv" && season) {
          const titleSeasonMatch = res.title.match(/Season\s*(\d+)/i);
          if (titleSeasonMatch) {
            const titleSeason = parseInt(titleSeasonMatch[1]);
            if (titleSeason === season) {
              score += 0.2;
              console.log(`[ToonHub] Comparing "${mediaInfo.title}" vs "${res.title}" - Score: ${(score - 0.2).toFixed(2)} + 0.2 (season match) = ${score.toFixed(2)}`);
            } else {
              score -= 0.1;
              console.log(`[ToonHub] Comparing "${mediaInfo.title}" vs "${res.title}" - Score: ${(score + 0.1).toFixed(2)} - 0.1 (wrong season) = ${score.toFixed(2)}`);
            }
          } else {
            console.log(`[ToonHub] Comparing "${mediaInfo.title}" vs "${res.title}" - Score: ${score.toFixed(2)}`);
          }
        } else {
          console.log(`[ToonHub] Comparing "${mediaInfo.title}" vs "${res.title}" - Score: ${score.toFixed(2)}`);
        }
        if (score > maxScore) {
          maxScore = score;
          bestMatch = res;
        }
      }
      if (!bestMatch || maxScore < 0.4) {
        console.warn("[ToonHub] No good match found on ToonHub");
        return [];
      }
      if (mediaType === "tv" && season) {
        const matchSeasonMatch = bestMatch.title.match(/Season\s*(\d+)/i);
        if (matchSeasonMatch) {
          const matchSeason = parseInt(matchSeasonMatch[1]);
          if (matchSeason !== season) {
            console.warn(`[ToonHub] Requested season ${season} not found. Best match only has season ${matchSeason}.`);
            return [];
          }
        } else {
          console.warn(`[ToonHub] Requested season ${season} but best match "${bestMatch.title}" has no season number.`);
          return [];
        }
      }
      console.log(`[ToonHub] Best match: "${bestMatch.title}" (score: ${maxScore.toFixed(2)})`);
      const detailResponse = yield fetchWithTimeout(bestMatch.href, { headers: HEADERS }, 8e3);
      const detailHtml = yield detailResponse.text();
      const $ = cheerio.load(detailHtml);
      const content = $(".entry-content");
      const streams = [];
      if (mediaType === "tv" && episode) {
        const epPadded = episode.toString().padStart(2, "0");
        const epRegex = new RegExp(`Episode\\s*(${episode}|${epPadded})`, "i");
        content.find("p, strong, span, h3").each((i, el) => {
          const text = $(el).text();
          if (epRegex.test(text)) {
            let current = $(el);
            let foundLinks = false;
            let depth = 0;
            while (current.length && depth < 5) {
              current.find("a[href]").each((j, a) => {
                var _a;
                const href = $(a).attr("href");
                const linkText = $(a).text();
                const quality = ((_a = linkText.match(/\d+p/i)) == null ? void 0 : _a[0]) || extractQualityFromContext(current.text()) || "HD";
                if (href && !href.includes("ads") && !href.endsWith(".co/") && !href.endsWith(".co")) {
                  if (href.includes("toonstream.net") || href.includes("redirect/main")) {
                    console.log(`[ToonHub] Skipping dead/unreliable redirect link: ${href}`);
                    return;
                  }
                  streams.push({ url: href, quality, label: `Episode ${episode}` });
                  foundLinks = true;
                }
              });
              current = current.next();
              if (current.length && /Episode\s*(\d+)/i.test(current.text()) && !epRegex.test(current.text()))
                break;
              depth++;
            }
          }
        });
      } else {
        content.find("a[href]").each((i, el) => {
          var _a;
          const href = $(el).attr("href");
          const text = $(el).text();
          if (href && (href.includes("/file/") || href.includes("/embed/") || href.includes("drive.google.com") || href.includes("toonstream.") || href.includes("redirect/"))) {
            if (href.includes("toonstream.net") || href.includes("redirect/main"))
              return;
            const quality = ((_a = text.match(/\d+p/i)) == null ? void 0 : _a[0]) || "HD";
            streams.push({ url: href, quality });
          }
        });
      }
      console.log(`[ToonHub] Found ${streams.length} links on ToonHub page`);
      let tsBestMatch = null;
      let tsMaxScore = 0;
      for (const res of toonStreamResultsFallback) {
        const score = calculateTitleSimilarity((bestMatch == null ? void 0 : bestMatch.title) || mediaInfo.title, res.title);
        const finalScore = score + (res.type === "series" ? 0.1 : 0);
        if (finalScore > tsMaxScore) {
          tsMaxScore = finalScore;
          tsBestMatch = res;
        }
      }
      if (tsBestMatch && tsMaxScore > 0.45 && streams.length < 5) {
        console.log(`[ToonHub] Adding ToonStream result as additional candidate: ${tsBestMatch.title}`);
        let tsEpisodeUrl = tsBestMatch.type === "episode" ? tsBestMatch.href : yield getToonStreamEpisodes(tsBestMatch.href, episode || 1);
        if (tsEpisodeUrl) {
          streams.push({ url: tsEpisodeUrl, quality: "HD", label: `Episode ${episode}` });
        }
      }
      streams.sort((a, b) => {
        const getPriority = (url) => {
          if (url.includes("gdmirrorbot") || url.includes("as-cdn21.top"))
            return 1;
          if (url.includes("google.com/drive"))
            return 2;
          if (url.includes("toonstream"))
            return 3;
          return 4;
        };
        return getPriority(a.url) - getPriority(b.url);
      });
      const finalResults = [];
      const seenUrls = /* @__PURE__ */ new Set();
      let matchingStreamsCount = 0;
      const concurrencyLimit = 10;
      const targetResults = 5;
      const streamTasks = [];
      const processStream = (stream) => __async(this, null, function* () {
        if (seenUrls.has(stream.url) || matchingStreamsCount >= targetResults)
          return null;
        seenUrls.add(stream.url);
        try {
          const finalUrl = yield extractDirectStream(stream.url);
          if (!finalUrl || matchingStreamsCount >= targetResults)
            return null;
          const filenameMatch = finalUrl.match(/name=([^&]+)/);
          let seasonEpInfo = null;
          let audioInfo = null;
          let shouldInclude = true;
          if (filenameMatch) {
            const filename = decodeURIComponent(filenameMatch[1].replace(/\+/g, " "));
            seasonEpInfo = mediaType === "tv" ? extractSeasonEpisodeFromFilename(filename) : null;
            audioInfo = extractAudioInfoFromFilename(filename);
            if (mediaType === "tv" && season && episode && seasonEpInfo) {
              if (seasonEpInfo.season !== season || seasonEpInfo.episode !== episode) {
                shouldInclude = false;
              }
            }
          }
          if (shouldInclude && matchingStreamsCount < targetResults) {
            let extraInfo = "";
            if (filenameMatch) {
              const filename = decodeURIComponent(filenameMatch[1].replace(/\+/g, " "));
              extraInfo = parseFormatFromFilename(filename);
            } else if (finalUrl.includes(".m3u8")) {
              extraInfo = yield getHlsFormatInfo(finalUrl);
            }
            const streamObj = {
              name: "ToonHub",
              title: formatStreamTitle(mediaInfo, stream, seasonEpInfo, audioInfo, extraInfo),
              url: finalUrl,
              quality: stream.quality,
              headers: { "Referer": MAIN_URL, "User-Agent": HEADERS["User-Agent"] },
              provider: "ToonHub"
            };
            const isWorking = yield checkLink(streamObj.url, streamObj.headers);
            if (isWorking && matchingStreamsCount < targetResults) {
              matchingStreamsCount++;
              return streamObj;
            }
          }
          return null;
        } catch (error) {
          return null;
        }
      });
      const activeTasks = /* @__PURE__ */ new Set();
      for (const stream of streams) {
        if (matchingStreamsCount >= targetResults)
          break;
        const task = processStream(stream).then((res) => {
          if (res)
            finalResults.push(res);
          activeTasks.delete(task);
        });
        activeTasks.add(task);
        if (activeTasks.size >= concurrencyLimit) {
          yield Promise.race(activeTasks);
        }
      }
      yield Promise.all(activeTasks);
      return finalResults;
    } catch (error) {
      console.error("[ToonHub] getStreams error:", error);
      return [];
    }
  });
}
function extractQualityFromContext(text) {
  if (text.includes("1080p"))
    return "1080p";
  if (text.includes("720p"))
    return "720p";
  if (text.includes("480p"))
    return "480p";
  return null;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
