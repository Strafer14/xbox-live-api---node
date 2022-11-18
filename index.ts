import * as dotenv from 'dotenv';
import { getXuid } from './lib/api';
dotenv.config();

getXuid('Ninja').then(console.log).catch(console.error);
