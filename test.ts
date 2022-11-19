import * as dotenv from 'dotenv';
import * as xla from './lib/api';
dotenv.config();

xla
  .getXuid(process.env.XBL_USERNAME ?? '')
  .then(console.log)
  .catch(console.error);
