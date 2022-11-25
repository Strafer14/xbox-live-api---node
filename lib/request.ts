import axios, { AxiosError } from 'axios';
import { fetchCookiesAndAuthorizationDetails } from './auth/flow';

/*
 * Performs requests, this is an internal method.
 */
export const makeXliveApiRequest = async <T>(
  host: string,
  uri: string
): Promise<T> => {
  const useragent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
  const { cookies, authorizationHeader } =
    await fetchCookiesAndAuthorizationDetails();
  const requestOptions = {
    headers: {
      Cookie: cookies,
      'Content-Type': 'application/json',
      'x-xbl-contract-version': '2',
      'User-Agent': `${useragent} Like SmartGlass/2.105.0415 CFNetwork/711.3.18 Darwin/14.0.0`,
      Authorization: authorizationHeader
    }
  };
  try {
    const { data } = await axios.get<T>(
      `https://${host}${uri}`,
      requestOptions
    );
    return data;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.status === 429) {
      throw new Error('Rate limit');
    }
    if (axiosError.status === 404) {
      throw new Error('Player not found');
    }
    throw axiosError;
  }
};
