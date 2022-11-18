import * as dotenv from 'dotenv';
import { getXuid } from './lib/api';
import { xlaCache } from './lib/cache';
dotenv.config();

xlaCache
  .clear()
  .then(() => {
    console.log('Cache cleared');
    getXuid('Ninja').then(console.log).catch(console.error);
  })
  .catch(console.error);
