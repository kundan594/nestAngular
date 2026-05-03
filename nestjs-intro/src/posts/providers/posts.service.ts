import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  RequestTimeoutException,
} from '@nestjs/common';
import { CreatePostDto } from '../dtos/create-post.dto';
import { Brackets, Repository } from 'typeorm';
import { Post } from '../post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MetaOption } from 'src/meta-options/meta-option.entity';
import { TagsService } from 'src/tags/providers/tags.service';
import { PatchPostDto } from '../dtos/patch-post.dto';
import { GetPostsDto } from '../dtos/get-post.dto';
import { PaginationProvider } from 'src/common/pagination/providers/pagination.provider';
import { Paginated } from 'src/common/pagination/interfaces/paginated.interface';
import { ActiveUserData } from 'src/auth/interfaces/active-user-data.interface';
import { CreatePostProvider } from './create-post.provider';
import { postStatus } from '../enums/postStatus.enum';

@Injectable()
export class PostsService {
  constructor(
    /**
     * Inject postsRepository
     */
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    /**
     * inject metaOptionsRepository
     */
    @InjectRepository(MetaOption)
    private readonly metaOptionsRepository: Repository<MetaOption>,
    /**
     * Inject TagsService
     */
    private readonly tagsService: TagsService,
    /**
     * Inject the paginationProvider
     */
    private readonly paginationProvider: PaginationProvider,
    /**
     * Inject createPostProvider
     */
    private readonly createPostProvider: CreatePostProvider,
  ) {}

  /**
   * Creating new posts
   */
  public async create(createPostDto: CreatePostDto, user: ActiveUserData) {
    return await this.createPostProvider.create(createPostDto, user);
  }

  public async findAll(
    postQuery: GetPostsDto,
    userId: string,
    viewer?: ActiveUserData,
  ): Promise<Paginated<Post>> {
    const queryBuilder = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.tags', 'tag')
      .leftJoinAndSelect('post.metaOptions', 'metaOptions')
      .orderBy('post.id', 'DESC');

    if (userId) {
      queryBuilder.where('author.id = :userId', { userId: Number(userId) });
    }

    if (postQuery.search) {
      queryBuilder.andWhere(
        '(LOWER(post.title) LIKE :search OR LOWER(COALESCE(post.content, \'\')) LIKE :search)',
        {
          search: `%${postQuery.search.toLowerCase()}%`,
        },
      );
    }

    if (postQuery.tagId) {
      queryBuilder.andWhere('tag.id = :tagId', { tagId: postQuery.tagId });
    }

    if (postQuery.postType) {
      queryBuilder.andWhere('post.postType = :postType', {
        postType: postQuery.postType,
      });
    }

    if (postQuery.featured !== undefined) {
      queryBuilder.andWhere('post.featured = :featured', {
        featured: postQuery.featured,
      });
    }

    if (postQuery.startDate) {
      queryBuilder.andWhere('post.publishOn >= :startDate', {
        startDate: postQuery.startDate,
      });
    }

    if (postQuery.endDate) {
      queryBuilder.andWhere('post.publishOn <= :endDate', {
        endDate: postQuery.endDate,
      });
    }

    if (viewer?.isAdmin) {
      if (postQuery.status) {
        queryBuilder.andWhere('post.status = :status', {
          status: postQuery.status,
        });
      }
    } else if (viewer?.sub) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('post.status = :publishedStatus', {
            publishedStatus: 'published',
          }).orWhere('author.id = :viewerId', {
            viewerId: viewer.sub,
          });
        }),
      );

      if (postQuery.status === postStatus.PUBLISHED) {
        queryBuilder.andWhere('post.status = :status', {
          status: postQuery.status,
        });
      } else if (postQuery.status && Number(userId) === viewer.sub) {
        queryBuilder.andWhere('post.status = :status', {
          status: postQuery.status,
        });
      }
    } else {
      queryBuilder.andWhere('post.status = :status', {
        status: postStatus.PUBLISHED,
      });
    }

    return this.paginationProvider.paginateQueryBuilder(
      {
        limit: postQuery.limit,
        page: postQuery.page,
      },
      queryBuilder,
    );
  }

  public async update(patchPostDto: PatchPostDto, user: ActiveUserData) {
    let tags = undefined;
    let post = undefined;

    // Find the Tags
    try {
      tags = await this.tagsService.findMultipleTags(patchPostDto.tags);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment please try later',
        {
          description: 'Error connecting to the database',
        },
      );
    }

    /**
     * If tags were not found
     * Need to be equal number of tags
     */
    if (!tags || tags.length !== patchPostDto.tags.length) {
      throw new BadRequestException(
        'Please check your tag Ids and ensure they are correct',
      );
    }

    // Find the Post
    try {
      // Returns null if the post does not exist
      post = await this.postsRepository.findOneBy({
        id: patchPostDto.id,
      });
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment please try later',
        {
          description: 'Error connecting to the database',
        },
      );
    }

    if (!post) {
      throw new BadRequestException('The post Id does not exist');
    }

    if (!user.isAdmin && post.author?.id !== user.sub) {
      throw new ForbiddenException(
        'You are not allowed to update a post you do not own',
      );
    }

    // Update the properties
    post.title = patchPostDto.title ?? post.title;
    post.content = patchPostDto.content ?? post.content;
    post.status = patchPostDto.status ?? post.status;
    post.postType = patchPostDto.postType ?? post.postType;
    post.slug = patchPostDto.slug ?? post.slug;
    post.featuredImageUrl =
      patchPostDto.featuredImageUrl ?? post.featuredImageUrl;
    post.publishOn = patchPostDto.publishOn ?? post.publishOn;

    // Assign the new tags
    post.tags = tags;

    // Save the post and return
    try {
      await this.postsRepository.save(post);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment please try later',
        {
          description: 'Error connecting to the database',
        },
      );
    }
    return post;
  }

  public async delete(id: number, user: ActiveUserData) {
    const post = await this.postsRepository.findOneBy({
      id,
    });

    if (!post) {
      throw new BadRequestException('The post Id does not exist');
    }

    if (!user.isAdmin && post.author?.id !== user.sub) {
      throw new ForbiddenException(
        'You are not allowed to delete a post you do not own',
      );
    }

    // Deleting the post
    await this.postsRepository.delete(id);
    // confirmation
    return { deleted: true, id };
  }
}
