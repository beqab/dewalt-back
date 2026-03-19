import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FlattenMaps, HydratedDocument, Model, Types } from 'mongoose';
import {
  Brand,
  BrandDocument,
  Category,
  CategoryDocument,
  ChildCategory,
  ChildCategoryDocument,
} from './entities';
import { BrandCategoryChildGroup } from './entities/brand-category-child-group.entity';
import {
  CreateBrandDto,
  CreateCategoryDto,
  CreateChildCategoryDto,
  UpdateBrandDto,
  UpdateCategoryDto,
  UpdateChildCategoryDto,
} from './dto';
import type { LocalizedText } from './types/localized-text.interface';
import { TranslationHelperService } from '../translation/translationHelper.service';
import { FrontRevalidateService } from '../revalidate/front-revalidate.service';
import {
  FRONT_MENU_TAGS,
  FRONT_PRODUCTS_TAGS,
} from '../revalidate/front-cache-tags';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Brand.name) private brandModel: Model<BrandDocument>,
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(ChildCategory.name)
    private childCategoryModel: Model<ChildCategoryDocument>,
    @InjectModel(BrandCategoryChildGroup.name)
    private brandCategoryChildGroupModel: Model<BrandCategoryChildGroup>,
    private translationHelper: TranslationHelperService,
    private frontRevalidate: FrontRevalidateService,
  ) {}

  // ==================== BRAND METHODS ====================

  async findAllBrands(): Promise<
    {
      _id: FlattenMaps<unknown>;
      name: string;
      slug: string;
      createdAt: Date;
      updatedAt: Date;
    }[]
  > {
    try {
      let lang: 'ka' | 'en' = 'ka';
      try {
        lang = this.translationHelper.currentLanguage;
      } catch {
        lang = 'ka';
      }

      const translateName = (
        name: LocalizedText | null | undefined,
      ): string => {
        if (!name) return '';
        if (lang === 'ka' && name.ka) return name.ka;
        if (lang === 'en' && name.en) return name.en;
        return name.en || name.ka || '';
      };

      const brands = await this.brandModel
        .find()
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const getBrandPriority = (slug?: string | null) => {
        const value = (slug || '').toLowerCase();
        if (value.includes('dewalt')) return 0;
        if (value.includes('stanley')) return 1;
        return 2;
      };

      brands.sort((a, b) => {
        const priorityDiff =
          getBrandPriority(a.slug) - getBrandPriority(b.slug);
        if (priorityDiff !== 0) return priorityDiff;
        return 0;
      });

      return brands.map((brand) => ({
        _id: brand._id,
        name: translateName(brand.name as LocalizedText),
        slug: brand.slug,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
      }));
    } catch (error) {
      throw new BadRequestException('Failed to fetch brands');
    }
  }

  async findAllBrandsAdmin(): Promise<BrandDocument[]> {
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

      const created = await this.brandModel.create(createBrandDto);
      void this.frontRevalidate.revalidateTags(FRONT_MENU_TAGS);
      void this.frontRevalidate.revalidateTags(
        FRONT_PRODUCTS_TAGS as unknown as string[],
      );
      return created;
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

      void this.frontRevalidate.revalidateTags(FRONT_MENU_TAGS);
      void this.frontRevalidate.revalidateTags(
        FRONT_PRODUCTS_TAGS as unknown as string[],
      );
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

      // Remove brand reference from all child categories that have this brand
      await this.childCategoryModel
        .updateMany({ brandIds: id }, { $pull: { brandIds: id } })
        .exec();

      // Remove brand-category child group mappings for this brand
      await this.brandCategoryChildGroupModel
        .deleteMany({ brandId: id })
        .exec();

      const result = await this.brandModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      void this.frontRevalidate.revalidateTags(FRONT_MENU_TAGS);
      void this.frontRevalidate.revalidateTags(
        FRONT_PRODUCTS_TAGS as unknown as string[],
      );
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

          await this.brandCategoryChildGroupModel
            .deleteMany({
              categoryId: id,
              brandId: { $in: removedBrandIds },
            })
            .exec();
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
      // Remove categoryId reference from all child categories that have this categoryId
      await this.childCategoryModel
        .updateMany({ categoryId: id }, { $unset: { categoryId: '' } })
        .exec();

      // Remove brand-category child group mappings for this category
      await this.brandCategoryChildGroupModel
        .deleteMany({ categoryId: id })
        .exec();

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

  async setChildCategoryGroup(params: {
    brandId: string;
    categoryId: string;
    childCategoryIds: string[];
  }): Promise<HydratedDocument<BrandCategoryChildGroup>> {
    try {
      const { brandId, categoryId, childCategoryIds } = params;

      const [brand, category] = await Promise.all([
        this.brandModel.findById(brandId).exec(),
        this.categoryModel.findById(categoryId).exec(),
      ]);

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${brandId} not found`);
      }

      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }

      const uniqueIds = Array.from(
        new Set((childCategoryIds || []).filter(Boolean)),
      );

      if (uniqueIds.length > 0) {
        const existing = await this.childCategoryModel
          .find({ _id: { $in: uniqueIds } })
          .select('_id')
          .exec();

        if (existing.length !== uniqueIds.length) {
          const foundIds = existing.map((c) => String(c._id));
          const missingIds = uniqueIds.filter((id) => !foundIds.includes(id));
          throw new NotFoundException(
            `Child Category(s) with ID(s) ${missingIds.join(', ')} not found`,
          );
        }
      }

      const updated = await this.brandCategoryChildGroupModel
        .findOneAndUpdate(
          { brandId, categoryId },
          { $set: { childCategoryIds: uniqueIds } },
          { new: true, upsert: true },
        )
        .exec();

      if (!updated) {
        throw new BadRequestException(
          'Failed to update child category group for brand and category',
        );
      }

      void this.frontRevalidate.revalidateTags(FRONT_MENU_TAGS);

      return updated;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to update child category group for brand and category',
      );
    }
  }

  async findChildCategoriesByBrandAndCategory(
    brandId: string,
    categoryId: string,
  ): Promise<ChildCategoryDocument[]> {
    try {
      const group = await this.brandCategoryChildGroupModel
        .findOne({ brandId, categoryId })
        .lean()
        .exec();

      if (group && Array.isArray(group.childCategoryIds)) {
        const groupIds = Array.from(
          new Set(
            group.childCategoryIds
              .map((id) => {
                if (id instanceof Types.ObjectId) return id.toHexString();
                if (typeof id === 'string') return id;
                return null;
              })
              .filter((id): id is string => Boolean(id)),
          ),
        );

        if (groupIds.length === 0) {
          return [];
        }

        return await this.childCategoryModel
          .find({ _id: { $in: groupIds } })
          .populate('brandIds', 'name slug')
          .populate('categoryId', 'name slug')
          .sort({ createdAt: -1 })
          .exec();
      }

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

      void this.frontRevalidate.revalidateTags(FRONT_MENU_TAGS);
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

      void this.frontRevalidate.revalidateTags(FRONT_MENU_TAGS);
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

      await this.brandCategoryChildGroupModel
        .updateMany(
          { childCategoryIds: id },
          { $pull: { childCategoryIds: id } },
        )
        .exec();

      void this.frontRevalidate.revalidateTags(FRONT_MENU_TAGS);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete child category');
    }
  }

  // ==================== MENU DATA (BRAND + CATEGORY + CHILD CATEGORY) ====================

  /**
   * Returns menu data for header navigation.
   * Combines brands, categories and child categories into a single JSON response
   * and applies localization on the backend based on the requested language.
   */
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
  async getMenuData() {
    try {
      let lang: 'ka' | 'en' = 'ka';
      try {
        lang = this.translationHelper.currentLanguage;
      } catch {
        lang = 'ka';
      }

      const [brands, categories, childCategories, childCategoryGroups]: [
        any[],
        any[],
        any[],
        any[],
      ] = await Promise.all([
        this.brandModel.find().lean().exec(),
        this.categoryModel.find().lean().exec(),
        this.childCategoryModel.find().lean().exec(),
        this.brandCategoryChildGroupModel.find().lean().exec(),
      ]);

      const translateName = (
        name: LocalizedText | null | undefined,
      ): string => {
        if (!name) return '';
        if (lang === 'ka' && name.ka) return name.ka;
        if (lang === 'en' && name.en) return name.en;
        return name.en || name.ka || '';
      };

      type MenuSubCategory = {
        id: string;
        name: string;
        slug: string;
      };

      type MenuCategory = {
        id: string;
        name: string;
        slug: string;
        subCategories: MenuSubCategory[];
      };

      type MenuBrand = {
        id: string;
        name: string;
        slug: string;
        categories: MenuCategory[];
      };

      const childCategoryById = new Map(
        childCategories.map((child) => [String(child._id), child]),
      );
      const groupByKey = new Map<string, string[]>();
      for (const group of childCategoryGroups) {
        const key = `${String(group.brandId)}:${String(group.categoryId)}`;
        const ids = Array.isArray(group.childCategoryIds)
          ? group.childCategoryIds.map((id: unknown) => String(id))
          : [];
        groupByKey.set(key, ids);
      }

      const menuBrands: MenuBrand[] = brands.map((brand) => {
        const brandId = String(brand._id);

        const brandCategories = categories.filter((category) => {
          const categoryBrandIds = (category.brandIds || []).map((id) =>
            String(id),
          );
          return categoryBrandIds.includes(brandId);
        });

        const menuCategories: MenuCategory[] = brandCategories.map(
          (category) => {
            const categoryId = String(category._id);

            const groupKey = `${brandId}:${categoryId}`;
            const groupIds = groupByKey.get(groupKey);
            const relatedChildCategories = groupIds
              ? groupIds
                  .map((id): unknown => childCategoryById.get(id))
                  .filter((child): child is Record<string, unknown> =>
                    Boolean(child),
                  )
              : childCategories.filter((child) => {
                  const childBrandIds = (child.brandIds || []).map((id) =>
                    String(id),
                  );
                  const childCategoryId = child.categoryId
                    ? String(child.categoryId)
                    : null;

                  return (
                    childCategoryId === categoryId &&
                    childBrandIds.includes(brandId)
                  );
                });

            const subCategories: MenuSubCategory[] = relatedChildCategories.map(
              (child) => ({
                id: String(child._id),
                name: translateName(child.name as LocalizedText),
                slug: child.slug,
              }),
            );

            return {
              id: categoryId,
              name: translateName(category.name as LocalizedText),
              subCategories,
              slug: category.slug,
            };
          },
        );

        return {
          id: brandId,
          name: translateName(brand.name as LocalizedText),
          categories: menuCategories,
          slug: brand.slug,
        };
      });

      console.log(menuBrands, 'menuBrands+++ from getMenuData');
      return menuBrands;
    } catch (error) {
      throw new BadRequestException('Failed to fetch menu data');
    }
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
}
