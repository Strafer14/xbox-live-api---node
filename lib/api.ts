import axios from 'axios';
import { getAuthorization } from './auth';
import { CacheKeys, xlaCache } from './cache';

/*
 * Exchanges a gamertag for Xbox Live xuid
 * @param string gamertag
 */
export async function getXuid(gamertag: string): Promise<number> {
  const cacheXuid = await xlaCache.get<number>(`xuidForGamertag-${gamertag}`);
  if (cacheXuid.isCached) {
    return cacheXuid.value as number;
  } else {
    const host = 'profile.xboxlive.com';
    const uri = `/users/gt(${encodeURIComponent(gamertag)})/profile/settings`;
    const data = await internalRequest(host, uri);
    if (!data.profileUsers?.length) {
      data.profileUsers = [{ id: -1 }];
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
): Promise<any> {
  const xuid = await getXuid(gamertag);
  if (xuid < 0)
    return {
      gameClips: [],
      pagingInfo: { continuationToken: null },
      noXuid: true
    };

  const host = 'gameclipsmetadata.xboxlive.com';
  const uri = `/users/xuid('${xuid}')/clips?maxItems=200`;
  const data = await internalRequest(host, uri);
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
): Promise<any> {
  const clipData = await getClipsForGamer(gamertag);
  const continueToken = clipData.pagingInfo.continuationToken;
  for (const clip of clipData.gameClips) {
    if (clip.gameClipId === clipId) return clip;
  }
  if (continueToken) {
    await getClipsForGamer(gamertag, continueToken);
  }
}

/*
 * Returns up to 200 screenshots from Xbox Live.
 * @param string gamertag
 */
export async function getScreenshotsForGamer(gamertag: string): Promise<any> {
  const xuid = await getXuid(gamertag);
  if (xuid < 0) {
    return {
      screenshots: [],
      pagingInfo: { continuationToken: null },
      noXuid: true
    };
  }

  const host = 'screenshotsmetadata.xboxlive.com';
  const uri = `/users/xuid('${xuid}')/screenshots?maxItems=200`;
  const data = await internalRequest(host, uri);
  return data;
}

/*
 * Performs requests, this is an internal method.
 */
const internalRequest = async (host: string, uri: string): Promise<any> => {
  const useragent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
  const authorizationHeader = await getAuthorization();
  const { value: cookies } = await xlaCache.get<string>(CacheKeys.COOKIES);
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
    const { data } = await axios.get(`https://${host}${uri}`, requestOptions);
    return data;
  } catch (error) {
    console.error('Failed to retreive data ', error);
    return {
      gameClips: [],
      pagingInfo: { continuationToken: null },
      jsonParseFail: true
    };
  }
};
