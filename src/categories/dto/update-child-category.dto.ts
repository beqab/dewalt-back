import { PartialType } from '@nestjs/mapped-types';
import { CreateChildCategoryDto } from './create-child-category.dto';

export class UpdateChildCategoryDto extends PartialType(
  CreateChildCategoryDto,
) {}
