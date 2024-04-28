import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user-dto';
import { LoginUserDto } from './dto/login-user.dto';

import * as bcrypt  from 'bcrypt'

@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>) {}
  
  async  create(createUserDto: CreateUserDto) {
    try {

      const {password, ...userData} = createUserDto;
      const user = this.userRepository.create( {
        ...userData,
        password: bcrypt.hashSync(password, 10)
      });
      await this.userRepository.save(user);
      delete user.password;
      return user;
    } catch(error) {
      this.handeDBError(error);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: {email: true, password: true}
    });

    if(!user) {
      throw new UnauthorizedException('Not valid credentials (email)')
    }
    
    if(!bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException('Not valid credentials (password)')
    }
    delete user.password;
    
    return user;
    //TODO: retornar el jwt
  }

  private handeDBError(error: any): never {
    if(error.code === '23505') {
      throw new BadRequestException(error.detail)
    }
    console.log(error);
    throw new InternalServerErrorException('Pleas check server logs')
  }

}
