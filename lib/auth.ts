import axios, { AxiosRequestConfig } from 'axios';
import querystring from 'querystring';
import url from 'url';
import { xlaCache } from './cache';
import { AuthResponse, PreAuthResult } from './types';
import {
  convertToTimestamp,
  extractUrlPostAndPpftRe,
  parseCookies
} from './util';

const fetchPreAuthData = async (): Promise<PreAuthResult> => {
  // cache solution to store the tokens in cache
  const cacheUrlPost = await xlaCache.get<string>('url_post');
  const cachePpftRe = await xlaCache.get<string>('ppft_re');
  if (cacheUrlPost.isCached && cachePpftRe.isCached) {
    const urlPost = cacheUrlPost.value as string;
    const ppftRe = cachePpftRe.value as string;
    return { url_post: urlPost, ppft_re: ppftRe };
  }
  const postValues = {
    client_id: '0000000048093EE3',
    redirect_uri: 'https://login.live.com/oauth20_desktop.srf',
    response_type: 'token',
    display: 'touch',
    scope: 'service::user.auth.xboxlive.com::MBI_SSL',
    locale: 'en'
  };
  const postValuesQueryParams = unescape(querystring.stringify(postValues));
  const options = {
    headers: {
      // without a capitalized Host header this part won't work properly (won't show redirect_uri needed for the next part)
      Host: 'login.live.com'
    }
  };
  const xruReq = await axios.get<string>(
    `https://login.live.com/oauth20_authorize.srf?${postValuesQueryParams}`,
    options
  );
  const cookies = xruReq.headers['set-cookie'] ?? [];
  const { data: payload } = xruReq;
  const { urlPost, ppftRe } = extractUrlPostAndPpftRe(payload);
  await Promise.all([
    xlaCache.set('cookie', parseCookies(cookies)),
    xlaCache.set('url_post', urlPost),
    xlaCache.set('ppft_re', ppftRe)
  ]);
  return { url_post: urlPost, ppft_re: ppftRe };
};

const fetchInitialAccessToken = async (): Promise<string> => {
  const cacheAccessToken = await xlaCache.get<string>('access_token');
  if (cacheAccessToken.isCached) {
    const accessToken = cacheAccessToken.value as string;
    return accessToken;
  } else {
    const { ppft_re: ppftRe, url_post: urlPost } = await fetchPreAuthData();
    const { value: cookie } = await xlaCache.get<string>('cookie');
    const postValues = {
      login: process.env.XBL_USERNAME,
      passwd: process.env.XBL_PASSWORD,
      PPFT: ppftRe,
      PPSX: 'Passpor',
      SI: 'Sign In',
      type: '11',
      NewUser: '1',
      LoginOptions: '1',
      i3: '36728',
      m1: '768',
      m2: '1184',
      m3: '0',
      i12: '1',
      i17: '0',
      i18: '__Login_Host|1'
    };
    // eslint-disable-next-line n/no-deprecated-api
    const { path } = url.parse(urlPost);
    if (!path) {
      throw new Error('No path found on query params');
    }

    const requestOptions: AxiosRequestConfig = {
      headers: {
        Cookie: cookie,
        'User-Agent': ''
      }
      // {
      //   Cookie: cookie,
      //   'Content-Type': 'application/x-www-form-urlencoded',
      //   'Content-Length': Buffer.byteLength(postValuesQueryParams, 'utf8')
      // }
    };
    const accessTokenResponse = await axios.post<string>(
      `https://login.live.com${path}`,
      querystring.stringify(postValues),
      requestOptions
    );
    if ([302, 200].includes(accessTokenResponse.status)) {
      const cookies = accessTokenResponse.headers['set-cookie'] ?? [];
      if (!cookies.length) {
        throw new Error(
          'Could not fight appropriate cookies from accessTokenResponse request'
        );
      }
      await xlaCache.set('cookie', parseCookies(cookies));
      const accessToken =
        accessTokenResponse.headers.location?.match(/access_token=(.+?)&/)?.[1];
      if (!accessToken) {
        throw new Error('Could not get find location header');
      }
      await xlaCache.set('access_token', accessToken);
      return accessToken;
    } else {
      throw new Error('Could not get access token');
    }
  }
};

const authenticate = async (): Promise<AuthResponse> => {
  let cookie;
  const cacheToken = await xlaCache.get<string>('token');
  const cacheUhs = await xlaCache.get<string>('uhs');
  const cacheNotAfter = await xlaCache.get<string>('notAfter');
  if (cacheToken.isCached && cacheUhs.isCached && cacheNotAfter.isCached)
    return {
      token: cacheToken.value as string,
      uhs: cacheUhs.value as string,
      notAfter: cacheNotAfter.value as string
    };
  else {
    const accessToken = await fetchInitialAccessToken();
    const cacheCookie = await xlaCache.get<string>('cookie');
    try {
      cookie = cacheCookie.value;
    } catch (err) {
      console.log('Failed to get cookie');
    }
    const payload = {
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT',
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: accessToken
      }
    };
    const requestOptions = {
      uri: 'https://user.auth.xboxlive.com' + '/user/authenticate',
      method: 'POST',
      resolveWithFullResponse: true,
      body: JSON.stringify(payload),
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(payload), 'utf8')
      }
    };
    const authentication = await axios(requestOptions);
    if (authentication.status !== 200)
      console.log('Authentication XBL statusCode: ', authentication.status);
    let str = authentication.data;
    try {
      str = JSON.parse(str);
    } catch (e) {
      console.error(e);
    }
    const notAfter = str.NotAfter;
    const token = str.Token;
    const uhs = str.DisplayClaims.xui[0].uhs;
    await xlaCache.set('notAfter', notAfter);
    await xlaCache.set('token', token);
    await xlaCache.set('uhs', uhs);
    return { token, uhs, notAfter };
  }
};

export const getAuthorization = async (): Promise<string> => {
  let cookie;
  const cacheNotAfter = await xlaCache.get<string>('notAfter');
  const cacheAuthorizationHeader = await xlaCache.get<string>(
    'authorizationHeader'
  );
  if (cacheNotAfter.isCached) {
    const notAfter = convertToTimestamp(cacheNotAfter.value as string);
    if (notAfter - 1000 < Math.floor(Date.now() / 1000)) {
      // restart the authentication proccess
      console.log('Refreshing Xbox tokens');
      await xlaCache.clear();
      await getAuthorization();
    }
  }
  if (cacheAuthorizationHeader.isCached) {
    return cacheAuthorizationHeader.value as string;
  } else {
    let { token, uhs, notAfter } = await authenticate();
    const cacheCookie = await xlaCache.get<string>('cookie');
    try {
      cookie = cacheCookie.value;
    } catch (err) {
      console.log('Failed to get cookie');
    }
    const payload = {
      RelyingParty: 'http://xboxlive.com',
      TokenType: 'JWT',
      Properties: {
        UserTokens: [token],
        SandboxId: 'RETAIL'
      }
    };
    const requestOptions = {
      uri: 'https://xsts.auth.xboxlive.com' + '/xsts/authorize',
      method: 'POST',
      body: JSON.stringify(payload),
      resolveWithFullResponse: true,
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(payload), 'utf8')
      }
    };
    const authorization = await axios(requestOptions);
    if (authorization.status !== 200)
      console.log('Authorization XBL statusCode: ', authorization.status);
    let str = authorization.data;
    try {
      str = JSON.parse(str);
    } catch (e) {
      console.error(e);
    }
    // xid = str.DisplayClaims.xui[0].xid;
    uhs = str.DisplayClaims.xui[0].uhs;
    notAfter = str.NotAfter;
    token = str.Token;
    const authorizationHeader = 'XBL3.0 x=' + uhs + ';' + token;

    await xlaCache.set('notAfter', notAfter);
    await xlaCache.set('authorizationHeader', authorizationHeader);
    return authorizationHeader;
  }
};
