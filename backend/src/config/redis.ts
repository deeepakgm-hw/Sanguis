import { EventEmitter } from "events";
import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

class MockRedis extends EventEmitter {
  private store = new Map<string, { value: string; expiresAt?: number }>();

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
      // Keys might be passed as an array or separate parameters. Support both.
      if (Array.isArray(key)) {
        for (const k of key) {
          if (this.store.delete(k)) count++;
        }
      } else {
        if (this.store.delete(key)) {
          count++;
        }
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

  async ping(): Promise<"PONG"> {
    return "PONG";
  }

  async quit(): Promise<"OK"> {
    return "OK";
  }

  async call(command: string, ...args: any[]): Promise<any> {
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
