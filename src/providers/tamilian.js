/**
 * tamilian - Built from src/tamilian/
 * Generated: 2026-03-05T15:20:52.864Z
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

// src/providers/tamilian/index.js
var cheerio = require("cheerio-without-node-native");
var TMDB_API_KEY = "1b3113663c9004682ed61086cf967c44";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var MAIN_URL = "https://tamilian.io/";
var EMBEDOJO_HOST = "https://embedojo.net";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Referer": `${MAIN_URL}/`
};
function fetchWithTimeout(_0) {
  return __async(this, arguments, function* (url, options = {}, timeout = 1e4) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = yield fetch(url, __spreadProps(__spreadValues({}, options), {
        signal: controller.signal
      }));
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  });
}
function unpack(p, a, c, k) {
  const intToBase = (num, radix) => {
    if (radix <= 36)
      return num.toString(radix);
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let str = "";
    do {
      str = chars[num % radix] + str;
      num = Math.floor(num / radix);
    } while (num > 0);
    return str;
  };
  while (c--) {
    if (k[c]) {
      const placeholder = intToBase(c, a);
      p = p.replace(new RegExp("\\b" + placeholder + "\\b", "g"), k[c]);
    }
  }
  return p;
}
function formatStreamTitle(mediaInfo, stream) {
  const { title, year } = mediaInfo;
  const { quality, label } = stream;
  const yearStr = year ? ` (${year})` : "";
  const tapeLine = `\u{1F4FC}: ${title}${yearStr}`;
  const providerLine = `\u{1F69C}: tamilian`;
  return `Tamilian (Direct) (${quality})
${tapeLine}
${providerLine} | \u{1F310}: MULTI`;
}
function extractFromEmbedojoDirect(tmdbId) {
  return __async(this, null, function* () {
    const categories = ["tamil", "english", "hindi", "telugu", "malayalam", "kannada", "dubbed"];
    console.log(`[Tamilian] Attempting direct Embedojo extraction for TMDB ID: ${tmdbId} (Categories: ${categories.join(", ")})`);
    const pool = categories.map((cat) => __async(this, null, function* () {
      try {
        const url = `${EMBEDOJO_HOST}/${cat}/tmdb/${tmdbId}`;
        const response = yield fetchWithTimeout(url, { headers: HEADERS }, 6e3);
        if (!response.ok)
          return null;
        const html = yield response.text();
        const $ = cheerio.load(html);
        let packedScript = null;
        $("script").each((i, el) => {
          const content = $(el).html();
          if (content && content.includes("function(p,a,c,k,e,d)")) {
            packedScript = content;
            return false;
          }
        });
        if (!packedScript)
          return null;
        const packerMatch = packedScript.match(new RegExp("return p\\}\\('(.*)',\\s*(\\d+),\\s*(\\d+),\\s*'(.*?)'\\.split\\(", "s")) || packedScript.match(/return p\}\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*?)'\.split\(/);
        if (!packerMatch)
          return null;
        const unpacked = unpack(packerMatch[1], parseInt(packerMatch[2]), parseInt(packerMatch[3]), packerMatch[4].split("|"));
        const tokenMatch = unpacked.match(/FirePlayer\s*\(\s*["']([^"']+)["']/);
        if (!tokenMatch)
          return null;
        const token = tokenMatch[1];
        const postUrl = `${EMBEDOJO_HOST}/player/index.php?data=${token}&do=getVideo`;
        const postResponse = yield fetchWithTimeout(postUrl, {
          method: "POST",
          headers: __spreadProps(__spreadValues({}, HEADERS), {
            "Origin": EMBEDOJO_HOST,
            "X-Requested-With": "XMLHttpRequest"
          })
        }, 6e3);
        const videoData = yield postResponse.json();
        const finalUrl = videoData.securedLink || videoData.videoSource;
        if (videoData && finalUrl) {
          console.log(`[Tamilian] Found video source in category "${cat}": ${finalUrl}`);
          return {
            url: finalUrl,
            quality: "1080p",
            isM3U8: true,
            category: cat
          };
        }
      } catch (e) {
      }
      return null;
    }));
    try {
      const results = yield Promise.all(pool);
      const validResult = results.find((r) => r !== null);
      if (validResult)
        return validResult;
    } catch (error) {
      console.error(`[Tamilian] Embedojo Parallel Direct Error: ${error.message}`);
    }
    return null;
  });
}
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "movie" ? "movie" : "tv";
    const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    try {
      const response = yield fetch(url);
      const data = yield response.json();
      if (!data.id)
        throw new Error("Invalid TMDB ID");
      const title = data.title || data.name;
      const info = {
        title,
        year: (data.release_date || data.first_air_date || "").split("-")[0],
        tmdbId: data.id,
        originalLanguage: data.original_language
      };
      console.log(`[Tamilian] TMDB Info: "${info.title}" (${info.year || "N/A"}) [${info.originalLanguage}]`);
      return info;
    } catch (error) {
      console.error("[Tamilian] Error fetching TMDB metadata:", error.message);
      throw error;
    }
  });
}
function searchTMDB(query, mediaType, year = null) {
  return __async(this, null, function* () {
    const type = mediaType === "movie" ? "movie" : "tv";
    let url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
    if (year) {
      url += `&${type === "movie" ? "primary_release_year" : "first_air_date_year"}=${year}`;
    }
    try {
      const response = yield fetch(url);
      const data = yield response.json();
      if (data.results && data.results.length > 0) {
        const firstMatch = data.results[0];
        console.log(`[Tamilian] Resolved "${query}" to TMDB ID: ${firstMatch.id} (${firstMatch.title || firstMatch.name})`);
        return {
          title: firstMatch.title || firstMatch.name,
          year: (firstMatch.release_date || firstMatch.first_air_date || "").split("-")[0],
          tmdbId: firstMatch.id,
          originalLanguage: firstMatch.original_language
        };
      }
      return null;
    } catch (error) {
      console.error(`[Tamilian] TMDB Search failed: ${error.message}`);
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    if (mediaType !== "movie") {
      console.log(`[Tamilian] Media type is "${mediaType}", but Tamilian only supports Movies.`);
      return [];
    }
    console.log(`[Tamilian] Processing ${mediaType} ${tmdbId}`);
    try {
      let mediaInfo;
      const isNumeric = /^\d+$/.test(tmdbId);
      let yearFromQuery = null;
      let cleanName = tmdbId;
      if (!isNumeric) {
        const yearMatch = tmdbId.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          yearFromQuery = yearMatch[0];
          cleanName = tmdbId.replace(/\b(19|20)\d{2}\b/g, "").trim();
        }
      }
      if (isNumeric) {
        try {
          mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
        } catch (e) {
          mediaInfo = { tmdbId, title: "Unknown", year: "" };
        }
      } else {
        console.log(`[Tamilian] Searching TMDB for: "${cleanName}" ${yearFromQuery ? `(${yearFromQuery})` : ""}`);
        mediaInfo = yield searchTMDB(cleanName, mediaType, yearFromQuery);
        if (!mediaInfo || !mediaInfo.tmdbId) {
          console.log("[Tamilian] TMDB resolution failed or no TMDB ID found. Cannot proceed with direct extraction.");
          return [];
        }
      }
      const validStreams = [];
      if (mediaInfo.tmdbId) {
        const directStream = yield extractFromEmbedojoDirect(mediaInfo.tmdbId);
        if (directStream) {
          validStreams.push({
            title: `${mediaInfo.title} (${mediaInfo.year}) - 1080p`,
            url: directStream.url,
            quality: directStream.quality,
            label: "Embedojo Direct"
          });
        }
      }
      return validStreams.map((s) => ({
        name: "Tamilian",
        title: formatStreamTitle(mediaInfo, s),
        url: s.url,
        quality: s.quality || "Unknown",
        headers: {
          "Referer": MAIN_URL,
          "Origin": "https://embedojo.net",
          "User-Agent": HEADERS["User-Agent"]
        },
        provider: "Tamilian"
      }));
    } catch (error) {
      console.error("[Tamilian] getStreams failed:", error.message);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
