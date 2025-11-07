import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    super();
    console.log('LocalStrategy constructor - authService:', this.authService);
  }

  async validate (username: string, password: string): Promise<any> {
    console.log('LocalStrategy validate - authService:', this.authService);
    const user = this.authService.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
