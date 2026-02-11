import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, FlattenMaps, Model, Types } from 'mongoose';
import { Product, ProductDocument } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { Brand } from '../categories/entities/brand.entity';
import {
  Category,
  CategoryDocument,
} from '../categories/entities/category.entity';
import { ChildCategory } from '../categories/entities/child-category.entity';
import { ProductSpec, ProductSpecDocument } from './entities';
import { LocalizedText } from '../categories/entities';

interface CategoryType extends Record<string, unknown> {
  _id: string;
  name: LocalizedText;
  slug: string;
}

type ProductType = ProductDocument & {
  brandId: CategoryType;
  categoryId: CategoryType;
  childCategoryId: CategoryType;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Brand.name) private brandModel: Model<Brand>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(ChildCategory.name)
    private childCategoryModel: Model<ChildCategory>,
  ) {}

  /**
   * Resolve slug to ID for brand, category, or child category
   * Returns the ID if it's already an ID, or resolves slug to ID
   */
  private async resolveIdFromSlugOrId(
    value: string,
    type: 'brand' | 'category' | 'childCategory',
  ): Promise<string | null> {
    // Check if it's already a valid ObjectId
    if (Types.ObjectId.isValid(value)) {
      return value;
    }

    // Otherwise, treat it as a slug and resolve it
    try {
      let doc: { _id: Types.ObjectId } | null = null;
      switch (type) {
        case 'brand':
          doc = await this.brandModel.findOne({ slug: value }).exec();
          break;
        case 'category':
          doc = await this.categoryModel.findOne({ slug: value }).exec();
          break;
        case 'childCategory':
          doc = await this.childCategoryModel.findOne({ slug: value }).exec();
          break;
      }
      return doc ? doc._id.toString() : null;
    } catch (error) {
      return null;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    filters?: {
      brandId?: string;
      brandSlug?: string; // Can be comma-separated for multiple brands
      categoryId?: string;
      categorySlug?: string;
      childCategoryId?: string;
      childCategorySlug?: string;
      inStock?: boolean;
      minPrice?: number;
      maxPrice?: number;
      search?: string;
      sort?: string;
    },
    language?: 'ka' | 'en',
  ): Promise<{
    data: (ProductDocument | Record<string, unknown>)[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const query: FilterQuery<ProductDocument> = {};

      // Resolve brand (ID or slug) - supports multiple brands
      if (filters?.brandId || filters?.brandSlug) {
        const brandValue = filters.brandId || filters.brandSlug;
        if (brandValue) {
          // Support comma-separated values for multiple brands
          const brandValues = brandValue
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);

          // Resolve all brand slugs/IDs to ObjectIds
          const brandIds = await Promise.all(
            brandValues.map((value) =>
              this.resolveIdFromSlugOrId(value, 'brand'),
            ),
          );

          // Filter out null values and convert to ObjectIds
          const validBrandIds = brandIds
            .filter((id): id is string => id !== null)
            .map((id) => new Types.ObjectId(id));

          if (validBrandIds.length > 0) {
            // Use $in for multiple brands, single ObjectId for one brand
            query.brandId =
              validBrandIds.length === 1
                ? validBrandIds[0]
                : { $in: validBrandIds };
          }
        }
      }

      // Resolve category (ID or slug)
      if (filters?.categoryId || filters?.categorySlug) {
        const categoryValue = filters.categoryId || filters.categorySlug;
        if (categoryValue) {
          const categoryId = await this.resolveIdFromSlugOrId(
            categoryValue,
            'category',
          );
          if (categoryId) {
            query.categoryId = new Types.ObjectId(categoryId);
          }
        }
      }

      // Resolve child category (ID or slug)
      if (filters?.childCategoryId || filters?.childCategorySlug) {
        const childCategoryValue =
          filters.childCategoryId || filters.childCategorySlug;
        if (childCategoryValue) {
          const childCategoryId = await this.resolveIdFromSlugOrId(
            childCategoryValue,
            'childCategory',
          );
          if (childCategoryId) {
            query.childCategoryId = new Types.ObjectId(childCategoryId);
          }
        }
      }

      if (filters?.inStock !== undefined) {
        query.inStock = filters.inStock;
      }

      if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
        query.price = { $gte: filters.minPrice, $lte: filters.maxPrice };
      }

      if (filters?.search) {
        // Escape special regex characters in search string
        const escapedSearch = filters.search.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        );
        query.$or = [
          { 'name.ka': { $regex: escapedSearch, $options: 'i' } },
          { 'name.en': { $regex: escapedSearch, $options: 'i' } },
          { code: { $regex: escapedSearch, $options: 'i' } },
        ];
      }

      // Determine sort order
      let sortOrder: Record<string, 1 | -1> = { createdAt: -1 }; // Default sort
      if (filters?.sort) {
        if (filters.sort === 'price-asc') {
          sortOrder = { price: 1 };
        } else if (filters.sort === 'price-desc') {
          sortOrder = { price: -1 };
        }
        // If sort is empty or invalid, use default (createdAt: -1)
      }

      const [data, total] = await Promise.all([
        this.productModel
          .find(query)
          .populate('brandId', 'name slug')
          .populate('categoryId', 'name slug')
          .populate('childCategoryId', 'name slug')
          .sort(sortOrder)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.productModel.countDocuments(query).exec(),
      ]);

      // Transform data based on language if provided

      const transformedData = language
        ? data.map((product: any) =>
            this.transformProductByLanguage(product, language),
          )
        : data;

      return {
        data: transformedData as (ProductDocument | Record<string, unknown>)[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.log(error, 'error');
      throw new BadRequestException('Failed to fetch products');
    }
  }

  async findById(
    id: string,
    language?: 'ka' | 'en',
  ): Promise<ProductDocument | Record<string, unknown>> {
    console.log(id, 'id', language, 'language');
    try {
      const product = await this.productModel
        .findById(id)
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .populate('childCategoryId', 'name slug')
        .lean()
        .exec();

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      if (language) {
        return this.transformProductByLanguage(product as any, language);
      }
      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch product');
    }
  }

  async findBySlug(slug: string): Promise<ProductDocument | null> {
    try {
      return await this.productModel
        .findOne({ slug })
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .populate('childCategoryId', 'name slug')
        .exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch product by slug');
    }
  }

  /**
   * Extract ID string from populated field (can be ObjectId, populated object, or string)
   */
  private extractIdFromPopulatedField(field: unknown): string | null {
    if (!field) {
      return null;
    }

    if (typeof field === 'string') {
      return field;
    }

    if (typeof field === 'object' && field !== null) {
      // Check if it's a populated object with _id
      if ('_id' in field) {
        const idValue = (field as { _id: unknown })._id;
        if (!idValue) {
          return null;
        }
        // Handle ObjectId instances properly
        if (
          typeof idValue === 'object' &&
          idValue !== null &&
          'toString' in idValue &&
          typeof (idValue as { toString: unknown }).toString === 'function'
        ) {
          return (idValue as { toString: () => string }).toString();
        }
        return String((idValue as { _id: unknown })._id);
      }

      // Check if it's an ObjectId instance with toString method
      if (
        'toString' in field &&
        typeof (field as { toString: unknown }).toString === 'function'
      ) {
        return (field as { toString: () => string }).toString();
      }
    }

    return null;
  }

  /**
   * Fetch products with common populate options
   */
  private async fetchProductsWithPopulate(
    query: FilterQuery<ProductDocument>,
    limit: number,
  ): Promise<FlattenMaps<ProductDocument>[]> {
    return this.productModel
      .find(query)
      .populate('brandId', 'name slug')
      .populate('categoryId', 'name slug')
      .populate('childCategoryId', 'name slug')
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Extract product IDs from lean product documents
   */
  private extractProductIds(
    products: FlattenMaps<ProductDocument>[],
  ): Types.ObjectId[] {
    return products
      .map((product) => {
        const id = product._id;
        if (!id) {
          return null;
        }
        // Handle ObjectId instances properly
        if (
          typeof id === 'object' &&
          id !== null &&
          'toString' in id &&
          typeof (id as { toString: unknown }).toString === 'function'
        ) {
          return new Types.ObjectId(
            (id as { toString: () => string }).toString(),
          );
        }
        return new Types.ObjectId(String((id as { _id: unknown })._id));
      })
      .filter((id): id is Types.ObjectId => id !== null);
  }

  async findSimilarProducts(
    productId: string,
    language?: 'ka' | 'en',
    minCount: number = 5,
    maxCount: number = 15,
  ): Promise<(ProductDocument | Record<string, unknown>)[]> {
    try {
      // Get the current product
      const currentProduct = await this.productModel
        .findById(productId)
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .populate('childCategoryId', 'name slug')
        .lean()
        .exec();

      if (!currentProduct) {
        return [];
      }

      const results: FlattenMaps<ProductDocument>[] = [];
      const excludeIds: Types.ObjectId[] = [new Types.ObjectId(productId)];

      // Priority 1: Same childCategoryId
      if (currentProduct.childCategoryId) {
        const childCategoryId = this.extractIdFromPopulatedField(
          currentProduct.childCategoryId,
        );

        if (childCategoryId) {
          const childCategoryProducts = await this.fetchProductsWithPopulate(
            {
              _id: { $nin: excludeIds },
              childCategoryId: new Types.ObjectId(childCategoryId),
            },
            maxCount,
          );

          results.push(...childCategoryProducts);
          excludeIds.push(...this.extractProductIds(childCategoryProducts));

          if (results.length >= maxCount) {
            return this.transformProductsByLanguage(
              results.slice(0, maxCount),
              language,
            );
          }
        }
      }

      // Priority 2: Same categoryId
      if (currentProduct.categoryId) {
        const categoryId = this.extractIdFromPopulatedField(
          currentProduct.categoryId,
        );

        if (categoryId) {
          const categoryProducts = await this.fetchProductsWithPopulate(
            {
              _id: { $nin: excludeIds },
              categoryId: new Types.ObjectId(categoryId),
            },
            maxCount - results.length,
          );

          results.push(...categoryProducts);
          excludeIds.push(...this.extractProductIds(categoryProducts));

          if (results.length >= maxCount) {
            return this.transformProductsByLanguage(
              results.slice(0, maxCount),
              language,
            );
          }
        }
      }

      // Priority 3: Similar name (extract keywords from product name)
      const productName =
        typeof currentProduct.name === 'object'
          ? currentProduct.name.en || currentProduct.name.ka
          : currentProduct.name;

      if (productName && results.length < minCount) {
        // Extract first word or key terms from product name
        const nameWords = productName
          .split(/\s+/)
          .filter((word) => word.length > 3)
          .slice(0, 2);

        if (nameWords.length > 0) {
          const nameQuery: FilterQuery<ProductDocument> = {
            _id: { $nin: excludeIds },
            $or: nameWords.map((word) => ({
              $or: [
                { 'name.ka': { $regex: word, $options: 'i' } },
                { 'name.en': { $regex: word, $options: 'i' } },
              ],
            })),
          };

          const similarNameProducts = await this.fetchProductsWithPopulate(
            nameQuery,
            maxCount - results.length,
          );

          results.push(...similarNameProducts);
        }
      }

      // If still not enough, get any products from same brand
      if (results.length < minCount && currentProduct.brandId) {
        const brandId = this.extractIdFromPopulatedField(
          currentProduct.brandId,
        );

        if (brandId) {
          const brandProducts = await this.fetchProductsWithPopulate(
            {
              _id: { $nin: excludeIds },
              brandId: new Types.ObjectId(brandId),
            },
            maxCount - results.length,
          );

          results.push(...brandProducts);
        }
      }

      // Return at least minCount, up to maxCount
      const finalResults = results.slice(0, maxCount);
      return this.transformProductsByLanguage(finalResults, language);
    } catch (error) {
      console.error('Error finding similar products:', error);
      return [];
    }
  }

  private transformProductsByLanguage(
    products: FlattenMaps<ProductDocument>[],
    language?: 'ka' | 'en',
  ): (ProductDocument | Record<string, unknown>)[] {
    if (!language) {
      return products as (ProductDocument | Record<string, unknown>)[];
    }

    return products.map((product) =>
      this.transformProductByLanguage(product as any, language),
    );
  }

  async create(createProductDto: CreateProductDto): Promise<ProductDocument> {
    try {
      // Validate brand exists
      const brand = await this.brandModel.findById(createProductDto.brandId);
      if (!brand) {
        throw new NotFoundException(
          `Brand with ID ${createProductDto.brandId} not found`,
        );
      }

      // Validate category exists
      const category = await this.categoryModel.findById(
        createProductDto.categoryId,
      );
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${createProductDto.categoryId} not found`,
        );
      }

      // Validate child category if provided
      if (createProductDto.childCategoryId) {
        const childCategory = await this.childCategoryModel.findById(
          createProductDto.childCategoryId,
        );
        if (!childCategory) {
          throw new NotFoundException(
            `Child Category with ID ${createProductDto.childCategoryId} not found`,
          );
        }
      }

      // Check if product with this code already exists
      const existingProductByCode = await this.productModel
        .findOne({ code: createProductDto.code })
        .exec();

      if (existingProductByCode) {
        throw new ConflictException(
          `Product with code ${createProductDto.code} already exists`,
        );
      }

      // Check if product with this slug already exists
      const existingProductBySlug = await this.productModel
        .findOne({ slug: createProductDto.slug })
        .exec();

      if (existingProductBySlug) {
        throw new ConflictException(
          `Product with slug ${createProductDto.slug} already exists`,
        );
      }

      return await this.productModel.create(createProductDto);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create product');
    }
  }

  async update(
    id: string,
    updateProductDto: CreateProductDto,
  ): Promise<ProductDocument> {
    try {
      const product = await this.productModel.findById(id).exec();

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Validate brand if being updated
      if (updateProductDto.brandId) {
        const brand = await this.brandModel.findById(updateProductDto.brandId);
        if (!brand) {
          throw new NotFoundException(
            `Brand with ID ${updateProductDto.brandId} not found`,
          );
        }
      }

      // Validate category if being updated
      if (updateProductDto.categoryId) {
        const category = await this.categoryModel.findById(
          updateProductDto.categoryId,
        );
        if (!category) {
          throw new NotFoundException(
            `Category with ID ${updateProductDto.categoryId} not found`,
          );
        }
      }

      // Validate child category if being updated
      if (updateProductDto.childCategoryId) {
        const childCategory = await this.childCategoryModel.findById(
          updateProductDto.childCategoryId,
        );
        if (!childCategory) {
          throw new NotFoundException(
            `Child Category with ID ${updateProductDto.childCategoryId} not found`,
          );
        }
      }

      // Check for code conflict (if code is being changed)
      if (updateProductDto.code && updateProductDto.code !== product.code) {
        const existingProductByCode = await this.productModel
          .findOne({ code: updateProductDto.code })
          .exec();

        if (existingProductByCode) {
          throw new ConflictException(
            `Product with code ${updateProductDto.code} already exists`,
          );
        }
      }

      // Check for slug conflict (if slug is being changed)
      if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
        const existingProductBySlug = await this.productModel
          .findOne({ slug: updateProductDto.slug })
          .exec();

        if (existingProductBySlug) {
          throw new ConflictException(
            `Product with slug ${updateProductDto.slug} already exists`,
          );
        }
      }

      const updatedProduct = await this.productModel
        .findByIdAndUpdate(id, updateProductDto, { new: true })
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .populate('childCategoryId', 'name slug')
        .exec();

      return updatedProduct!;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update product');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const product = await this.productModel.findByIdAndDelete(id).exec();

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete product');
    }
  }

  private transformCategoryByLanguage(
    category: FlattenMaps<{ name: LocalizedText; slug: string }>,
    language: 'ka' | 'en',
  ): { name: string; slug: string } {
    const transformed = { ...category } as Record<string, unknown>;
    transformed.name =
      category.name?.[language] || category.name?.en || category.name?.ka;
    transformed.slug = category.slug;
    return transformed as { name: string; slug: string };
  }

  /**
   * Transform product document to return localized strings based on language
   */

  private transformProductByLanguage(
    product: FlattenMaps<ProductType>,
    language: 'ka' | 'en',
  ): Record<string, unknown> {
    const transformed = { ...product } as Record<string, unknown>;

    // Transform name
    transformed.name =
      product.name?.[language] || product.name?.en || product.name?.ka;
    transformed.description =
      product.description?.[language] ||
      product.description?.en ||
      product.description?.ka;

    // Transform specs
    if (product?.specs && Array.isArray(product.specs)) {
      transformed.specs = product.specs.map((spec) => ({
        ...spec,
        label: spec.label[language] || spec.label.en || spec.label.ka,
        value: spec.value[language] || spec.value.en || spec.value.ka,
      }));
    }

    // Transform populated brandId
    // if (
    //   product?.brandId &&
    //   typeof product.brandId === 'object' &&
    //   (product.brandId as Record<string, unknown>).name
    // ) {
    //   const brandIdObj = product.brandId as Record<string, unknown>;
    //   const brandName = brandIdObj.name;
    //   transformed.brandId = {
    //     ...brandIdObj,
    //     name:
    //       typeof brandName === 'object'
    //         ? (brandName as { ka?: string; en?: string })[language] ||
    //           (brandName as { ka?: string; en?: string }).en ||
    //           (brandName as { ka?: string; en?: string }).ka
    //         : brandName,
    //   };
    // }

    transformed.brandId = this.transformCategoryByLanguage(
      product.brandId,
      language,
    );

    // Transform populated categoryId
    // if (
    //   product?.categoryId &&
    //   typeof product.categoryId === 'object' &&
    //   (product.categoryId as Record<string, unknown>).name
    // ) {
    //   const categoryIdObj = product.categoryId as Record<string, unknown>;
    //   const categoryName = categoryIdObj.name;
    //   transformed.categoryId = {
    //     ...categoryIdObj,
    //     name:
    //       typeof categoryName === 'object'
    //         ? (categoryName as { ka?: string; en?: string })[language] ||
    //           (categoryName as { ka?: string; en?: string }).en ||
    //           (categoryName as { ka?: string; en?: string }).ka
    //         : categoryName,
    //   };
    // }

    transformed.categoryId = this.transformCategoryByLanguage(
      product.categoryId,
      language,
    );

    // Transform populated childCategoryId
    // if (
    //   product?.childCategoryId &&
    //   typeof product.childCategoryId === 'object' &&
    //   (product.childCategoryId as Record<string, unknown>).name
    // ) {
    //   const childCategoryIdObj = product.childCategoryId as Record<
    //     string,
    //     unknown
    //   >;
    //   const childCategoryName = childCategoryIdObj.name;
    //   transformed.childCategoryId = {
    //     ...childCategoryIdObj,
    //     name:
    //       typeof childCategoryName === 'object'
    //         ? (childCategoryName as { ka?: string; en?: string })[language] ||
    //           (childCategoryName as { ka?: string; en?: string }).en ||
    //           (childCategoryName as { ka?: string; en?: string }).ka
    //         : childCategoryName,
    //   };
    // }

    transformed.childCategoryId = this.transformCategoryByLanguage(
      product.childCategoryId,
      language,
    );

    return transformed;
  }
}
