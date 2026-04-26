import { CreateUserDto } from './../dtos/create-user.dto';
import { Repository } from 'typeorm';
import { GetUsersParamDto } from '../dtos/get-users-param.dto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  RequestTimeoutException,
  forwardRef,
} from '@nestjs/common';
import { User } from '../user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersCreateManyProvider } from './users-create-many.provider';
import { CreateManyUsersDto } from '../dtos/create-many-users.dto';
import { CreateUserProvider } from './create-user.provider';
import { FindOneUserByEmailProvider } from './find-one-user-by-email.provider';
import { FindOneByGoogleIdProvider } from './find-one-by-google-id.provider';
import { CreateGoogleUserProvider } from './create-google-user.provider';
import { GoogleUser } from '../interfaces/google-user.inerface';
import { PatchUserDto } from '../dtos/patch-user.dto';
import { ActiveUserData } from 'src/auth/interfaces/active-user-data.interface';
import { HashingProvider } from 'src/auth/providers/hashing.provider';

/**
 * Controller class for '/users' API endpoint
 */
@Injectable()
export class UsersService {
  constructor(
    /**
     * Injecting usersRepository
     */
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    /**
     * Inject UsersCreateMany provider
     */
    private readonly usersCreateManyProvider: UsersCreateManyProvider,
    /**
     * Inject Create Users Provider
     */
    private readonly createUserProvider: CreateUserProvider,

    /**
     * Inject findOneUserByEmailProvider
     */
    private readonly findOneUserByEmailProvider: FindOneUserByEmailProvider,

    /**
     * Inject findOneByGoogleIdProvider
     */
    private readonly findOneByGoogleIdProvider: FindOneByGoogleIdProvider,
    /**
     * Inject createGooogleUserProvider
     */
    private readonly createGooogleUserProvider: CreateGoogleUserProvider,

    /**
     * Inject hashingProvider
     */
    @Inject(forwardRef(() => HashingProvider))
    private readonly hashingProvider: HashingProvider,
  ) {}

  /**
   * Method to create a new user
   */
  public async createUser(createUserDto: CreateUserDto) {
    return await this.createUserProvider.createUser(createUserDto);
  }

  /**
   * Public method responsible for handling GET request for '/users' endpoint
   */
  public findAll(
    getUserParamDto: GetUsersParamDto,
    limit: number,
    page: number,
  ) {
    if (getUserParamDto.id) {
      return this.findOneById(getUserParamDto.id);
    }

    return this.usersRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: {
        id: 'ASC',
      },
    }).then(([users, totalItems]) => ({
      data: users,
      meta: {
        itemsPerPage: limit,
        totalItems,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    }));
  }

  /**
   * Public method used to find one user using the ID of the user
   */
  public async findOneById(id: number) {
    let user = undefined;

    try {
      user = await this.usersRepository.findOneBy({
        id,
      });
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment please try later',
        {
          description: 'Error connecting to the the datbase',
        },
      );
    }

    /**
     * Handle the user does not exist
     */
    if (!user) {
      throw new BadRequestException('The user id does not exist');
    }

    return user;
  }

  public async createMany(createManyUsersDto: CreateManyUsersDto) {
    return await this.usersCreateManyProvider.createMany(createManyUsersDto);
  }

  // Finds one user by email
  public async findOneByEmail(email: string) {
    return await this.findOneUserByEmailProvider.findOneByEmail(email);
  }

  public async findOneByGoogleId(googleId: string) {
    return await this.findOneByGoogleIdProvider.findOneByGoogleId(googleId);
  }

  public async createGoogleUser(googleUser: GoogleUser) {
    return await this.createGooogleUserProvider.createGoogleUser(googleUser);
  }

  public async updateUser(
    patchUserDto: PatchUserDto,
    activeUser: ActiveUserData,
  ) {
    const user = await this.findOneById(patchUserDto.id);

    if (!activeUser.isAdmin && activeUser.sub !== user.id) {
      throw new ForbiddenException(
        'You are not allowed to update another user profile',
      );
    }

    if (!activeUser.isAdmin) {
      delete patchUserDto.isAdmin;
    }

    if (patchUserDto.email && patchUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: patchUserDto.email },
      });

      if (existingUser && existingUser.id !== user.id) {
        throw new BadRequestException('This email address is already in use');
      }
    }

    user.firstName = patchUserDto.firstName ?? user.firstName;
    user.lastName = patchUserDto.lastName ?? user.lastName;
    user.email = patchUserDto.email ?? user.email;

    if (activeUser.isAdmin && typeof patchUserDto.isAdmin === 'boolean') {
      user.isAdmin = patchUserDto.isAdmin;
    }

    if (patchUserDto.password) {
      user.password = await this.hashingProvider.hashPassword(
        patchUserDto.password,
      );
    }

    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment please try later',
        {
          description: 'Error connecting to the database',
        },
      );
    }
  }

  public async deleteUser(id: number, activeUser: ActiveUserData) {
    const user = await this.findOneById(id);

    if (!activeUser.isAdmin && activeUser.sub !== user.id) {
      throw new ForbiddenException(
        'You are not allowed to delete another user account',
      );
    }

    await this.usersRepository.delete(id);

    return {
      deleted: true,
      id,
    };
  }
}
