import axios from 'axios';
import querystring from 'querystring';
import url from 'url';
import { CacheKeys, xlaCache } from './cache';
import { AccessTokenResponse, AuthResponse, PreAuthResult } from './types';
import {
  convertToTimestamp,
  extractUrlPostAndPpftRe,
  parseCookies
} from './util';

const fetchPreAuthData = async (): Promise<PreAuthResult> => {
  // cache solution to store the tokens in cache
  const cacheUrlPost = await xlaCache.get<string>(CacheKeys.URL_POST);
  const cachePpftRe = await xlaCache.get<string>(CacheKeys.PPFT_RE);
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
  const { data: payload } = xruReq;
  const { urlPost, ppftRe } = extractUrlPostAndPpftRe(payload);
  await Promise.all([
    xlaCache.set('url_post', urlPost),
    xlaCache.set('ppft_re', ppftRe)
  ]);
  return { url_post: urlPost, ppft_re: ppftRe };
};

const fetchInitialAccessToken = async (): Promise<AccessTokenResponse> => {
  const cacheAccessToken = await xlaCache.get<string>(CacheKeys.ACCESS_TOKEN);
  const cacheCookies = await xlaCache.get<string>(CacheKeys.COOKIES);
  if (cacheAccessToken.isCached && cacheCookies.isCached) {
    const accessToken = cacheAccessToken.value as string;
    const cookies = cacheCookies.value as string;
    return { cookies, accessToken };
  } else {
    const { ppft_re: ppftRe, url_post: urlPost } = await fetchPreAuthData();
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
    const accessTokenResponse = await axios.post<string>(
      `https://login.live.com${path}`,
      querystring.stringify(postValues),
      { headers: { 'User-Agent': '' } }
    );
    if ([302, 200].includes(accessTokenResponse.status)) {
      const cookies = accessTokenResponse.headers['set-cookie'] ?? [];
      if (!cookies.length) {
        throw new Error(
          'Could not fight appropriate cookies from accessTokenResponse request'
        );
      }
      const stringifiedCookies = parseCookies(cookies);
      const accessToken =
        accessTokenResponse.headers.location?.match(/access_token=(.+?)&/)?.[1];
      if (!accessToken) {
        throw new Error('Could not get find location header');
      }
      await Promise.all([
        xlaCache.set('cookie', stringifiedCookies),
        xlaCache.set('access_token', accessToken)
      ]);
      return { cookies: stringifiedCookies, accessToken };
    } else {
      throw new Error('Could not get access token');
    }
  }
};

const authenticate = async (): Promise<AuthResponse> => {
  const cacheToken = await xlaCache.get<string>(CacheKeys.TOKEN);
  const cacheUhs = await xlaCache.get<string>(CacheKeys.UHS);
  const cacheNotAfter = await xlaCache.get<string>(CacheKeys.NOT_AFTER);
  if (cacheToken.isCached && cacheUhs.isCached && cacheNotAfter.isCached)
    return {
      token: cacheToken.value as string,
      uhs: cacheUhs.value as string,
      notAfter: cacheNotAfter.value as string
    };
  else {
    const { cookies, accessToken } = await fetchInitialAccessToken();
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
      headers: {
        Cookie: cookies
      }
    };
    const { data } = await axios.post(
      'https://user.auth.xboxlive.com/user/authenticate',
      payload,
      requestOptions
    );
    const notAfter = data.NotAfter;
    const token = data.Token;
    const uhs = data.DisplayClaims.xui[0].uhs;
    await Promise.all([
      xlaCache.set('notAfter', notAfter),
      xlaCache.set('token', token),
      xlaCache.set('uhs', uhs)
    ]);
    return { token, uhs, notAfter };
  }
};

export const getAuthorization = async (): Promise<string> => {
  const cacheNotAfter = await xlaCache.get<string>(CacheKeys.NOT_AFTER);
  const cacheAuthorizationHeader = await xlaCache.get<string>(
    CacheKeys.AUTHORIZATION_HEADER
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
    const { value: cookies } = await xlaCache.get<string>(CacheKeys.COOKIES);
    const payload = {
      RelyingParty: 'http://xboxlive.com',
      TokenType: 'JWT',
      Properties: {
        UserTokens: [token],
        SandboxId: 'RETAIL'
      }
    };
    const requestOptions = {
      headers: {
        Cookie: cookies
      }
    };
    const { data } = await axios.post(
      'https://xsts.auth.xboxlive.com/xsts/authorize',
      payload,
      requestOptions
    );
    uhs = data.DisplayClaims.xui[0].uhs;
    notAfter = data.NotAfter;
    token = data.Token;
    const authorizationHeader = `XBL3.0 x=${uhs};${token}`;

    await Promise.all([
      xlaCache.set(CacheKeys.NOT_AFTER, notAfter),
      xlaCache.set(CacheKeys.AUTHORIZATION_HEADER, authorizationHeader)
    ]);
    return authorizationHeader;
  }
};
