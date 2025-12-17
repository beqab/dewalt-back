import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import {
  Brand,
  BrandDocument,
  Category,
  CategoryDocument,
  ChildCategory,
  ChildCategoryDocument,
} from './entities';
import {
  CreateBrandDto,
  CreateCategoryDto,
  CreateChildCategoryDto,
  UpdateBrandDto,
  UpdateCategoryDto,
  UpdateChildCategoryDto,
} from './dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Brand.name) private brandModel: Model<BrandDocument>,
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(ChildCategory.name)
    private childCategoryModel: Model<ChildCategoryDocument>,
  ) {}

  // ==================== BRAND METHODS ====================

  async findAllBrands(): Promise<BrandDocument[]> {
    try {
      return await this.brandModel.find().sort({ createdAt: -1 }).exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch brands');
    }
  }

  async findBrandById(id: string): Promise<BrandDocument> {
    try {
      const brand = await this.brandModel.findById(id).exec();
      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }
      return brand;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch brand');
    }
  }

  async findBrandBySlug(slug: string): Promise<BrandDocument | null> {
    try {
      return await this.brandModel.findOne({ slug }).exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch brand by slug');
    }
  }

  async createBrand(createBrandDto: CreateBrandDto): Promise<BrandDocument> {
    try {
      // Check if brand with this slug already exists
      const existingBrand = await this.brandModel
        .findOne({ slug: createBrandDto.slug })
        .exec();

      if (existingBrand) {
        throw new ConflictException(
          `Brand with slug ${createBrandDto.slug} already exists`,
        );
      }

      return await this.brandModel.create(createBrandDto);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create brand');
    }
  }

  async updateBrand(
    id: string,
    updateBrandDto: UpdateBrandDto,
  ): Promise<BrandDocument> {
    try {
      // If slug is being updated, check for conflicts
      if (updateBrandDto.slug) {
        const existingBrand = await this.brandModel
          .findOne({ slug: updateBrandDto.slug, _id: { $ne: id } })
          .exec();

        if (existingBrand) {
          throw new ConflictException(
            `Brand with slug ${updateBrandDto.slug} already exists`,
          );
        }
      }

      const brand = await this.brandModel
        .findByIdAndUpdate(id, updateBrandDto, { new: true })
        .exec();

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      return brand;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update brand');
    }
  }

  async removeBrand(id: string): Promise<void> {
    try {
      // Check if brand has categories
      const categoriesCount = await this.categoryModel
        .countDocuments({ brandId: id })
        .exec();

      if (categoriesCount > 0) {
        throw new BadRequestException(
          'Cannot delete brand with existing categories',
        );
      }

      const result = await this.brandModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete brand');
    }
  }

  // ==================== CATEGORY METHODS ====================

  async findAllCategories(): Promise<CategoryDocument[]> {
    try {
      return await this.categoryModel
        .find()
        .populate('brandId', 'name slug')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch categories');
    }
  }

  async findCategoriesByBrand(brandId: string): Promise<CategoryDocument[]> {
    try {
      return await this.categoryModel
        .find({ brandId })
        .populate('brandId', 'name slug')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch categories by brand');
    }
  }

  async findCategoryById(id: string): Promise<CategoryDocument> {
    try {
      const category = await this.categoryModel
        .findById(id)
        .populate('brandId', 'name slug')
        .exec();

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      return category;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch category');
    }
  }

  async createCategory(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryDocument> {
    try {
      // Verify brand exists
      const brand = await this.brandModel
        .findById(createCategoryDto.brandId)
        .exec();
      if (!brand) {
        throw new NotFoundException(
          `Brand with ID ${createCategoryDto.brandId} not found`,
        );
      }

      // Check if category with this slug already exists for this brand
      const existingCategory = await this.categoryModel
        .findOne({
          slug: createCategoryDto.slug,
          brandId: createCategoryDto.brandId,
        })
        .exec();

      if (existingCategory) {
        throw new ConflictException(
          `Category with slug ${createCategoryDto.slug} already exists for this brand`,
        );
      }

      return await this.categoryModel.create(createCategoryDto);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create category');
    }
  }

  async updateCategory(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryDocument> {
    try {
      // If brandId is being updated, verify brand exists
      if (updateCategoryDto.brandId) {
        const brand = await this.brandModel
          .findById(updateCategoryDto.brandId)
          .exec();
        if (!brand) {
          throw new NotFoundException(
            `Brand with ID ${updateCategoryDto.brandId} not found`,
          );
        }
      }

      console.log(updateCategoryDto, 'updateCategoryDto++++++++');
      // Slug uniqueness is checked per brand in create, but we allow duplicates across different brands

      const category = await this.categoryModel
        .findByIdAndUpdate(id, updateCategoryDto, { new: true })
        .populate('brandId', 'name slug')
        .exec();

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      return category;
    } catch (error) {
      console.log(error, 'error++++++++');
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update category');
    }
  }

  async removeCategory(id: string): Promise<void> {
    try {
      // Check if category has child categories
      const childCategoriesCount = await this.childCategoryModel
        .countDocuments({ categoryId: id })
        .exec();

      if (childCategoriesCount > 0) {
        throw new BadRequestException(
          'Cannot delete category with existing child categories',
        );
      }

      const result = await this.categoryModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete category');
    }
  }

  // ==================== CHILD CATEGORY METHODS ====================

  async findAllChildCategories(): Promise<ChildCategoryDocument[]> {
    try {
      return await this.childCategoryModel
        .find()
        .populate('categoryId', 'name slug brandId')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch child categories');
    }
  }

  async findChildCategoriesByCategory(
    categoryId: string,
  ): Promise<ChildCategoryDocument[]> {
    try {
      return await this.childCategoryModel
        .find({ categoryId })
        .populate('categoryId', 'name slug brandId')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch child categories by category',
      );
    }
  }

  async findChildCategoryById(id: string): Promise<ChildCategoryDocument> {
    try {
      const childCategory = await this.childCategoryModel
        .findById(id)
        .populate('categoryId', 'name slug brandId')
        .exec();

      if (!childCategory) {
        throw new NotFoundException(`Child category with ID ${id} not found`);
      }

      return childCategory;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch child category');
    }
  }

  async createChildCategory(
    createChildCategoryDto: CreateChildCategoryDto,
  ): Promise<ChildCategoryDocument> {
    try {
      // Verify category exists
      const category = await this.categoryModel
        .findById(createChildCategoryDto.categoryId)
        .exec();
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${createChildCategoryDto.categoryId} not found`,
        );
      }

      // Check if child category with this slug already exists for this category
      const existingChildCategory = await this.childCategoryModel
        .findOne({
          slug: createChildCategoryDto.slug,
          categoryId: createChildCategoryDto.categoryId,
        })
        .exec();

      if (existingChildCategory) {
        throw new ConflictException(
          `Child category with slug ${createChildCategoryDto.slug} already exists for this category`,
        );
      }

      return await this.childCategoryModel.create(createChildCategoryDto);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create child category');
    }
  }

  async updateChildCategory(
    id: string,
    updateChildCategoryDto: UpdateChildCategoryDto,
  ): Promise<ChildCategoryDocument> {
    try {
      // If categoryId is being updated, verify category exists
      if (updateChildCategoryDto.categoryId) {
        const category = await this.categoryModel
          .findById(updateChildCategoryDto.categoryId)
          .exec();
        if (!category) {
          throw new NotFoundException(
            `Category with ID ${updateChildCategoryDto.categoryId} not found`,
          );
        }
      }

      // If slug is being updated, check for conflicts
      if (updateChildCategoryDto.slug) {
        const categoryId = updateChildCategoryDto.categoryId || undefined;
        const query: {
          slug: string;
          _id: { $ne: string };
          categoryId?: string | ObjectId;
        } = {
          slug: updateChildCategoryDto.slug,
          _id: { $ne: id },
        };
        if (categoryId) {
          query.categoryId = categoryId;
        } else {
          // If categoryId not in update, get current child category's categoryId
          const currentChildCategory = await this.childCategoryModel
            .findById(id)
            .exec();
          if (currentChildCategory) {
            query.categoryId = currentChildCategory.categoryId;
          }
        }

        const existingChildCategory = await this.childCategoryModel
          .findOne(query)
          .exec();

        if (existingChildCategory) {
          throw new ConflictException(
            `Child category with slug ${updateChildCategoryDto.slug} already exists for this category`,
          );
        }
      }

      const childCategory = await this.childCategoryModel
        .findByIdAndUpdate(id, updateChildCategoryDto, { new: true })
        .populate('categoryId', 'name slug brandId')
        .exec();

      if (!childCategory) {
        throw new NotFoundException(`Child category with ID ${id} not found`);
      }

      return childCategory;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update child category');
    }
  }

  async removeChildCategory(id: string): Promise<void> {
    try {
      const result = await this.childCategoryModel.findByIdAndDelete(id).exec();

      if (!result) {
        throw new NotFoundException(`Child category with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete child category');
    }
  }
}
