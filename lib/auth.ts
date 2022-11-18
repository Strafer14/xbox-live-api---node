import axios from 'axios';
import fetch from 'node-fetch';
import querystring from 'querystring';
import url from 'url';
import { CacheKeys, xlaCache } from './cache';
import {
  AccessTokenResult,
  AuthenticationResponse,
  AuthorizationResponse,
  AuthResult,
  PreAuthResult
} from './types';
import {
  convertToTimestamp,
  extractUrlPostAndPpftRe,
  parseCookies
} from './util';

const HOST = 'login.live.com';

const fetchPreAuthData = async (): Promise<PreAuthResult> => {
  // cache solution to store the tokens in cache
  const cacheUrlPost = await xlaCache.get<string>(CacheKeys.URL_POST);
  const cachePpftRe = await xlaCache.get<string>(CacheKeys.PPFT_RE);
  const cacheCookies = await xlaCache.get<string>(CacheKeys.COOKIES);
  if (cacheUrlPost.isCached && cachePpftRe.isCached && cacheCookies.isCached) {
    const urlPost = cacheUrlPost.value as string;
    const ppftRe = cachePpftRe.value as string;
    const cookies = cacheCookies.value as string;
    return { url_post: urlPost, ppft_re: ppftRe, cookies };
  }
  const postValues = {
    client_id: '0000000048093EE3',
    redirect_uri: `https://${HOST}/oauth20_desktop.srf`,
    response_type: 'token',
    display: 'touch',
    scope: 'service::user.auth.xboxlive.com::MBI_SSL',
    locale: 'en'
  };
  const postValuesQueryParams = unescape(querystring.stringify(postValues));
  const options = { headers: { Host: HOST } };
  const xruReq = await fetch(
    `https://${HOST}/oauth20_authorize.srf?${postValuesQueryParams}`,
    options
  );
  const { headers } = xruReq;
  const payload = await xruReq.text();
  const { urlPost, ppftRe } = extractUrlPostAndPpftRe(payload);
  const cookies = headers.get('set-cookie')?.split(', ') ?? [];
  const stringifiedCookies = parseCookies(cookies);
  await Promise.all([
    xlaCache.set(CacheKeys.URL_POST, urlPost),
    xlaCache.set(CacheKeys.PPFT_RE, ppftRe),
    xlaCache.set(CacheKeys.COOKIES, stringifiedCookies)
  ]);
  return { url_post: urlPost, ppft_re: ppftRe, cookies: stringifiedCookies };
};

const fetchInitialAccessToken = async (): Promise<AccessTokenResult> => {
  const cacheAccessToken = await xlaCache.get<string>(CacheKeys.ACCESS_TOKEN);
  const cacheCookies = await xlaCache.get<string>(CacheKeys.COOKIES);
  if (cacheAccessToken.isCached && cacheCookies.isCached) {
    const accessToken = cacheAccessToken.value as string;
    const cookies = cacheCookies.value as string;
    return { cookies, accessToken };
  } else {
    const {
      ppft_re: ppftRe,
      url_post: urlPost,
      cookies
    } = await fetchPreAuthData();
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
    const accessTokenResponse = await fetch(`https://${HOST}${path}`, {
      method: 'POST',
      body: querystring.stringify(postValues),
      headers: {
        Cookie: cookies,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    if ([302, 200].includes(accessTokenResponse.status)) {
      // if parsing empty array, returns empty string ''
      const stringifiedCookies = parseCookies(
        accessTokenResponse.headers.get('set-cookie')?.split(', ') ?? []
      );
      const accessToken =
        accessTokenResponse.url?.match(/access_token=(.+?)&/)?.[1];
      if (!accessToken) {
        throw new Error('Could not get find location header');
      }
      if (stringifiedCookies) {
        await xlaCache.set('cookie', stringifiedCookies);
      }
      await xlaCache.set('access_token', accessToken);
      return { cookies: stringifiedCookies || cookies, accessToken };
    } else {
      throw new Error('Could not get access token');
    }
  }
};

const authenticate = async (): Promise<AuthResult> => {
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
    const { data } = await axios.post<AuthenticationResponse>(
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
    const { data } = await axios.post<AuthorizationResponse>(
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
