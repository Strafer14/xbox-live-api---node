import axios, { AxiosError } from 'axios';
import { getAuthorization } from './auth';
import { xlaCache } from './cache';
import {
  Clip,
  GetClipsResponse,
  GetScreenshotsResponse,
  GetXuidResponse
} from './types';

const mockUserData = {
  id: '-1',
  hostId: '-1',
  settings: [],
  isSponsoredUser: false
};

/*
 * Exchanges a gamertag for Xbox Live xuid
 * @param string gamertag
 */
export async function getXuid(gamertag: string): Promise<string> {
  const cacheXuid = await xlaCache.get<string>(`xuidForGamertag-${gamertag}`);
  if (cacheXuid.isCached) {
    return cacheXuid.value as string;
  } else {
    const host = 'profile.xboxlive.com';
    const uri = `/users/gt(${encodeURIComponent(gamertag)})/profile/settings`;
    const data = await makeXliveRequest<GetXuidResponse>(host, uri);
    if (!data.profileUsers?.length) {
      data.profileUsers = [mockUserData];
      throw new Error(`Unable to pull origin user ${gamertag}`);
    }
    await xlaCache.set('xuidForGamertag-' + gamertag, data.profileUsers[0].id);
    return data.profileUsers[0].id;
  }
}

/*
 * Returns up to 200 GameDVR clips from Xbox Live
 * @param string gamertag
 */
export async function getClipsForGamer(
  gamertag: string,
  continueToken?: string
): Promise<GetClipsResponse> {
  const xuid = await getXuid(gamertag);
  if (parseInt(xuid) < 0)
    return {
      gameClips: [],
      pagingInfo: { continuationToken: '' }
    };

  const host = 'gameclipsmetadata.xboxlive.com';
  const uri = `/users/xuid(${xuid})/clips?maxItems=200&continuationToken=${
    continueToken ?? ''
  }`;
  const data = await makeXliveRequest<GetClipsResponse>(host, uri);
  return data;
}

/*
 * Returns clip info for a specific clip
 * @param string gamertag
 * @param string clipId ID of the clip to fetch details for
 */
export async function getDetailsForClip(
  gamertag: string,
  clipId: string
): Promise<Clip | undefined> {
  let clipData = await getClipsForGamer(gamertag);
  let continueToken = clipData.pagingInfo.continuationToken;
  let counter = 0;
  let foundClip;
  while (continueToken && !foundClip && counter < 10) {
    const { gameClips } = clipData;
    foundClip = gameClips.find((clipData) => clipData.gameClipId === clipId);
    if (foundClip) {
      break;
    }
    clipData = await getClipsForGamer(gamertag, continueToken);
    continueToken = clipData.pagingInfo.continuationToken;
    counter += 1;
  }
  return foundClip;
}

/*
 * Returns up to 200 screenshots from Xbox Live.
 * @param string gamertag
 */
export async function getScreenshotsForGamer(
  gamertag: string,
  continueToken?: string
): Promise<GetScreenshotsResponse> {
  const xuid = await getXuid(gamertag);
  if (parseInt(xuid) < 0) {
    return {
      screenshots: [],
      pagingInfo: { continuationToken: '' }
    };
  }

  const host = 'screenshotsmetadata.xboxlive.com';
  const uri = `/users/xuid(${xuid})/screenshots?maxItems=200&continueToken=${
    continueToken ?? ''
  }`;
  const data = await makeXliveRequest<GetScreenshotsResponse>(host, uri);
  return data;
}

/*
 * Performs requests, this is an internal method.
 */
const makeXliveRequest = async <T>(host: string, uri: string): Promise<T> => {
  const useragent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
  const { cookies, authorizationHeader } = await getAuthorization();
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
