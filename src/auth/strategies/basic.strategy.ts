import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { BasicStrategy as Strategy } from 'passport-http';

import { AuthService } from '../auth.service';

@Injectable()
export class BasicStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    super();
    console.log('BasicStrategy constructor - authService:', this.authService);
  }

  async validate (username: string, pass: string): Promise<any> {
    console.log('BasicStrategy validate - authService:', this.authService);
    const user = this.authService.validateUser(username, pass);

    if (!user) {
      throw new UnauthorizedException();
    }

    const { password, ...result } = user;

    return result;
  }
}
