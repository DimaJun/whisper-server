import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDTO } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('/signup')
    @HttpCode(HttpStatus.OK)
    async signup(@Body() dto: SignupDTO) {
        return this.authService.signup(dto);
    }
}
