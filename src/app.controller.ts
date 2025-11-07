import {
  Controller,
  Get,
  Request,
  Post,
  UseGuards,
  HttpStatus,
  Body,
  HttpCode,
  Inject,
} from '@nestjs/common';
import {
  LocalAuthGuard,
  AuthService,
  // JwtAuthGuard,
  BasicAuthGuard,
} from './auth';
import { User } from './users';
import { AppRequest } from './shared';

@Controller()
export class AppController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    console.log('AppController constructor - authService:', this.authService);
  }

  @Get(['', 'ping'])
  healthCheck () {
    return {
      statusCode: HttpStatus.OK,
      message: 'OK',
    };
  }

  @Post('api/auth/register')
  @HttpCode(HttpStatus.CREATED)
  // TODO ADD validation
  register (@Body() body: User) {
    console.log('Register endpoint called with:', body);
    console.log('AuthService:', this.authService);
    try {
      const result = this.authService.register(body);
      console.log('Register result:', result);
      return result;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('api/auth/login')
  async login (@Request() req: AppRequest) {
    const token = this.authService.login(req.user, 'basic');

    return token;
  }

  @UseGuards(BasicAuthGuard)
  @Get('api/profile')
  async getProfile (@Request() req: AppRequest) {
    return {
      user: req.user,
    };
  }
}
