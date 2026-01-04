import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDTO } from './dto/signup.dto';
import { SigninDTO } from './dto/signin.dto';
import type { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('/signup')
    @HttpCode(HttpStatus.OK)
    async signup(@Body() dto: SignupDTO) {
        return this.authService.signup(dto);
    }

    @Post('/signin')
    @HttpCode(HttpStatus.OK)
    async signin(@Body() dto: SigninDTO, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
        return this.authService.signin(dto, req, res);
    }

    @Post('/me')
    @HttpCode(HttpStatus.OK)
    async authMe(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        return this.authService.authMe(req, res);
    }

    @Post('/logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        return this.authService.logout(req, res);
    }
}
