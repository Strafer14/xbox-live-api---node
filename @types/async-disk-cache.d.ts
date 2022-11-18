// very partial type
declare module 'async-disk-cache' {
  interface Options {
    location: string;
    compression: boolean;
    supportBuffer: boolean;
    key: string;
  }

  interface CacheEntry<T> {
    isCached: boolean;
    key?: string;
    value?: T;
  }

  export default class Cache {
    constructor(key: string, options: Options = {});
    get<T>(key: string): Promise<CacheEntry<T>>;
    set(key: string, value: T): Promise<void>;
    clear(): Promise<void>;
    remove(key: string): Promise<void>;
  }
}
