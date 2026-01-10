import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Product, ProductDocument } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { Brand } from '../categories/entities/brand.entity';
import { Category } from '../categories/entities/category.entity';
import { ChildCategory } from '../categories/entities/child-category.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Brand.name) private brandModel: Model<Brand>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(ChildCategory.name)
    private childCategoryModel: Model<ChildCategory>,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    filters?: {
      brandId?: string;
      categoryId?: string;
      childCategoryId?: string;
      inStock?: boolean;
      minPrice?: number;
      maxPrice?: number;
      search?: string;
    },
  ): Promise<{
    data: ProductDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const query: FilterQuery<ProductDocument> = {};

      if (filters?.brandId) {
        query.brandId = new Types.ObjectId(filters.brandId);
      }

      if (filters?.categoryId) {
        query.categoryId = new Types.ObjectId(filters.categoryId);
      }

      if (filters?.childCategoryId) {
        query.childCategoryId = new Types.ObjectId(filters.childCategoryId);
      }

      if (filters?.inStock !== undefined) {
        query.inStock = filters.inStock;
      }

      if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
        query.price = { $gte: filters.minPrice, $lte: filters.maxPrice };
      }

      if (filters?.search) {
        query.$or = [
          { 'name.ka': { $regex: filters.search, $options: 'i' } },
          { 'name.en': { $regex: filters.search, $options: 'i' } },
          { code: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const [data, total] = await Promise.all([
        this.productModel
          .find(query)
          .populate('brandId', 'name slug')
          .populate('categoryId', 'name slug')
          .populate('childCategoryId', 'name slug')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.productModel.countDocuments(query).exec(),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch products');
    }
  }

  async findById(id: string): Promise<ProductDocument> {
    try {
      const product = await this.productModel
        .findById(id)
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .populate('childCategoryId', 'name slug')
        .exec();

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
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
}
