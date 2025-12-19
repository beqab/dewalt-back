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
      // Remove brand reference from all categories that have this brand
      await this.categoryModel
        .updateMany({ brandIds: id }, { $pull: { brandIds: id } })
        .exec();

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
        .populate('brandIds', 'name slug')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch categories');
    }
  }

  async findCategoriesByBrand(brandId: string): Promise<CategoryDocument[]> {
    try {
      return await this.categoryModel
        .find({ brandIds: brandId })
        .populate('brandIds', 'name slug')
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
        .populate('brandIds', 'name slug')
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
      // Check if category with this slug already exists (slug must be unique globally)
      const existingCategory = await this.categoryModel
        .findOne({
          slug: createCategoryDto.slug,
        })
        .exec();

      if (existingCategory) {
        throw new ConflictException(
          `Category with slug ${createCategoryDto.slug} already exists`,
        );
      }

      // Verify brands exist if provided
      if (createCategoryDto.brandIds && createCategoryDto.brandIds.length > 0) {
        const brands = await this.brandModel
          .find({ _id: { $in: createCategoryDto.brandIds } })
          .exec();

        if (brands.length !== createCategoryDto.brandIds.length) {
          const foundIds = brands.map((b) => String(b._id));
          const missingIds = createCategoryDto.brandIds.filter(
            (id) => !foundIds.includes(id),
          );
          throw new NotFoundException(
            `Brand(s) with ID(s) ${missingIds.join(', ')} not found`,
          );
        }
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
      // Get current category to check for brand removals
      const currentCategory = await this.categoryModel.findById(id).exec();
      if (!currentCategory) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      const currentBrandIds = (currentCategory.brandIds || []).map(
        (brandId) => {
          // Handle ObjectId instances - they have toString method
          if (brandId && typeof brandId === 'object') {
            return (brandId as { toString(): string }).toString();
          }
          // Handle string IDs
          if (typeof brandId === 'string') {
            return brandId;
          }
          // Fallback - should not reach here in normal cases
          return String(brandId);
        },
      );

      // If brandIds are being updated
      if (updateCategoryDto.brandIds !== undefined) {
        // Verify new brandIds exist
        if (updateCategoryDto.brandIds.length > 0) {
          const brands = await this.brandModel
            .find({ _id: { $in: updateCategoryDto.brandIds } })
            .exec();

          if (brands.length !== updateCategoryDto.brandIds.length) {
            const foundIds = brands.map((b) => String(b._id));
            const missingIds = updateCategoryDto.brandIds.filter(
              (id) => !foundIds.includes(id),
            );
            throw new NotFoundException(
              `Brand(s) with ID(s) ${missingIds.join(', ')} not found`,
            );
          }
        }

        // Check which brands are being removed
        const newBrandIds = updateCategoryDto.brandIds.map((brandId) =>
          String(brandId),
        );
        const removedBrandIds = currentBrandIds.filter(
          (brandId) => !newBrandIds.includes(brandId),
        );

        // If brands are being removed, remove brand references from child categories
        // that have this categoryId and the removed brands
        if (removedBrandIds.length > 0) {
          for (const removedBrandId of removedBrandIds) {
            // Find child categories that have this categoryId and the removed brandId
            await this.childCategoryModel
              .updateMany(
                {
                  categoryId: id,
                  brandIds: removedBrandId,
                },
                {
                  $pull: { brandIds: removedBrandId },
                },
              )
              .exec();
          }
        }
      }

      const category = await this.categoryModel
        .findByIdAndUpdate(id, updateCategoryDto, { new: true })
        .populate('brandIds', 'name slug')
        .exec();

      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      return category;
    } catch (error) {
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
        .populate('brandIds', 'name slug')
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch child categories');
    }
  }

  async findChildCategoriesByBrandAndCategory(
    brandId: string,
    categoryId: string,
  ): Promise<ChildCategoryDocument[]> {
    try {
      return await this.childCategoryModel
        .find({ brandIds: brandId, categoryId })
        .populate('brandIds', 'name slug')
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch child categories by brand and category',
      );
    }
  }

  async findChildCategoryById(id: string): Promise<ChildCategoryDocument> {
    try {
      const childCategory = await this.childCategoryModel
        .findById(id)
        .populate('brandIds', 'name slug')
        .populate('categoryId', 'name slug')
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
      // Check if child category with this slug already exists (slug must be unique globally)
      const existingChildCategory = await this.childCategoryModel
        .findOne({
          slug: createChildCategoryDto.slug,
        })
        .exec();

      if (existingChildCategory) {
        throw new ConflictException(
          `Child category with slug ${createChildCategoryDto.slug} already exists`,
        );
      }

      // Verify brands exist if provided
      if (
        createChildCategoryDto.brandIds &&
        createChildCategoryDto.brandIds.length > 0
      ) {
        const brands = await this.brandModel
          .find({ _id: { $in: createChildCategoryDto.brandIds } })
          .exec();

        if (brands.length !== createChildCategoryDto.brandIds.length) {
          const foundIds = brands.map((b) => String(b._id));
          const missingIds = createChildCategoryDto.brandIds.filter(
            (id) => !foundIds.includes(id),
          );
          throw new NotFoundException(
            `Brand(s) with ID(s) ${missingIds.join(', ')} not found`,
          );
        }
      }

      // Verify category exists if provided
      if (createChildCategoryDto.categoryId) {
        const category = await this.categoryModel
          .findById(createChildCategoryDto.categoryId)
          .exec();
        if (!category) {
          throw new NotFoundException(
            `Category with ID ${createChildCategoryDto.categoryId} not found`,
          );
        }
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
      // If slug is being updated, check for conflicts (slug must be unique globally)
      if (updateChildCategoryDto.slug) {
        const existingChildCategory = await this.childCategoryModel
          .findOne({
            slug: updateChildCategoryDto.slug,
            _id: { $ne: id },
          })
          .exec();

        if (existingChildCategory) {
          throw new ConflictException(
            `Child category with slug ${updateChildCategoryDto.slug} already exists`,
          );
        }
      }

      // Verify brands exist if being updated
      if (
        updateChildCategoryDto.brandIds &&
        updateChildCategoryDto.brandIds.length > 0
      ) {
        const brands = await this.brandModel
          .find({ _id: { $in: updateChildCategoryDto.brandIds } })
          .exec();

        if (brands.length !== updateChildCategoryDto.brandIds.length) {
          const foundIds = brands.map((b) => String(b._id));
          const missingIds = updateChildCategoryDto.brandIds.filter(
            (id) => !foundIds.includes(id),
          );
          throw new NotFoundException(
            `Brand(s) with ID(s) ${missingIds.join(', ')} not found`,
          );
        }
      }

      // Verify category exists if being updated
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

      const childCategory = await this.childCategoryModel
        .findByIdAndUpdate(id, updateChildCategoryDto, { new: true })
        .populate('brandIds', 'name slug')
        .populate('categoryId', 'name slug')
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
