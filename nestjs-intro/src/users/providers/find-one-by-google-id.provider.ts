import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FindOneByGoogleIdProvider {
  constructor(
    /**
     * Inject usersRepository
     */
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  public async findOneByGoogleId(googleId: string) {
    return await this.usersRepository
      .createQueryBuilder('user')
      .addSelect(['user.password', 'user.googleId'])
      .where('user.googleId = :googleId', { googleId })
      .getOne();
  }
}
