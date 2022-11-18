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
  pagingInfo: {
    continuationToken: string;
  };
}

export interface GetScreenshotsResponse {
  screenshots: any[];
  pagingInfo: {
    continuationToken: string;
  };
}
