import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user-dto';
import { LoginUserDto } from './dto/login-user.dto';

import * as bcrypt  from 'bcrypt'
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService
  ) {}
  
  async create(createUserDto: CreateUserDto) {
    try {

      const {password, ...userData} = createUserDto;
      const user = this.userRepository.create( {
        ...userData,
        password: bcrypt.hashSync(password, 10)
      });
      await this.userRepository.save(user);
      delete user.password;
      return {
        ...user,
        token: this.getJwtToken({ id: user.id })
      };
    } catch(error) {
      this.handeDBError(error);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: {email: true, password: true, id: true}
    });

    if(!user) {
      throw new UnauthorizedException('Not valid credentials (email)')
    }
    
    if(!bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException('Not valid credentials (password)')
    }
    
    delete user.password;
    delete user.id;
    
    return {
      ...user,
      token: this.getJwtToken({ id: user.id })
    };
    //TODO: retornar el jwt
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;

  }

  private handeDBError(error: any): never {
    if(error.code === '23505') {
      throw new BadRequestException(error.detail)
    }
    console.log(error);
    throw new InternalServerErrorException('Pleas check server logs')
  }

}
