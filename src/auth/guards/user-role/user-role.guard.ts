import { Reflector } from '@nestjs/core';
import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { User } from 'src/auth/entities/user.entity';
import { META_ROLES } from 'src/auth/decorators/role-protected.decorator';

@Injectable()
export class UserRoleGuard implements CanActivate {

  constructor(
    private readonly reflector: Reflector
  ) {

  }
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    const validRoles: string[] = this.reflector.get(META_ROLES, context.getHandler())

    //si no se le pasa un rol cuando se usa el guard, es porque puede entrar cualquier rol
    if ( !validRoles ) return true;
    if ( validRoles.length === 0 ) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as User;

    if(!user) {
      throw new BadRequestException('User not found');
    }

    for (const role of user.roles) {
      if(validRoles.includes(role)) {
        return true
      }
    }
    
    throw new ForbiddenException(`User ${user.fullName} needs valid role [${validRoles}]`)
  }
}
