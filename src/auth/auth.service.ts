import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { SignupDTO } from './dto/signup.dto';

@Injectable()
export class AuthService {
    constructor(private readonly userService: UserService) {}

    async signup(dto: SignupDTO) {
        return this.userService.createUser(dto);
    }
}
