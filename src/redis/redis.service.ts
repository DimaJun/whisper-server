import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private _client: RedisClientType;

    get client(): RedisClientType {
        if (!this._client) {
            throw new Error('Redis client not initialized');
        }
        return this._client;
    }

    async onModuleInit() {
        this._client = createClient({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: Number(process.env.REDIS_PORT) || 6379,
            },
        });

        this._client.on('error', (err) => console.error('Redis client error', err));

        await this._client.connect();
        console.log('Redis connected!');
    }

    async onModuleDestroy() {
        await this._client.close();
    }
}
