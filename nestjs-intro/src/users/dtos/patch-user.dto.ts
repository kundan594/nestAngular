import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PatchUserDto extends PartialType(CreateUserDto) {
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  id: number;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
