import { EventEmitter } from "events";
import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

class MockRedis extends EventEmitter {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  private geoStore = new Map<string, Map<string, { lng: number; lat: number }>>();
  private hashStore = new Map<string, Map<string, string>>();

  constructor() {
    super();
    setTimeout(() => {
      this.emit("connect");
      logger.info("Mock Redis connected");
    }, 10);
  }

  async connect(): Promise<void> {
    return Promise.resolve();
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: any, ...args: any[]): Promise<"OK"> {
    let expiresAt: number | undefined;
    if (args[0] === "EX" && typeof args[1] === "number") {
      expiresAt = Date.now() + args[1] * 1000;
    } else if (args[0] === "EX" && typeof args[1] === "string") {
      expiresAt = Date.now() + parseInt(args[1], 10) * 1000;
    }
    this.store.set(key, { value: String(value), expiresAt });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (Array.isArray(key)) {
        for (const k of key) {
          if (this.store.delete(k)) count++;
          if (this.geoStore.delete(k)) count++;
          if (this.hashStore.delete(k)) count++;
        }
      } else {
        if (this.store.delete(key)) count++;
        if (this.geoStore.delete(key)) count++;
        if (this.hashStore.delete(key)) count++;
      }
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const nextVal = current ? parseInt(current, 10) + 1 : 1;
    await this.set(key, String(nextVal));
    return nextVal;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, item);
    return 1;
  }

  async geoadd(key: string, lng: number, lat: number, member: string): Promise<number> {
    if (!this.geoStore.has(key)) {
      this.geoStore.set(key, new Map());
    }
    const map = this.geoStore.get(key)!;
    const isNew = !map.has(member);
    map.set(member, { lng: Number(lng), lat: Number(lat) });
    return isNew ? 1 : 0;
  }

  async zrem(key: string, member: string): Promise<number> {
    const map = this.geoStore.get(key);
    if (!map) return 0;
    return map.delete(member) ? 1 : 0;
  }

  async georadius(key: string, lng: number, lat: number, radius: number, unit: string, ...args: any[]): Promise<string[]> {
    return this.geosearch(key, lng, lat, radius, unit);
  }

  async geosearch(key: string, lng: number, lat: number, radius: number, unit: string = "km"): Promise<string[]> {
    const map = this.geoStore.get(key);
    if (!map) return [];
    
    // Convert radius to km if meters specified
    const radiusKm = unit.toLowerCase() === "m" ? radius / 1000 : radius;

    const results: string[] = [];
    const R = 6371; // Earth radius in km
    const targetLat = Number(lat);
    const targetLng = Number(lng);

    for (const [member, loc] of map.entries()) {
      const dLat = ((loc.lat - targetLat) * Math.PI) / 180;
      const dLng = ((loc.lng - targetLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((targetLat * Math.PI) / 180) * Math.cos((loc.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      if (distKm <= radiusKm) {
        results.push(member);
      }
    }

    return results;
  }

  async hset(key: string, field: string | Record<string, any>, value?: any): Promise<number> {
    if (!this.hashStore.has(key)) {
      this.hashStore.set(key, new Map());
    }
    const map = this.hashStore.get(key)!;
    if (typeof field === "object" && field !== null) {
      let added = 0;
      for (const [f, v] of Object.entries(field)) {
        if (!map.has(f)) added++;
        map.set(f, String(v));
      }
      return added;
    } else if (typeof field === "string" && value !== undefined) {
      const isNew = !map.has(field);
      map.set(field, String(value));
      return isNew ? 1 : 0;
    }
    return 0;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const map = this.hashStore.get(key);
    if (!map) return {};
    const res: Record<string, string> = {};
    for (const [f, v] of map.entries()) {
      res[f] = v;
    }
    return res;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const map = this.hashStore.get(key);
    if (!map) return 0;
    let count = 0;
    for (const f of fields) {
      if (map.delete(f)) count++;
    }
    return count;
  }

  async ping(): Promise<"PONG"> {
    return "PONG";
  }

  async quit(): Promise<"OK"> {
    return "OK";
  }

  async call(command: string, ...args: any[]): Promise<any> {
    const cmdUpper = command.toUpperCase();
    if (cmdUpper === "GEOADD" && args.length >= 4) {
      const [key, lng, lat, member] = args;
      return this.geoadd(key, Number(lng), Number(lat), String(member));
    }
    if ((cmdUpper === "GEORADIUS" || cmdUpper === "GEOSEARCH") && args.length >= 4) {
      const [key, lng, lat, radius] = args;
      return this.geosearch(key, Number(lng), Number(lat), Number(radius), "km");
    }
    if (cmdUpper === "EXISTS" && args.length >= 1) {
      const key = args[0];
      return this.geoStore.has(key) || this.store.has(key) || this.hashStore.has(key) ? 1 : 0;
    }
    logger.debug(`MockRedis.call: ${command} with args: ${JSON.stringify(args)}`);
    return null;
  }
}

export const redis: any =
  env.NODE_ENV === "production"
    ? new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      })
    : new MockRedis();

if (env.NODE_ENV === "production") {
  redis.on("error", (err: any) => logger.error({ err }, "Redis error"));
  redis.on("connect", () => logger.info("Redis connected"));
}

export async function connectRedis(): Promise<void> {
  await redis.connect();
}
