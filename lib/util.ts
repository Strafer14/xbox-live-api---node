import cookie_parser from 'cookie';

export const convertToTimestamp = (datetime: string): number => {
  const date = new Date(datetime);
  return Math.floor(date.getTime() / 1000);
};

export const parseCookies = (cookies: string[]): string => {
  return cookies.reduce((accumulator, cookie, index) => {
    const aCookie = cookie_parser.parse(cookie);
    const [[firstKey, firstValue]] = Object.entries(aCookie);
    accumulator += `${firstKey}=${firstValue}`;

    const isNotLast = index < cookies.length - 1;
    if (isNotLast) {
      accumulator += '; ';
    }
    return accumulator;
  }, '');
};

export const extractUrlPostAndPpftRe = (
  payload: string
): { urlPost: string; ppftRe: string } => {
  const urlPost =
    payload.match(/urlPost:'([A-Za-z0-9:\?_\-\.&\\/=]+)/)?.[1] ?? '';
  const ppftRe = payload.match(/sFTTag:'.*value=\"(.*)\"\/>'/)?.[1] ?? '';
  return { urlPost, ppftRe };
};

export const generatePostValues = (
  ppftRe: string
): {
  login?: string;
  passwd?: string;
  PPFT: string;
  PPSX: string;
  SI: string;
  type: string;
  NewUser: string;
  LoginOptions: string;
  i3: string;
  m1: string;
  m2: string;
  m3: string;
  i12: string;
  i17: string;
  i18: string;
} => {
  return {
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
};
