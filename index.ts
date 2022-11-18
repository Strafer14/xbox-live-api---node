import * as dotenv from 'dotenv';
import { getDetailsForClip } from './lib/api';
dotenv.config();

const clipId = '271d86e5-8aec-430f-850b-70a49807d9b119';
getDetailsForClip('Ninja', clipId).then(console.log).catch(console.error);
