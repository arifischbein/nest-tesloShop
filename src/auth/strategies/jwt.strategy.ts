import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { User } from "../entities/user.entity";
import { JwtPayload } from "../interfaces/jwt-payload.interface";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private configService: ConfigService
    ) {
        super({
            secretOrKey: configService.get('JWT_SECRET'),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
        })
    }

    //Este metodo se va a llamar si el jwt no expiró y si la firma del jwt hace match con el payload
    //Es para realizar validaciones personalizadas. Por ejemplo, que el usuario esté activo etc.
    async validate(payload: JwtPayload): Promise<User> {

        const { email } = payload;
        
        const user = await this.userRepository.findOne({
            where: { email: email }
        })

        if(!user) {
            throw new UnauthorizedException('Token not valid');
        }
        if(!user.isActive) {
            throw new UnauthorizedException('User is inactive. Talk with an admin');
        }

        return user;
    }
}