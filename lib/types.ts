export interface AuthResponse {
  token: string;
  uhs: string;
  notAfter: string;
}

export interface PreAuthResult {
  url_post: string;
  ppft_re: string;
}
