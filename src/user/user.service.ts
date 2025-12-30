import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDTO } from './dto/create-user.dto';
import bcrypt from 'bcryptjs';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}

    async createUser(dto: CreateUserDTO) {
        const hashed = await bcrypt.hash(dto.password, 10);

        try {
            return await this.prisma.user.create({
                data: {
                    email: dto.email,
                    username: dto.username,
                    password: hashed,
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                }
            });
        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError) {
                if (e.code === 'P2002') {
                    throw new ConflictException(
                        'Пользователь с такими данными уже существует! Попробуйте изменить никнейм или почту!',
                    );
                }
            }

            throw e;
        }
    }

    async findByEmail(email: string) {
        return await this.prisma.user.findUnique({
            where: { email },
        });
    }
}
