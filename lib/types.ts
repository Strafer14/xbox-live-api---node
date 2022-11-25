type Nullable<T> = T | null;

export interface AuthResult {
  token: string;
  uhs: string;
  notAfter: string;
  cookies: string;
}

export interface PreAuthResult {
  url_post: string;
  ppft_re: string;
  cookies: string;
}

export interface AccessTokenResult {
  cookies: string;
  accessToken: string;
}

export interface GetAuthResult {
  cookies: string;
  authorizationHeader: string;
}

export interface AuthenticationResponse {
  NotAfter: string;
  Token: string;
  DisplayClaims: {
    xui: Array<{ uhs: string }>;
  };
}

export interface GetXuidResponse {
  profileUsers: Array<{
    id: string;
    hostId: string;
    settings: unknown[];
    isSponsoredUser: boolean;
  }>;
}

export interface PagingInfo {
  continuationToken: string;
  totalRecords?: number;
}

export interface Clip {
  gameClipId: string;
  state: string;
  datePublished: string;
  dateRecorded: string;
  lastModified: string;
  userCaption: string;
  type: string;
  durationInSeconds: number;
  scid: string;
  titleId: number;
  rating: number;
  ratingCount: number;
  views: number;
  titleData: string;
  systemProperties: string;
  savedByUser: boolean;
  achievementId: string;
  greatestMomentId: string;
  thumbnails: Array<{
    uri: string;
    fileSize: number;
    thumbnailType: string;
  }>;
  gameClipUris: Array<{
    uri: string;
    fileSize: number;
    uriType: string;
    expiration: string;
  }>;
  xuid: string;
  clipName: string;
  titleName: string;
  gameClipLocale: string;
  clipContentAttributes: string;
  deviceType: string;
  commentCount: number;
  likeCount: number;
  shareCount: number;
  partialViews: number;
}

export interface GetClipsResponse {
  gameClips: Clip[];
  pagingInfo: PagingInfo;
}

export interface ScreenShot {
  screenshotId: string;
  resolutionHeight: number;
  resolutionWidth: number;
  state: string;
  datePublished: string;
  dateTaken: string;
  lastModified: string;
  userCaption: string;
  type: string;
  scid: string;
  titleId: number;
  rating: number;
  ratingCount: number;
  views: number;
  titleData: string;
  systemProperties: string;
  savedByUser: boolean;
  achievementId: string;
  greatestMomentId: Nullable<string>;
  thumbnails: Array<{
    uri: string;
    fileSize: number;
    thumbnailType: string;
  }>;
  screenshotUris: Array<{
    uri: string;
    fileSize: number;
    uriType: string;
    expiration: string;
  }>;
  xuid: string;
  screenshotName: string;
  titleName: string;
  screenshotLocale: string;
  screenshotContentAttributes: string;
  deviceType: string;
}

export interface GetScreenshotsResponse {
  screenshots: ScreenShot[];
  pagingInfo: PagingInfo;
}

export interface Title {
  lastUnlock: string;
  titleId: number;
  serviceConfigId: string;
  titleType: string;
  platform: string;
  name: string;
  earnedAchievements: number;
  currentGamerscore: number;
  maxGamerscore: number;
}

export interface GetAchievementsReponse {
  titles: Title[];
  pagingInfo: PagingInfo;
}

export interface ActivityItem {
  achievementScid: string;
  achievementId: string;
  achievementType: string;
  achievementIcon: string;
  gamerscore: number;
  achievementName: string;
  achievementDescription: string;
  isSecret: boolean;
  hasAppAward: boolean;
  hasArtAward: boolean;
  contentImageUri: string;
  contentTitle: string;
  platform: string;
  titleId: string;
  activity: {
    numShares: number;
    numLikes: number;
    numComments: number;
    ugcCaption: Nullable<unknown>;
    achievementScid: string;
    achievementId: string;
    activityItemType: string;
    achievementType: string;
    userXuid: string;
    achievementIcon: string;
    authorType: string;
    gamerscore: number;
    date: string;
    achievementName: string;
    contentType: string;
    achievementDescription: string;
    titleId: string;
    isSecret: boolean;
    platform: string;
    sharedSourceUser: number;
    sandboxid: string;
    rarityCategory: string;
    userKey: Nullable<unknown>;
    rarityPercentage: number;
    scid: string;
    dateOverride: string;
    isMock: boolean;
    isUserPost: boolean;
    locator: string;
  };
  userImageUriMd: string;
  userImageUriXs: string;
  description: string;
  date: string;
  hasUgc: boolean;
  activityItemType: string;
  contentType: string;
  shortDescription: string;
  itemText: string;
  itemImage: string;
  shareRoot: string;
  feedItemId: string;
  itemRoot: string;
  hasLiked: boolean;
  authorInfo: {
    name: string;
    secondName: string;
    imageUrl: string;
    authorType: string;
    id: string;
  };
  gamertag: string;
  realName: string;
  displayName: string;
  userImageUri: string;
  userXuid: string;
}

export interface GetActivityResponse {
  activityItems: ActivityItem[];
  contToken: string;
  numItems: number;
  pollingIntervalSeconds: string;
  pollingToken: string;
}
