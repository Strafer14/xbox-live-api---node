import { GetAuthResult } from '../types';
import {
  authenticate,
  fetchInitialAccessToken,
  fetchPreAuthData,
  authorize,
  validateTokenStillValid
} from './auth';

// the flow is consecutive, with caching between each step
export async function fetchCookiesAndAuthorizationDetails(): Promise<GetAuthResult> {
  await validateTokenStillValid();
  const resultOne = await fetchPreAuthData();
  const initialAccessToken = await fetchInitialAccessToken(resultOne);
  const authenticationResult = await authenticate(initialAccessToken);
  const authorizationResult = await authorize(authenticationResult);
  return authorizationResult;
}
