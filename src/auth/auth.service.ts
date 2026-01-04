import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { SignupDTO } from './dto/signup.dto';
import { RedisService } from 'src/redis/redis.service';
import { SigninDTO } from './dto/signin.dto';
import type { Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import { clearSessionIdCookie, setSessionIdCookie } from './consts/auth';

@Injectable()
export class AuthService {
    private readonly SESSION_TTL = 60 * 60 * 24 * 2;
    private readonly MAX_SESSIONS = 5;
    private readonly MAX_RETRIES = 3;

    constructor(
        private readonly userService: UserService,
        private readonly redis: RedisService,
    ) {}

    async signup(dto: SignupDTO) {
        return this.userService.createUser(dto);
    }

    async signin(dto: SigninDTO, req: Request, res: Response) {
        const user = await this.userService.findByEmail(dto.email);
        if (!user) throw new UnauthorizedException('Неверная почта или пароль!');

        const passwordMatch = await bcrypt.compare(dto.password, user.password);
        if (!passwordMatch) throw new UnauthorizedException('Неверная почта или пароль!');

        const SESSIONS_SET_KEY = `user:sessions:${user.id}`;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            await this.redis.client.watch(SESSIONS_SET_KEY);

            try {
                const sessionsSet = await this.redis.client.sMembers(SESSIONS_SET_KEY);

                // чистим устаревшие сессии в SET
                for (const sessionId of sessionsSet) {
                    const exists = await this.redis.client.exists(`session:${sessionId}`);

                    if (!exists) {
                        await this.redis.client.sRem(SESSIONS_SET_KEY, sessionId);
                    }
                }
                // Получаем актуальное кол-во сессий
                const sessionsCount = await this.redis.client.sCard(SESSIONS_SET_KEY);
                if (sessionsCount >= this.MAX_SESSIONS) {
                    await this.redis.client.unwatch();
                    throw new UnauthorizedException('Превышен лимит одновременных сессий!');
                }

                const sessionId = crypto.randomUUID();
                const SESSION_HASH_KEY = `session:${sessionId}`;

                const tx = this.redis.client.multi();

                tx.hSet(SESSION_HASH_KEY, {
                    userId: user.id,
                    userAgent: req.headers['user-agent'] || 'unknown',
                    ip: req.ip || 'unknown',
                });
                tx.expire(SESSION_HASH_KEY, this.SESSION_TTL);
                tx.sAdd(SESSIONS_SET_KEY, sessionId);

                const execResult = await tx.exec();

                if (execResult !== null) {
                    res.cookie('sessionId', sessionId, setSessionIdCookie);

                    const { id, email, username } = user;

                    return { id, email, username };
                }
            } finally {
                await this.redis.client.unwatch();
            }
        }

        throw new ServiceUnavailableException('Не удалось создать сессию, попробуйте еще раз!');
    }

    async authMe(req: Request, res: Response) {
        const sessionId = req.cookies['sessionId'];
        if (!sessionId) throw new UnauthorizedException('Unauthorized!');

        const SESSION_HASH_KEY = `session:${sessionId}`;

        const userId = await this.redis.client.hGet(SESSION_HASH_KEY, 'userId');
        if (!userId) throw new UnauthorizedException('Unauthorized!');

        const user = await this.userService.findById(userId);
        if (!user) throw new UnauthorizedException('Unauthorized!');

        await this.redis.client.expire(SESSION_HASH_KEY, this.SESSION_TTL);

        res.cookie('sessionId', sessionId, setSessionIdCookie);

        const { id, email, username } = user;

        return { id, email, username };
    }

    async logout(req: Request, res: Response) {
        const sessionId = req.cookies['sessionId'];

        if (sessionId) {
            const SESSION_HASH_KEY = `session:${sessionId}`;
            const userId = await this.redis.client.hGet(SESSION_HASH_KEY, 'userId');
            const SESSIONS_SET_KEY = `user:sessions:${userId}`;

            await this.redis.client.del(SESSION_HASH_KEY);

            if (userId) {
                await this.redis.client.sRem(SESSIONS_SET_KEY, sessionId as string);
            }

            res.clearCookie('sessionId', clearSessionIdCookie);

            return {
                message: 'Success!',
            };
        } else {
            return {
                message: 'Success!',
            };
        }
    }
}
