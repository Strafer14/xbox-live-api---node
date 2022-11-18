import Cache from 'async-disk-cache';

export const xlaCache = new Cache('xla-cache');

export enum CacheKeys {
  ACCESS_TOKEN = 'access_token',
  TOKEN = 'token',
  UHS = 'uhs',
  NOT_AFTER = 'notAfter',
  COOKIES = 'cookies',
  AUTHORIZATION_HEADER = 'authorizationHeader',
  URL_POST = 'url_post',
  PPFT_RE = 'ppft_re'
}
