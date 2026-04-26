import 'reflect-metadata';

import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { MetaOption } from 'src/meta-options/meta-option.entity';
import { Post } from 'src/posts/post.entity';
import { postStatus } from 'src/posts/enums/postStatus.enum';
import { postType } from 'src/posts/enums/postType.enum';
import { Tag } from 'src/tags/tag.entity';
import { Upload } from 'src/uploads/upload.entity';
import { fileTypes } from 'src/uploads/enums/file-types.enum';
import { User } from 'src/users/user.entity';

type SeedOptions = {
  batch: number;
  envFile?: string;
  posts: number;
  reset: boolean;
  tags: number;
  uploads: number;
  users: number;
};

const DEFAULTS: SeedOptions = {
  batch: 5000,
  posts: 1_000_000,
  reset: true,
  tags: 2500,
  uploads: 20000,
  users: 50000,
};

function parseArgs(argv: string[]): SeedOptions {
  const args = { ...DEFAULTS };

  for (const entry of argv) {
    if (!entry.startsWith('--')) {
      continue;
    }

    const [rawKey, rawValue] = entry.slice(2).split('=');
    const key = rawKey as keyof SeedOptions;
    const value = rawValue ?? 'true';

    if (key === 'reset') {
      args.reset = value === 'true';
      continue;
    }

    if (key === 'envFile') {
      args.envFile = value;
      continue;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid numeric argument for ${key}: ${value}`);
    }

    (args[key] as number) = parsed;
  }

  return args;
}

function resolveEnvFile(option?: string) {
  if (option) {
    return path.resolve(process.cwd(), option);
  }

  const env = process.env.NODE_ENV;
  const preferredFile = env ? `.env.${env}` : '.env.development';
  const preferredPath = path.resolve(process.cwd(), preferredFile);

  if (fs.existsSync(preferredPath)) {
    return preferredPath;
  }

  return path.resolve(process.cwd(), '.env');
}

function applyEnvFile(filePath: string) {
  const contents = fs.readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function createDataSource() {
  return new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    synchronize: process.env.DATABASE_SYNC === 'true',
    entities: [User, Post, Tag, MetaOption, Upload],
  });
}

function range(start: number, length: number) {
  return Array.from({ length }, (_, index) => start + index);
}

function randomEnumValue<T>(values: T[]): T {
  const index = Math.floor(Math.random() * values.length);
  return values[index];
}

function buildMetaValue(index: number) {
  return JSON.stringify({
    sidebarEnabled: index % 2 === 0,
    readingTime: Math.floor(Math.random() * 15) + 2,
    canonicalUrl: `https://load-test.example.com/posts/${index}`,
    heroVariant: ['split', 'editorial', 'feature'][index % 3],
  });
}

async function truncateTables(dataSource: DataSource) {
  await dataSource.query(
    'TRUNCATE TABLE "post_tags_tag", "meta_option", "post", "tag", "upload", "user" RESTART IDENTITY CASCADE',
  );
}

async function ensureSafeSeedTarget(
  dataSource: DataSource,
  options: SeedOptions,
) {
  const [userCount, tagCount, postCount, uploadCount, metaCount] =
    await Promise.all([
      dataSource.getRepository(User).count(),
      dataSource.getRepository(Tag).count(),
      dataSource.getRepository(Post).count(),
      dataSource.getRepository(Upload).count(),
      dataSource.getRepository(MetaOption).count(),
    ]);

  const hasExistingData =
    userCount > 0 || tagCount > 0 || postCount > 0 || uploadCount > 0 || metaCount > 0;

  if (hasExistingData && !options.reset) {
    throw new Error(
      'The database already contains data. Re-run with --reset=true to clear existing rows before seeding.',
    );
  }
}

async function seedTags(dataSource: DataSource, options: SeedOptions) {
  const tagRepository = dataSource.getRepository(Tag);

  for (let offset = 0; offset < options.tags; offset += options.batch) {
    const size = Math.min(options.batch, options.tags - offset);
    const rows = range(offset + 1, size).map((tagNumber) => ({
      name: `Load Test Tag ${tagNumber}`,
      slug: `load-test-tag-${tagNumber}`,
      description: faker.lorem.sentence(),
      schema: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        position: tagNumber,
      }),
      featuredImage: `https://picsum.photos/seed/tag-${tagNumber}/640/360`,
    }));

    await tagRepository.insert(rows);
    console.log(`Inserted tags: ${Math.min(offset + size, options.tags)}/${options.tags}`);
  }
}

async function seedUsers(dataSource: DataSource, options: SeedOptions) {
  const userRepository = dataSource.getRepository(User);
  const hashedPassword = await bcrypt.hash('LoadTest@123', 10);

  for (let offset = 0; offset < options.users; offset += options.batch) {
    const size = Math.min(options.batch, options.users - offset);
    const rows = range(offset + 1, size).map((userNumber) => ({
      firstName: userNumber === 1 ? 'Admin' : faker.person.firstName(),
      lastName: userNumber === 1 ? 'User' : faker.person.lastName(),
      email:
        userNumber === 1
          ? 'admin@nestjs.local'
          : `load.user.${String(userNumber).padStart(6, '0')}@example.com`,
      password: hashedPassword,
      isAdmin: userNumber === 1,
    }));

    await userRepository.insert(rows);
    console.log(`Inserted users: ${Math.min(offset + size, options.users)}/${options.users}`);
  }
}

async function seedUploads(dataSource: DataSource, options: SeedOptions) {
  const uploadRepository = dataSource.getRepository(Upload);

  for (let offset = 0; offset < options.uploads; offset += options.batch) {
    const size = Math.min(options.batch, options.uploads - offset);
    const rows = range(offset + 1, size).map((uploadNumber) => ({
      name: `load-image-${uploadNumber}.jpg`,
      path: `https://picsum.photos/seed/upload-${uploadNumber}/1280/720`,
      type: fileTypes.IMAGE,
      mime: 'image/jpeg',
      size: 250000 + (uploadNumber % 750000),
    }));

    await uploadRepository.insert(rows);
    console.log(
      `Inserted uploads: ${Math.min(offset + size, options.uploads)}/${options.uploads}`,
    );
  }
}

async function seedPosts(dataSource: DataSource, options: SeedOptions) {
  const postRepository = dataSource.getRepository(Post);
  const metaRepository = dataSource.getRepository(MetaOption);
  const statuses = Object.values(postStatus);
  const types = Object.values(postType);

  for (let offset = 0; offset < options.posts; offset += options.batch) {
    const size = Math.min(options.batch, options.posts - offset);
    const postRows = range(offset + 1, size).map((postNumber) => ({
      title: `Load Test Post ${postNumber}`,
      postType: randomEnumValue(types),
      slug: `load-test-post-${postNumber}`,
      status: randomEnumValue(statuses),
      content: faker.lorem.paragraphs({ min: 2, max: 6 }),
      schema: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        identifier: postNumber,
      }),
      featuredImageUrl: `https://picsum.photos/seed/post-${postNumber}/1280/720`,
      publishOn: new Date(Date.now() - postNumber * 60_000),
      authorId: ((postNumber - 1) % options.users) + 1,
    }));

    const insertedPosts = await postRepository.insert(postRows as any[]);
    const postIds = insertedPosts.identifiers.map(
      (identifier) => identifier.id as number,
    );

    const metaRows = postIds.map((postId, index) => ({
      metaValue: buildMetaValue(offset + index + 1),
      postId,
    }));

    await metaRepository.insert(metaRows as any[]);

    const tagLinks = postIds.flatMap((postId) => {
      const firstTag = ((postId - 1) % options.tags) + 1;
      const secondTag = ((postId + 6) % options.tags) + 1;

      return [
        { postId, tagId: firstTag },
        { postId, tagId: secondTag },
      ];
    });

    await dataSource
      .createQueryBuilder()
      .insert()
      .into('post_tags_tag')
      .values(tagLinks)
      .execute();

    console.log(`Inserted posts: ${Math.min(offset + size, options.posts)}/${options.posts}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const envFile = resolveEnvFile(options.envFile);

  if (!fs.existsSync(envFile)) {
    throw new Error(`Environment file not found: ${envFile}`);
  }

  applyEnvFile(envFile);

  const dataSource = createDataSource();

  console.log(`Using environment file: ${envFile}`);
  console.log(`Seeding with batch size ${options.batch}`);

  await dataSource.initialize();

  try {
    await ensureSafeSeedTarget(dataSource, options);

    if (options.reset) {
      console.log('Resetting existing tables');
      await truncateTables(dataSource);
    }

    await seedTags(dataSource, options);
    await seedUsers(dataSource, options);
    await seedUploads(dataSource, options);
    await seedPosts(dataSource, options);

    console.log('Load test data generation complete');
    console.log(`Users: ${options.users}`);
    console.log(`Tags: ${options.tags}`);
    console.log(`Uploads: ${options.uploads}`);
    console.log(`Posts: ${options.posts}`);
    console.log(`Meta options: ${options.posts}`);
    console.log(`Post/tag relations: ${options.posts * 2}`);
    console.log('Admin login: admin@nestjs.local / LoadTest@123');
    console.log('Default login password for seeded users: LoadTest@123');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
