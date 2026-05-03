import {
  Body,
  Controller,
  Delete,
  DefaultValuePipe,
  Get,
  Patch,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ActiveUser } from 'src/auth/decorators/active-user.decorator';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { AuthType } from 'src/auth/enums/auth-type.enum';
import { ActiveUserData } from 'src/auth/interfaces/active-user-data.interface';
import { CreateTagDto } from './dtos/create-tag.dto';
import { PatchTagDto } from './dtos/patch-tag.dto';
import { TagsService } from './providers/tags.service';

@Controller('tags')
export class TagsController {
  constructor(
    /**
     * Inject  tagsService
     */
    private readonly tagsService: TagsService,
  ) {}

  @Get()
  @Auth(AuthType.Bearer, AuthType.None)
  public findAll(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('includeDeleted') includeDeleted?: string,
    @ActiveUser() user?: ActiveUserData,
  ) {
    return this.tagsService.findAll(
      limit,
      page,
      user?.isAdmin && includeDeleted === 'true',
    );
  }

  @Post()
  public create(
    @Body() createTagDto: CreateTagDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tagsService.create(createTagDto, user);
  }

  @Patch()
  public update(
    @Body() patchTagDto: PatchTagDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tagsService.update(patchTagDto, user);
  }

  @Delete()
  public delete(
    @Query('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tagsService.delete(id, user);
  }

  @Delete('soft-delete')
  public softDelete(
    @Query('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tagsService.softRemove(id, user);
  }

  @Post('restore')
  public restore(
    @Query('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.tagsService.restore(id, user);
  }
}
