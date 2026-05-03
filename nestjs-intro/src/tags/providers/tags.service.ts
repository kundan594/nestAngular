import { In, Repository } from 'typeorm';
import { CreateTagDto } from '../dtos/create-tag.dto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Tag } from '../tag.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ActiveUserData } from 'src/auth/interfaces/active-user-data.interface';
import { PatchTagDto } from '../dtos/patch-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    /**
     * Inject tagsRepository
     */
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
  ) {}

  private ensureAdmin(user: ActiveUserData) {
    if (!user?.isAdmin) {
      throw new ForbiddenException('Only administrators can manage tags');
    }
  }

  public async create(createTagDto: CreateTagDto, user: ActiveUserData) {
    this.ensureAdmin(user);
    let tag = this.tagsRepository.create(createTagDto);
    return await this.tagsRepository.save(tag);
  }

  public async findAll(limit: number, page: number, includeDeleted = false) {
    const [tags, totalItems] = await this.tagsRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: {
        id: 'ASC',
      },
      withDeleted: includeDeleted,
    });

    return {
      data: tags,
      meta: {
        itemsPerPage: limit,
        totalItems,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    };
  }

  public async findMultipleTags(tags: number[]) {
    if (!tags?.length) {
      return [];
    }

    let results = await this.tagsRepository.find({
      where: {
        id: In(tags),
      },
    });

    return results;
  }

  public async delete(id: number, user: ActiveUserData) {
    this.ensureAdmin(user);

    const tag = await this.tagsRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!tag) {
      throw new BadRequestException('The tag Id does not exist');
    }

    await this.tagsRepository.delete(id);

    return {
      deleted: true,
      id,
    };
  }

  public async softRemove(id: number, user: ActiveUserData) {
    this.ensureAdmin(user);

    const tag = await this.tagsRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!tag) {
      throw new BadRequestException('The tag Id does not exist');
    }

    await this.tagsRepository.softDelete(id);

    return {
      softDeleted: true,
      id,
    };
  }

  public async update(patchTagDto: PatchTagDto, user: ActiveUserData) {
    this.ensureAdmin(user);

    const tag = await this.tagsRepository.findOne({
      where: { id: patchTagDto.id },
      withDeleted: true,
    });

    if (!tag) {
      throw new BadRequestException('The tag Id does not exist');
    }

    tag.name = patchTagDto.name ?? tag.name;
    tag.slug = patchTagDto.slug ?? tag.slug;
    tag.description = patchTagDto.description ?? tag.description;
    tag.schema = patchTagDto.schema ?? tag.schema;
    tag.featuredImage = patchTagDto.featuredImage ?? tag.featuredImage;

    return await this.tagsRepository.save(tag);
  }

  public async restore(id: number, user: ActiveUserData) {
    this.ensureAdmin(user);

    const tag = await this.tagsRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!tag) {
      throw new BadRequestException('The tag Id does not exist');
    }

    await this.tagsRepository.restore(id);

    return {
      restored: true,
      id,
    };
  }
}
