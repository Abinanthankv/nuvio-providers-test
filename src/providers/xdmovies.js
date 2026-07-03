/**
 * xdmovies - Built from src/xdmovies/
 * Generated: 2026-07-03T14:21:59.794Z
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

// src/providers/xdmovies/index.js
var cheerio = require("cheerio-without-node-native");
var XDMOVIES_API = "https://new.xdmovies.wtf";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": `${XDMOVIES_API}/`
};
function fetchWithTimeout(_0) {
  return __async(this, arguments, function* (url, options = {}, timeout = 1e4) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = yield fetch(url, __spreadProps(__spreadValues({}, options), { signal: controller.signal }));
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  });
}
function searchMovie(query, year = null) {
  return __async(this, null, function* () {
    const results = [];
    const slug = query.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const patterns = [];
    if (year) {
      patterns.push(
        `/movies/${slug}-${year}-2160p-1080p-hindi-english-download`,
        `/movies/${slug}-${year}-1080p-hindi-english-download`,
        `/movies/${slug}-${year}-hindi-english-download`,
        `/movies/${slug}-${year}-hindi-download`,
        `/movies/${slug}-${year}-tamil-download`
      );
    }
    patterns.push(
      `/movies/${slug}-*`,
      `/movies/${slug}`,
      `/movies/${slug}`,
      `/movies/${slug}`,
      `/movies/${slug}`
    );
    for (const pattern of patterns) {
      const url = XDMOVIES_API + pattern;
      try {
        const response = yield fetchWithTimeout(url, { headers: HEADERS }, 5e3);
        if (response.ok) {
          const html = yield response.text();
          if (!html.includes("404") && !html.includes("Page not found")) {
            results.push({
              title: query + (year ? ` (${year})` : ""),
              url
            });
            break;
          }
        }
      } catch (e) {
      }
    }
    if (results.length === 0) {
      try {
        const response = yield fetchWithTimeout(XDMOVIES_API, { headers: HEADERS }, 8e3);
        const html = yield response.text();
        const $ = cheerio.load(html);
        $('a[href*="/movies/"]').each((i, el) => {
          const href = $(el).attr("href");
          if (href && href.includes("/movies/") && !href.includes("download")) {
            const text = $(el).text().trim();
            if (text && text.length > 3) {
              results.push({ title: text, url: XDMOVIES_API + href });
            }
          }
        });
      } catch (e) {
      }
    }
    return results;
  });
}
function getTMDBDetails(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
  return fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  }).then(function(response) {
    console.error("[TMDB] HTTP status:", response.status);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    return response.json();
  }).then(function(data) {
    var _a;
    const title = mediaType === "tv" ? data.name : data.title;
    const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
    const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
    return {
      title,
      year,
      imdbId: ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || null
    };
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    console.log(`[XDmovies] Processing ${mediaType} ${tmdbId}`);
    let mediaInfo;
    let searchQuery = tmdbId;
    const isNumericId = /^\d+$/.test(tmdbId);
    if (isNumericId) {
      try {
        mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
        if (mediaInfo == null ? void 0 : mediaInfo.title) {
          searchQuery = mediaInfo.title;
        }
      } catch (e) {
        console.log(`[XDmovies] TMDB fetch failed, using "${tmdbId}" as search query`);
      }
    }
    let year = null;
    const yearMatch = searchQuery.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      year = yearMatch[0];
      searchQuery = searchQuery.replace(year, "").trim();
    }
    console.log(`[XDmovies] Searching for: ${searchQuery} (year: ${year})`);
    const searchResults = yield searchMovie(searchQuery, year);
    if (searchResults.length === 0) {
      console.warn("[XDmovies] No search results found");
      return [];
    }
    const movieUrl = searchResults[0].url;
    console.log(`[XDmovies] Found page: ${movieUrl}`);
    try {
      const response = yield fetchWithTimeout(movieUrl, { headers: HEADERS }, 1e4);
      const html = yield response.text();
      const $ = cheerio.load(html);
      const streams = [];
      $("a[href]").each((i, el) => {
        var _a;
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (!href)
          return;
        if (href.includes("embed") || href.includes("stream") || href.includes("player") || href.includes("vidhide") || href.includes("streamtape") || href.includes("doodstream")) {
          streams.push({
            url: href,
            quality: ((_a = text.match(/\d{3,4}p/i)) == null ? void 0 : _a[0]) || "Unknown",
            source: text || "XDmovies"
          });
        }
      });
      $("iframe[src]").each((i, el) => {
        const src = $(el).attr("src");
        if (src) {
          streams.push({
            url: src,
            quality: "Unknown",
            source: "XDmovies"
          });
        }
      });
      console.log(`[XDmovies] Found ${streams.length} stream URLs`);
      return streams;
    } catch (e) {
      console.error("[XDmovies] Error fetching movie page:", e.message);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
