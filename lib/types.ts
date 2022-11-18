export interface AuthResult {
  token: string;
  uhs: string;
  notAfter: string;
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

export interface AuthenticationResponse {
  NotAfter: string;
  Token: string;
  DisplayClaims: {
    xui: Array<{ uhs: string }>;
  };
}

export interface AuthorizationResponse {
  NotAfter: string;
  Token: string;
  DisplayClaims: {
    xui: Array<{ uhs: string }>;
  };
}
