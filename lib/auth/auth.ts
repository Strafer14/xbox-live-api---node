import axios from 'axios';
import fetch from 'node-fetch';
import querystring from 'querystring';
import url from 'url';
import { CacheKeys, xlaCache } from '../cache';
import {
  AccessTokenResult,
  AuthenticationResponse,
  AuthResult,
  GetAuthResult,
  PreAuthResult
} from '../types';
import {
  convertToTimestamp,
  extractUrlPostAndPpftRe,
  generatePostValues,
  parseCookies
} from '../util';

const HOST = 'login.live.com';

const ONE_HOUR = 3600;

export const fetchPreAuthData = async (): Promise<PreAuthResult> => {
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

export const fetchInitialAccessToken = async (
  options: PreAuthResult
): Promise<AccessTokenResult> => {
  const cacheAccessToken = await xlaCache.get<string>(CacheKeys.ACCESS_TOKEN);
  const cacheCookies = await xlaCache.get<string>(CacheKeys.COOKIES);
  if (cacheAccessToken.isCached && cacheCookies.isCached) {
    const accessToken = cacheAccessToken.value as string;
    const cookies = cacheCookies.value as string;
    return { cookies, accessToken };
  } else {
    const { ppft_re: ppftRe, url_post: urlPost, cookies } = options;
    const postValues = generatePostValues(ppftRe);
    // eslint-disable-next-line n/no-deprecated-api
    const { path } = url.parse(urlPost);
    if (!path) {
      throw new Error('No path found on query params');
    }
    // TODO: figure out how to make this request work with axios
    const accessTokenResponse = await fetch(`https://${HOST}${path}`, {
      method: 'POST',
      body: querystring.stringify(postValues),
      headers: {
        Cookie: cookies,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    if ([302, 200].includes(accessTokenResponse.status)) {
      const accessToken =
        accessTokenResponse.url?.match(/access_token=(.+?)&/)?.[1];
      if (!accessToken) {
        throw new Error('Could not get find location header');
      }
      await xlaCache.set(CacheKeys.ACCESS_TOKEN, accessToken);
      return { cookies, accessToken };
    } else {
      throw new Error('Could not get access token');
    }
  }
};

export const authenticate = async (
  options: AccessTokenResult
): Promise<AuthResult> => {
  const cacheToken = await xlaCache.get<string>(CacheKeys.TOKEN);
  const cacheUhs = await xlaCache.get<string>(CacheKeys.UHS);
  const cacheNotAfter = await xlaCache.get<string>(CacheKeys.NOT_AFTER);
  const cacheCookies = await xlaCache.get<string>(CacheKeys.COOKIES);
  if (cacheToken.isCached && cacheUhs.isCached && cacheNotAfter.isCached)
    return {
      token: cacheToken.value as string,
      uhs: cacheUhs.value as string,
      notAfter: cacheNotAfter.value as string,
      cookies: cacheCookies.value as string
    };
  else {
    const { cookies, accessToken } = options;
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
    const userHash = data.DisplayClaims.xui[0].uhs;
    await Promise.all([
      xlaCache.set('notAfter', notAfter),
      xlaCache.set('token', token),
      xlaCache.set('uhs', userHash)
    ]);
    return { token, uhs: userHash, notAfter, cookies };
  }
};

export const authorize = async (
  options: AuthResult
): Promise<GetAuthResult> => {
  const cacheAuthorizationHeader = await xlaCache.get<string>(
    CacheKeys.AUTHORIZATION_HEADER
  );
  const cacheCookies = await xlaCache.get<string>(CacheKeys.COOKIES);
  if (cacheAuthorizationHeader.isCached && cacheCookies.isCached) {
    return {
      cookies: cacheCookies.value as string,
      authorizationHeader: cacheAuthorizationHeader.value as string
    };
  } else {
    let { token, uhs, notAfter, cookies } = options;
    const payload = {
      RelyingParty: 'http://xboxlive.com',
      TokenType: 'JWT',
      Properties: { UserTokens: [token], SandboxId: 'RETAIL' }
    };
    const requestOptions = { headers: { Cookie: cookies } };
    const { data } = await axios.post<AuthenticationResponse>(
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
    return { cookies, authorizationHeader };
  }
};

export const validateTokenStillValid = async (): Promise<void> => {
  const cacheNotAfter = await xlaCache.get<string>(CacheKeys.NOT_AFTER);
  if (cacheNotAfter.isCached) {
    const notAfterInSeconds = convertToTimestamp(cacheNotAfter.value as string);
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const isTokenAboutToExpire =
      notAfterInSeconds - currentTimeInSeconds < ONE_HOUR;
    if (isTokenAboutToExpire) {
      // restart the authentication proccess
      console.log('Refreshing Xbox tokens');
      await xlaCache.clear();
    }
  }
};
