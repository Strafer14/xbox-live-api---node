var cookie_parser = require("cookie");
var url = require("url");
var querystring = require("querystring");
var Cache = require("async-disk-cache");
var xlaCache = new Cache("xla-cache");
var xla = (exports = module.exports = {});
var rp = require("request-promise").defaults({ jar: true });

const convertToTimestamp = datetime => {
  const date = new Date(datetime);
  return Math.floor(date.getTime() / 1000);
};

const parseCookies = cookie => {
  let cookies = "",
    a_cookie;
  for (var i = 0; i < cookie.length; i++) {
    a_cookie = cookie_parser.parse(cookie[i]);
    const keys = Object.keys(a_cookie),
      desired_key = keys[0],
      desired_value = a_cookie[desired_key];
    cookies += desired_key + "=" + desired_value;

    if (i < cookie.length - 1) cookies += "; ";
  }
  return cookies;
};

const fetchPreAuthData = async () => {
  let url_post = null,
    ppft_re = null;
  // cache solution to store the tokens in cache
  const cacheUrlPost = await xlaCache.get("url_post"),
    cachePpftRe = await xlaCache.get("ppft_re");
  if (cacheUrlPost.value) url_post = cacheUrlPost.value;
  if (cachePpftRe.value) ppft_re = cachePpftRe.value;
  //   if (!url_post || !ppft_re) {
  if (true) {
    const post_vals = {
        client_id: "0000000048093EE3",
        redirect_uri: "https://login.live.com/oauth20_desktop.srf",
        response_type: "token",
        display: "touch",
        scope: "service::user.auth.xboxlive.com::MBI_SSL",
        locale: "en"
      },
      post_vals_qs = unescape(querystring.stringify(post_vals)),
      options = {
        uri:
          "https://login.live.com" + "/oauth20_authorize.srf?" + post_vals_qs,
        resolveWithFullResponse: true,
        headers: {
          host: "login.live.com"
        }
      };
    const xruReq = await rp(options),
      cookie = xruReq.headers["set-cookie"];
    xlaCache.set("cookie", parseCookies(cookie));
    let str = xruReq.body;
    url_post = str.match(/urlPost:'([A-Za-z0-9:\?_\-\.&\\/=]+)/)[1];
    ppft_re = str.match(/sFTTag:'.*value=\"(.*)\"\/>'/)[1];
    xlaCache.set("url_post", url_post);
    xlaCache.set("ppft_re", ppft_re);
    return { url_post: url_post, ppft_re: ppft_re };
  } else {
    return { url_post: url_post, ppft_re: ppft_re };
  }
};

const fetchInitialAccessToken = async () => {
  let access_token = null,
    url_post = null,
    ppft_re = null,
    parsed_url_post = null,
    cookie = null;

  const cacheAccessToken = await xlaCache.get("access_token");
  if (cacheAccessToken.value) {
    access_token = cacheAccessToken.value;
    return access_token;
  } else {
    const response = await fetchPreAuthData();
    ppft_re = response["ppft_re"];
    url_post = response["url_post"];
    const cacheCookie = await xlaCache.get("cookie");
    try {
      cookie = cacheCookie.value;
    } catch (err) {
      console.log("Failed to get cookie");
    }
    const post_vals = {
        login: xla.username,
        passwd: xla.password,
        PPFT: ppft_re,
        PPSX: "Passpor",
        SI: "Sign In",
        type: "11",
        NewUser: "1",
        LoginOptions: "1",
        i3: "36728",
        m1: "768",
        m2: "1184",
        m3: "0",
        i12: "1",
        i17: "0",
        i18: "__Login_Host|1"
      },
      post_vals_qs = querystring.stringify(post_vals);
    parsed_url_post = url.parse(url_post);

    const request_options = {
      uri: "https://login.live.com" + parsed_url_post["path"],
      method: "POST",
      resolveWithFullResponse: true,
      body: post_vals_qs,
      simple: false,
      headers: {
        Cookie: cookie,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(post_vals_qs, "utf8")
      }
    };
    const access_token_resp = await rp(request_options);
    if (
      access_token_resp.statusCode === 302 ||
      access_token_resp.statusCode === 200
    ) {
      cookie = access_token_resp.headers["set-cookie"];
      xlaCache.set("cookie", parseCookies(cookie));
      try {
        access_token = access_token_resp.headers.location.match(
          /access_token=(.+?)&/
        )[1];
        xlaCache.set("access_token", access_token);
        return access_token;
      } catch (err) {
        console.log(err);
        throw "Could not get find location header";
      }
    } else {
      throw "Could not get access token";
    }
  }
};

const authenticate = async () => {
  let access_token = "",
    token = "",
    uhs = "",
    notAfter = "",
    cookie = "";
  const cacheToken = await xlaCache.get("token"),
    cacheUhs = await xlaCache.get("uhs"),
    cacheNotAfter = await xlaCache.get("notAfter");
  if (cacheToken.value && cacheUhs.value && cacheNotAfter.value)
    return {
      token: cacheToken.value,
      uhs: cacheUhs.value,
      notAfter: cacheNotAfter.value
    };
  else {
    access_token = await fetchInitialAccessToken();
    const cacheCookie = await xlaCache.get("cookie");
    try {
      cookie = cacheCookie.value;
    } catch (err) {
      console.log("Failed to get cookie");
    }
    const payload = {
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT",
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: access_token
        }
      },
      request_options = {
        uri: "https://user.auth.xboxlive.com" + "/user/authenticate",
        method: "POST",
        resolveWithFullResponse: true,
        body: JSON.stringify(payload),
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(JSON.stringify(payload), "utf8")
        }
      };
    const authentication = await rp(request_options);
    if (authentication.statusCode != "200")
      console.log("Authentication XBL statusCode: ", authentication.statusCode);
    let str = authentication.body;
    try {
      str = JSON.parse(str);
    } catch (e) {
      return console.error(e);
    }
    notAfter = str.NotAfter;
    token = str.Token;
    uhs = str.DisplayClaims.xui[0].uhs;
    xlaCache.set("notAfter", notAfter);
    xlaCache.set("token", token);
    xlaCache.set("uhs", uhs);
    return { token: token, uhs: uhs, notAfter: notAfter };
  }
};

const getAuthorization = async () => {
  let cookie = "",
    xid = "",
    token = "",
    notAfter = "",
    authorizationHeader;
  const cacheNotAfter = await xlaCache.get("notAfter"),
    cacheAuthorizationHeader = await xlaCache.get("authorizationHeader");
  if (cacheNotAfter.value) {
    notAfter = convertToTimestamp(cacheNotAfter.value);
    if (notAfter - 1000 < Math.floor(Date.now() / 1000)) {
      // restart the authentication proccess
      console.log("Refreshing Xbox tokens");
      await xlaCache.clear();
      getAuthorization();
    }
  }
  if (cacheAuthorizationHeader.value) {
    return cacheAuthorizationHeader.value;
  } else {
    let { token, uhs, notAfter } = await authenticate();
    const cacheCookie = await xlaCache.get("cookie");
    try {
      cookie = cacheCookie.value;
    } catch (err) {
      console.log("Failed to get cookie");
    }
    const payload = {
        RelyingParty: "http://xboxlive.com",
        TokenType: "JWT",
        Properties: {
          UserTokens: [token],
          SandboxId: "RETAIL"
        }
      },
      request_options = {
        uri: "https://xsts.auth.xboxlive.com" + "/xsts/authorize",
        method: "POST",
        body: JSON.stringify(payload),
        resolveWithFullResponse: true,
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(JSON.stringify(payload), "utf8")
        }
      };
    const authorization = await rp(request_options);
    if (authorization.statusCode != "200")
      console.log("Authorization XBL statusCode: ", authorization.statusCode);
    let str = authorization.body;
    try {
      str = JSON.parse(str);
    } catch (e) {
      return console.error(e);
    }
    xid = str.DisplayClaims.xui[0].xid;
    uhs = str.DisplayClaims.xui[0].uhs;
    notAfter = str.NotAfter;
    token = str.Token;
    authorizationHeader = "XBL3.0 x=" + uhs + ";" + token;

    xlaCache.set("notAfter", notAfter);
    xlaCache.set("authorizationHeader", authorizationHeader);
    return authorizationHeader;
  }
};

/*
 * Exchanges a gamertag for Xbox Live xuid
 * @param string gamertag
 */
xla.getXuid = async gamertag => {
  const cacheXuid = await xlaCache.get("xuidForGamertag-" + gamertag);
  if (cacheXuid.value > 0) {
    return cacheXuid.value;
  } else {
    const host = "profile.xboxlive.com",
      uri = "/users/gt(" + encodeURIComponent(gamertag) + ")/profile/settings",
      data = await internalRequest(host, uri);
    if (!data.profileUsers || !data.profileUsers.length) {
      data.profileUsers = [{ id: -1 }];
      throw `Unable to pull origin user ${username}`;
    }
    xlaCache.set("xuidForGamertag-" + gamertag, data.profileUsers[0].id);
    return data.profileUsers[0].id;
  }
};

/*
 * Returns up to 200 GameDVR clips from Xbox Live
 * @param string gamertag
 */
xla.getClipsForGamer = async gamertag => {
  const xuid = await xla.getXuid(gamertag);
  if (xuid < 0)
    return {
      gameClips: [],
      pagingInfo: { continuationToken: null },
      noXuid: true
    };

  const host = "gameclipsmetadata.xboxlive.com",
    uri = "/users/xuid(" + xuid + ")/clips?maxItems=200",
    data = await internalRequest(host, uri);
  return data;
};

/*
 * Returns clip info for a specific clip
 * @param string gamertag
 * @param string clipId ID of the clip to fetch details for
 */
xla.getDetailsForClip = async (gamertag, clipId) => {
  const clipData = await xla.getClipsForGamer(gamertag, continueToken),
    continueToken = clipData.pagingInfo.continuationToken;
  for (clip of clipData.gameClips) if (clip.gameClipId == clipId) return clip;

  if (continueToken) xla.getClipsForGamer(gamertag, continueToken);
  else {
    return;
  }
};

/*
 * Returns up to 200 screenshots from Xbox Live.
 * @param string gamertag
 */
xla.getScreenshotsForGamer = async gamertag => {
  const xuid = await xla.getXuid(gamertag);
  if (xuid < 0) {
    return {
      screenshots: [],
      pagingInfo: { continuationToken: null },
      noXuid: true
    };
  }

  const host = "screenshotsmetadata.xboxlive.com",
    uri = "/users/xuid(" + xuid + ")/screenshots?maxItems=200",
    data = await internalRequest(host, uri);
  return data;
};

/*
 * Performs requests, this is an internal method.
 */
const internalRequest = async (host, uri) => {
  let cookie = "";
  const useragent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36";
  const authorizationHeader = await getAuthorization(),
    cacheCookie = await xlaCache.get("cookie");
  try {
    cookie = cacheCookie.value;
  } catch (err) {
    console.log("Failed to get cookie");
  }
  const request_options = {
    uri: "https://" + host + uri,
    resolveWithFullResponse: true,
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
      "x-xbl-contract-version": "2",
      "User-Agent":
        useragent +
        " Like SmartGlass/2.105.0415 CFNetwork/711.3.18 Darwin/14.0.0",
      Authorization: authorizationHeader
    }
  };
  const requestResults = await rp(request_options);
  if (requestResults.statusCode != "200")
    console.log(
      "Get Clips for Gamer XBL statusCode: ",
      requestResults.statusCode
    );
  let str = requestResults.body;
  try {
    str = JSON.parse(str);
  } catch (e) {
    return {
      gameClips: [],
      pagingInfo: { continuationToken: null },
      jsonParseFail: true
    };
  }
  return str;
};
