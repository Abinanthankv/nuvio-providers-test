/**
 * xdmovies - Built from src/xdmovies/
 * Generated: 2026-03-05T16:24:28.576Z
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

// src/providers/xdmovies/index.js
var cheerio = require("cheerio-without-node-native");
var XDMOVIES_API = "https://xdmovies.site";
var TMDB_API_KEY = "1b3113663c9004682ed61086cf967c44";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var XDMOVIES_HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Referer": `${XDMOVIES_API}/`,
  "x-requested-with": "XMLHttpRequest",
  "x-auth-token": atob("NzI5N3Nra2loa2Fqd25zZ2FrbGFrc2h1d2Q=")
};
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Referer": `${XDMOVIES_API}/`
};
function formatBytes(bytes) {
  if (!bytes || bytes === 0)
    return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
function cleanTitle(title) {
  const parts = title.split(/[.\-_]/);
  const qualityTags = [
    "WEBRip",
    "WEB-DL",
    "WEB",
    "BluRay",
    "HDRip",
    "DVDRip",
    "HDTV",
    "CAM",
    "TS",
    "R5",
    "DVDScr",
    "BRRip",
    "BDRip",
    "DVD",
    "PDTV",
    "HD"
  ];
  const audioTags = [
    "AAC",
    "AC3",
    "DTS",
    "MP3",
    "FLAC",
    "DD5",
    "EAC3",
    "Atmos"
  ];
  const subTags = [
    "ESub",
    "ESubs",
    "Subs",
    "MultiSub",
    "NoSub",
    "EnglishSub",
    "HindiSub"
  ];
  const codecTags = [
    "x264",
    "x265",
    "H264",
    "HEVC",
    "AVC"
  ];
  const startIndex = parts.findIndex(
    (part) => qualityTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase()))
  );
  const endIndex = parts.findLastIndex(
    (part) => subTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase())) || audioTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase())) || codecTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase()))
  );
  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    return parts.slice(startIndex, endIndex + 1).join(".");
  } else if (startIndex !== -1) {
    return parts.slice(startIndex).join(".");
  } else {
    return parts.slice(-3).join(".");
  }
}
function extractServerName(source) {
  if (!source)
    return "Unknown";
  const src = source.trim();
  if (/HubCloud/i.test(src)) {
    if (/FSL/i.test(src))
      return "HubCloud FSL Server";
    if (/FSL V2/i.test(src))
      return "HubCloud FSL V2 Server";
    if (/S3/i.test(src))
      return "HubCloud S3 Server";
    if (/Buzz/i.test(src))
      return "HubCloud BuzzServer";
    if (/10\s*Gbps/i.test(src))
      return "HubCloud 10Gbps";
    return "HubCloud";
  }
  if (/Pixeldrain/i.test(src))
    return "Pixeldrain";
  if (/StreamTape/i.test(src))
    return "StreamTape";
  if (/HubCdn/i.test(src))
    return "HubCdn";
  if (/HbLinks/i.test(src))
    return "HbLinks";
  if (/Hubstream/i.test(src))
    return "Hubstream";
  return src.replace(/^www\./i, "").split(/[.\s]/)[0];
}
function formatTitle(mediaInfo, serverName, quality, season, episode, size = "", metadata = "") {
  const title = mediaInfo.title || "Unknown";
  const s = String(season || 1).padStart(2, "0");
  const e = String(episode || 1).padStart(2, "0");
  const epLabel = season ? ` - S${s} E${e}` : mediaInfo.year ? ` (${mediaInfo.year})` : "";
  let titleStr = `XDmovies (${quality}) [${serverName}]
\u{1F4F9}: ${title}${epLabel}`;
  return titleStr;
}
function isLinkWorking(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5e3);
  return fetch(url, {
    method: "HEAD",
    headers: __spreadValues(__spreadValues({}, HEADERS), headers),
    signal: controller.signal
  }).then((res) => {
    clearTimeout(timeout);
    return res.status >= 200 && res.status < 400;
  }).catch(() => {
    clearTimeout(timeout);
    return false;
  });
}
function pixelDrainExtractor(link, quality) {
  return Promise.resolve().then(() => {
    let fileId;
    const match = link.match(/(?:file|u)\/([A-Za-z0-9]+)/);
    if (match) {
      fileId = match[1];
    } else {
      fileId = link.split("/").pop();
    }
    if (!fileId) {
      return [{ source: "Pixeldrain", quality: "Unknown", url: link }];
    }
    const infoUrl = `https://pixeldrain.com/api/file/${fileId}/info`;
    const directUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
    return fetch(infoUrl, { headers: HEADERS }).then((response) => {
      if (!response.ok)
        throw new Error("Info fetch failed");
      return response.json();
    }).then((info) => {
      let inferredQuality = quality || "Unknown";
      if (info && info.name) {
        const qualityMatch = info.name.match(/(\d{3,4})p/);
        if (qualityMatch)
          inferredQuality = qualityMatch[0];
      }
      return [{
        source: "Pixeldrain",
        quality: inferredQuality,
        url: directUrl,
        name: info.name || "",
        size: info.size || 0
      }];
    }).catch((e) => {
      return [{
        source: "Pixeldrain",
        quality: quality || "Unknown",
        url: directUrl,
        name: "",
        size: 0
      }];
    });
  }).catch((e) => {
    console.error("[Pixeldrain] extraction failed", e.message);
    return [{ source: "Pixeldrain", quality: "Unknown", url: link }];
  });
}
function streamTapeExtractor(link) {
  const url = new URL(link);
  url.hostname = "streamtape.com";
  const normalizedLink = url.toString();
  return fetch(normalizedLink, { headers: HEADERS }).then((res) => res.text()).then((data) => {
    const match = data.match(/document\.getElementById\('videolink'\)\.innerHTML = (.*?);/);
    if (match && match[1]) {
      const scriptContent = match[1];
      const urlPartMatch = scriptContent.match(/'(\/\/streamtape\.com\/get_video[^']+)'/);
      if (urlPartMatch && urlPartMatch[1]) {
        const videoSrc = "https:" + urlPartMatch[1];
        return [{ source: "StreamTape", quality: "Stream", url: videoSrc }];
      }
    }
    const simpleMatch = data.match(/'(\/\/streamtape\.com\/get_video[^']+)'/);
    if (simpleMatch && simpleMatch[0]) {
      const videoSrc = "https:" + simpleMatch[0].slice(1, -1);
      return [{ source: "StreamTape", quality: "Stream", url: videoSrc }];
    }
    return [];
  }).catch((e) => {
    if (!e.response || e.response.status !== 404) {
      console.error(`[StreamTape] An unexpected error occurred for ${normalizedLink}:`, e.message);
    }
    return [];
  });
}
function hubStreamExtractor(url, referer) {
  return fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) }).then((response) => {
    return [{ source: "Hubstream", quality: "Unknown", url }];
  }).catch((e) => {
    console.error(`[Hubstream] Failed to extract from ${url}:`, e.message);
    return [];
  });
}
function hbLinksExtractor(url, referer) {
  return fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) }).then((response) => response.text()).then((data) => {
    const $ = cheerio.load(data);
    const links = $("h3 a, div.entry-content p a").map((i, el) => $(el).attr("href")).get();
    const finalLinks = [];
    const promises = links.map((link) => loadExtractor(link, url));
    return Promise.all(promises).then((results) => {
      results.forEach((extracted) => finalLinks.push(...extracted));
      return finalLinks;
    });
  });
}
function hubCdnExtractor(url, referer) {
  return fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) }).then((response) => response.text()).then((data) => {
    const encodedMatch = data.match(/r=([A-Za-z0-9+/=]+)/);
    if (encodedMatch && encodedMatch[1]) {
      const m3u8Data = atob(encodedMatch[1]);
      const m3u8Link = m3u8Data.substring(m3u8Data.lastIndexOf("link=") + 5);
      return [{
        source: "HubCdn",
        quality: "M3U8",
        url: m3u8Link
      }];
    }
    return [];
  }).catch(() => []);
}
function hubDriveExtractor(url, referer) {
  return fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) }).then((response) => response.text()).then((data) => {
    const $ = cheerio.load(data);
    const href = $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href");
    if (href) {
      return loadExtractor(href, url);
    }
    return [];
  }).catch(() => []);
}
function hubCloudExtractor(url, referer) {
  let currentUrl = url;
  if (currentUrl.includes("hubcloud.ink")) {
    currentUrl = currentUrl.replace("hubcloud.ink", "hubcloud.dad");
  }
  if (/\/(video|drive)\//i.test(currentUrl)) {
    return fetch(currentUrl, {
      headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer })
    }).then((r) => r.text()).then((html) => {
      const match = html.match(/href="(https?:\/\/hubcloud\.[^/]+\/hubcloud\.php[^"]+)"/);
      if (match && match[1]) {
        return hubCloudExtractor(match[1], currentUrl);
      }
      const $ = cheerio.load(html);
      const hubPhp = $('a[href*="hubcloud.php"]').attr("href");
      if (!hubPhp)
        return [];
      return hubCloudExtractor(hubPhp, currentUrl);
    }).catch(() => []);
  }
  const initialFetch = currentUrl.includes("hubcloud.php") ? fetch(currentUrl, {
    headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }),
    redirect: "follow"
  }).then(
    (response) => response.text().then((html) => ({
      pageData: html,
      finalUrl: response.url || currentUrl
    }))
  ) : fetch(currentUrl, {
    headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer })
  }).then((r) => r.text()).then((pageData) => {
    let finalUrl = currentUrl;
    const scriptUrlMatch = pageData.match(/var url = '([^']*)'/);
    if (scriptUrlMatch && scriptUrlMatch[1]) {
      finalUrl = scriptUrlMatch[1];
      return fetch(finalUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: currentUrl })
      }).then((r) => r.text()).then((secondData) => ({
        pageData: secondData,
        finalUrl
      }));
    }
    return { pageData, finalUrl };
  });
  return initialFetch.then(({ pageData, finalUrl }) => {
    const $ = cheerio.load(pageData);
    const size = $("i#size").text().trim();
    const header = $("div.card-header").text().trim();
    const getIndexQuality = (str) => {
      const match = (str || "").match(/(\d{3,4})[pP]/);
      return match ? parseInt(match[1]) : 2160;
    };
    const quality = getIndexQuality(header);
    const headerDetails = cleanTitle(header);
    const labelExtras = (() => {
      let extras = "";
      if (headerDetails)
        extras += `[${headerDetails}]`;
      if (size)
        extras += `[${size}]`;
      return extras;
    })();
    const sizeInBytes = (() => {
      if (!size)
        return 0;
      const m = size.match(/([\d.]+)\s*(GB|MB|KB)/i);
      if (!m)
        return 0;
      const v = parseFloat(m[1]);
      if (m[2].toUpperCase() === "GB")
        return v * 1024 ** 3;
      if (m[2].toUpperCase() === "MB")
        return v * 1024 ** 2;
      if (m[2].toUpperCase() === "KB")
        return v * 1024;
      return 0;
    })();
    const links = [];
    const elements = $("a.btn[href]").get();
    const processElements = elements.map((el) => {
      const link = $(el).attr("href");
      const text = $(el).text();
      if (/telegram/i.test(text) || /telegram/i.test(link)) {
        return Promise.resolve();
      }
      const fileName = header || headerDetails || "Unknown";
      if (text.includes("Download File")) {
        links.push({
          source: `HubCloud ${labelExtras}`,
          quality,
          url: link,
          size: sizeInBytes,
          fileName
        });
        return Promise.resolve();
      }
      if (text.includes("FSL V2")) {
        links.push({
          source: `HubCloud - FSL V2 Server ${labelExtras}`,
          quality,
          url: link,
          size: sizeInBytes,
          fileName
        });
        return Promise.resolve();
      }
      if (text.includes("FSL")) {
        links.push({
          source: `HubCloud - FSL Server ${labelExtras}`,
          quality,
          url: link,
          size: sizeInBytes,
          fileName
        });
        return Promise.resolve();
      }
      if (text.includes("S3 Server")) {
        links.push({
          source: `HubCloud - S3 Server ${labelExtras}`,
          quality,
          url: link,
          size: sizeInBytes,
          fileName
        });
        return Promise.resolve();
      }
      if (text.includes("BuzzServer")) {
        return fetch(`${link}/download`, {
          method: "GET",
          headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: link }),
          redirect: "manual"
        }).then((resp) => {
          if (resp.status >= 300 && resp.status < 400) {
            const loc = resp.headers.get("location");
            const m = loc == null ? void 0 : loc.match(/hx-redirect=([^&]+)/);
            if (m) {
              links.push({
                source: `HubCloud - BuzzServer ${labelExtras}`,
                quality,
                url: decodeURIComponent(m[1]),
                size: sizeInBytes,
                fileName
              });
            }
          }
        }).catch(() => {
        });
      }
      if (link.includes("pixeldra")) {
        console.log("[HubCloud] Using Pixeldrain extractor for link:", link);
        return pixelDrainExtractor(link, quality).then((extracted) => {
          links.push(...extracted.map((l) => __spreadProps(__spreadValues({}, l), {
            quality: typeof l.quality === "number" ? l.quality : quality,
            size: l.size || sizeInBytes,
            fileName
          })));
        }).catch(() => {
        });
      }
      if (text.includes("10Gbps")) {
        let redirectUrl = link;
        const walkRecursive = (i) => {
          if (i >= 3)
            return Promise.resolve(null);
          return fetch(redirectUrl, { redirect: "manual", headers: HEADERS }).then((r) => {
            if (r.status >= 300 && r.status < 400) {
              const loc = r.headers.get("location");
              if (!loc)
                return null;
              if (loc.includes("link=")) {
                return loc.split("link=")[1];
              }
              redirectUrl = new URL(loc, redirectUrl).toString();
              return walkRecursive(i + 1);
            }
            return r.text().then((text2) => {
              const m = text2.match(/window\.location\.href\s*=\s*'([^']+)'/);
              if (m) {
                redirectUrl = new URL(m[1], redirectUrl).toString();
                return walkRecursive(i + 1);
              }
              return null;
            });
          }).catch(() => null);
        };
        return walkRecursive(0).then((dlink) => {
          if (dlink) {
            links.push({
              source: `HubCloud - 10Gbps ${labelExtras}`,
              quality,
              url: dlink,
              size: sizeInBytes,
              fileName
            });
          }
        });
      }
      const host = new URL(link).hostname;
      if (host.includes("hubcloud") || host.includes("hubdrive") || host.includes("hubcdn")) {
        return Promise.resolve();
      }
      return loadExtractor(link, finalUrl).then((r) => links.push(...r));
    });
    return Promise.all(processElements).then(() => links);
  }).catch(() => []);
}
function loadExtractor(url, referer = MAIN_URL) {
  const hostname = new URL(url).hostname;
  if (hostname.includes("gdflix")) {
    return gdFlixExtractor(url, referer);
  }
  if (hostname.includes("gofile")) {
    return goFileExtractor(url);
  }
  if (hostname.includes("hubcloud")) {
    return hubCloudExtractor(url, referer);
  }
  if (hostname.includes("hubdrive")) {
    return hubDriveExtractor(url, referer);
  }
  if (hostname.includes("hubcdn")) {
    return hubCdnExtractor(url, referer);
  }
  if (hostname.includes("hblinks")) {
    return hbLinksExtractor(url, referer);
  }
  if (hostname.includes("hubstream")) {
    return hubStreamExtractor(url, referer);
  }
  if (hostname.includes("pixeldrain")) {
    return pixelDrainExtractor(url);
  }
  if (hostname.includes("streamtape")) {
    return streamTapeExtractor(url);
  }
  if (hostname.includes("hdstream4u")) {
    return Promise.resolve([{ source: "HdStream4u", quality: "Unknown", url }]);
  }
  if (hostname.includes("linkrit")) {
    return Promise.resolve([]);
  }
  if (hostname.includes("google.") || hostname.includes("ampproject.org") || hostname.includes("gstatic.") || hostname.includes("doubleclick.") || hostname.includes("ddl2")) {
    console.warn("[XDMovies] Blocked redirect host:", hostname);
    return Promise.resolve([]);
  }
  const sourceName = hostname.replace(/^www\./, "");
  return Promise.resolve([{ source: sourceName, quality: "Unknown", url }]);
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
  return getTMDBDetails(tmdbId, mediaType).then((mediaInfo) => {
    if (!(mediaInfo == null ? void 0 : mediaInfo.title))
      return [];
    return fetch(
      `${XDMOVIES_API}/php/search_api.php?query=${encodeURIComponent(mediaInfo.title)}&fuzzy=true`,
      { headers: XDMOVIES_HEADERS }
    ).then((r) => r.ok ? r.json() : []).then((searchData) => {
      if (!Array.isArray(searchData))
        return [];
      const matched = searchData.find(
        (x) => Number(x.tmdb_id) === Number(tmdbId)
      );
      if (!(matched == null ? void 0 : matched.path))
        return [];
      let metadata = "";
      const siteTitle = matched.title || "";
      const metaParts = [];
      if (/multi\s*audio/i.test(siteTitle))
        metaParts.push("Multi Audio");
      else if (/dual\s*audio/i.test(siteTitle))
        metaParts.push("Dual Audio");
      if (/esub/i.test(siteTitle))
        metaParts.push("ESub");
      else if (/sub/i.test(siteTitle))
        metaParts.push("Sub");
      if (metaParts.length > 0)
        metadata = metaParts.join(" + ");
      return fetch(XDMOVIES_API + matched.path, {
        headers: XDMOVIES_HEADERS
      }).then((r) => r.text()).then((html) => {
        const $ = cheerio.load(html);
        const collectedUrls = [];
        const resolveRedirect = (url) => fetch(url, {
          headers: XDMOVIES_HEADERS,
          redirect: "manual"
        }).then((res) => {
          if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get("location");
            return loc ? new URL(loc, url).toString() : null;
          }
          return url;
        }).catch(() => null);
        if (!season) {
          const rawLinks = $("div.download-item a[href]").map((_, a) => $(a).attr("href")).get();
          return Promise.all(
            rawLinks.map(
              (raw) => resolveRedirect(raw).then((finalUrl) => {
                if (finalUrl)
                  collectedUrls.push(finalUrl);
              })
            )
          ).then(() => collectedUrls);
        }
        const epRegex = new RegExp(
          `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`,
          "i"
        );
        const jobs = [];
        $("div.episode-card").each((_, card) => {
          const $card = $(card);
          const title = $card.find(".episode-title").text() || "";
          if (!epRegex.test(title))
            return;
          $card.find("a[href]").each((_2, a) => {
            const raw = $(a).attr("href");
            if (!raw)
              return;
            jobs.push(
              resolveRedirect(raw).then((finalUrl) => {
                if (finalUrl)
                  collectedUrls.push(finalUrl);
              })
            );
          });
        });
        return Promise.all(jobs).then(() => collectedUrls);
      }).then((collectedUrls) => {
        if (!collectedUrls.length)
          return [];
        return Promise.all(
          collectedUrls.map(
            (url) => loadExtractor(url, XDMOVIES_API).catch(() => [])
          )
        ).then((results) => {
          const flat = results.flat();
          const seen = /* @__PURE__ */ new Set();
          return flat.filter((link) => {
            if (!link || !link.url)
              return false;
            if (seen.has(link.url))
              return false;
            seen.add(link.url);
            return true;
          }).map((link) => {
            let title;
            if (mediaType === "tv") {
              title = `${mediaInfo.title} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
            } else if (mediaInfo.year) {
              title = `${mediaInfo.title} (${mediaInfo.year})`;
            } else {
              title = mediaInfo.title;
            }
            let quality = "Unknown";
            if (link.quality >= 2160)
              quality = "2160p";
            else if (link.quality >= 1440)
              quality = "1440p";
            else if (link.quality >= 1080)
              quality = "1080p";
            else if (link.quality >= 720)
              quality = "720p";
            else if (link.quality >= 480)
              quality = "480p";
            else if (link.quality >= 360)
              quality = "360p";
            const serverName = extractServerName(link.source);
            const formattedSize = formatBytes(link.size);
            const stream = {
              name: `XDmovies ${serverName}`,
              title: formatTitle(mediaInfo, serverName, quality, season, episode, formattedSize, metadata),
              url: link.url,
              quality,
              size: formattedSize,
              headers: link.headers,
              provider: "XDmovies"
            };
            return isLinkWorking(stream.url, stream.headers).then((working) => {
              return working ? stream : null;
            });
          });
        }).then((streamPromises) => {
          return Promise.all(streamPromises).then((finalStreams) => {
            return finalStreams.filter(Boolean);
          });
        });
      });
    });
  }).catch((err) => {
    console.error("[XDmovies] getStreams failed:", err.message);
    return [];
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
