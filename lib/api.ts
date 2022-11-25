import { xlaCache } from './cache';
import { makeXliveApiRequest } from './request';
import {
  Clip,
  GetAchievementsReponse,
  GetActivityResponse,
  GetClipsResponse,
  GetScreenshotsResponse,
  GetXuidResponse
} from './types';
import { XboxLiveSubdomain } from './xblHosts';

const mockUserData = {
  id: '-1',
  hostId: '-1',
  settings: [],
  isSponsoredUser: false
};

/*
 * Exchanges a gamertag for Xbox Live User Id (xuid)
 * @param string gamertag
 */
export async function getXuid(gamertag: string): Promise<string> {
  const cacheXuid = await xlaCache.get<string>(`xuidForGamertag-${gamertag}`);
  if (cacheXuid.isCached) {
    return cacheXuid.value as string;
  } else {
    const host = XboxLiveSubdomain.PROFILE;
    const uri = `/users/gt(${encodeURIComponent(gamertag)})/profile/settings`;
    const data = await makeXliveApiRequest<GetXuidResponse>(host, uri);
    if (!data.profileUsers?.length) {
      data.profileUsers = [mockUserData];
      throw new Error(`Could not find ${gamertag} in Xbox Live API`);
    }
    await xlaCache.set(`xuidForGamertag-${gamertag}`, data.profileUsers[0].id);
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
  const host = XboxLiveSubdomain.CLIPS;
  const uri = `/users/xuid(${xuid})/clips?maxItems=200&continuationToken=${
    continueToken ?? ''
  }`;
  const data = await makeXliveApiRequest<GetClipsResponse>(host, uri);
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
  const host = XboxLiveSubdomain.SCREEN_SHOT;
  const uri = `/users/xuid(${xuid})/screenshots?maxItems=200&continuationToken=${
    continueToken ?? ''
  }`;
  const data = await makeXliveApiRequest<GetScreenshotsResponse>(host, uri);
  return data;
}

/*
 * Returns achivements from Xbox Live.
 * @param string gamertag
 */
export async function getAchievementsForGamer(
  gamertag: string,
  continueToken?: string
): Promise<GetAchievementsReponse> {
  const xuid = await getXuid(gamertag);
  const host = XboxLiveSubdomain.ACHIVEMENTS;
  const uri = `/users/xuid(${xuid})/history/titles?&continuationToken=${
    continueToken ?? ''
  }`;
  const data = await makeXliveApiRequest<GetAchievementsReponse>(host, uri);
  return data;
}

/*
 * Returns player activity from Xbox Live.
 * @param string gamertag
 */
export async function getActivityForGamer(
  gamertag: string,
  continueToken?: string
): Promise<GetActivityResponse> {
  const xuid = await getXuid(gamertag);
  const host = XboxLiveSubdomain.AVTY;
  const uri = `/users/xuid(${xuid})/activity/History`;
  const data = await makeXliveApiRequest<GetActivityResponse>(host, uri);
  return data;
}
