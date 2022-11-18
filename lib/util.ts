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
