import * as dotenv from 'dotenv';
import * as xla from './lib/api';
dotenv.config();

xla
  .getXuid(process.env.XBL_PLAYER_TO_SEARCH ?? '')
  .then(console.log)
  .catch(console.error);
