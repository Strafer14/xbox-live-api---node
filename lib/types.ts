export interface AuthResponse {
  token: string;
  uhs: string;
  notAfter: string;
}

export interface PreAuthResult {
  url_post: string;
  ppft_re: string;
}

export interface AccessTokenResponse {
  cookies: string;
  accessToken: string;
}
