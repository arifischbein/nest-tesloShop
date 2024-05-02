import { ExecutionContext, InternalServerErrorException, createParamDecorator } from "@nestjs/common";

export const GetUser = createParamDecorator(
    (data, ctx: ExecutionContext) => {
        /*
            /El parametro data es lo que le podemos pasar cuando usamos el decorator -> @GetUser('name') -> data = name
            El context tiene acceso al request. 
            Es lo que necesito para acceder al usuario. En este caso el usuario lo devuelve el JwtStrategy
        */
    
            const request = ctx.switchToHttp().getRequest();
            const user = request.user;
            if( !user ) {
                throw new InternalServerErrorException('User not found (request)');
            }

            return user;
        
    }
);