import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  HomepageBrandSliderDto,
  ProductPublicResponseDto,
  ProductResponseDto,
} from './dto';
import { AdminAuthGuard } from '../guards/admin.guard';
import { ProductDocument } from './entities';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('homepage/brand-sliders')
  @ApiOperation({
    summary:
      'Get homepage brand sliders (public, translated via x-custom-lang)',
  })
  @ApiQuery({
    name: 'brandLimit',
    required: false,
    type: Number,
    description: 'How many brands to include (default: 3)',
  })
  @ApiQuery({
    name: 'productsLimit',
    required: false,
    type: Number,
    description: 'How many products per brand (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Homepage brand sliders retrieved successfully',
    type: [HomepageBrandSliderDto],
  })
  getHomepageBrandSliders(
    @Query('brandLimit') brandLimit?: string,
    @Query('productsLimit') productsLimit?: string,
  ) {
    const brandLimitNum = brandLimit ? parseInt(String(brandLimit), 10) : 3;
    const productsLimitNum = productsLimit
      ? parseInt(String(productsLimit), 10)
      : 10;

    return this.productsService.getHomepageBrandSliders({
      brandLimit: Number.isFinite(brandLimitNum) ? brandLimitNum : 3,
      productsLimit: Number.isFinite(productsLimitNum) ? productsLimitNum : 10,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all products (public endpoint)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    type: String,
    description: 'Filter by brand ID',
  })
  @ApiQuery({
    name: 'brandSlug',
    required: false,
    type: String,
    description: 'Filter by brand slug',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filter by category ID',
  })
  @ApiQuery({
    name: 'categorySlug',
    required: false,
    type: String,
    description: 'Filter by category slug',
  })
  @ApiQuery({
    name: 'childCategoryId',
    required: false,
    type: String,
    description: 'Filter by child category ID',
  })
  @ApiQuery({
    name: 'childCategorySlug',
    required: false,
    type: String,
    description: 'Filter by child category slug',
  })
  @ApiQuery({
    name: 'inStock',
    required: false,
    type: Boolean,
    description: 'Filter by stock availability',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in name and code',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description:
      'Sort by price: price-asc (ascending) or price-desc (descending)',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: [ProductPublicResponseDto],
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('brandId') brandId?: string,
    @Query('brandSlug') brandSlug?: string,
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('childCategoryId') childCategoryId?: string,
    @Query('childCategorySlug') childCategorySlug?: string,
    @Query('inStock') inStock?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
  ) {
    const pageNum = page ? parseInt(String(page), 10) : 1;
    const limitNum = limit ? parseInt(String(limit), 10) : 10;
    const filters: {
      brandId?: string;
      brandSlug?: string;
      categoryId?: string;
      categorySlug?: string;
      childCategoryId?: string;
      childCategorySlug?: string;
      inStock?: boolean;
      minPrice?: number;
      maxPrice?: number;
      search?: string;
      sort?: string;
    } = {};

    if (brandId) filters.brandId = String(brandId);
    if (brandSlug) filters.brandSlug = String(brandSlug);
    if (categoryId) filters.categoryId = String(categoryId);
    if (categorySlug) filters.categorySlug = String(categorySlug);
    if (childCategoryId) filters.childCategoryId = String(childCategoryId);
    if (childCategorySlug)
      filters.childCategorySlug = String(childCategorySlug);
    if (inStock !== undefined) {
      const inStockValue = String(inStock);
      filters.inStock = inStockValue === 'true' || inStockValue === '1';
    }
    if (minPrice) filters.minPrice = parseFloat(String(minPrice));
    if (maxPrice) filters.maxPrice = parseFloat(String(maxPrice));
    if (search) filters.search = String(search);
    if (sort) filters.sort = String(sort);

    return this.productsService.findAll(pageNum, limitNum, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID (public endpoint)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id') id: string, @Query('language') language?: 'ka' | 'en') {
    return this.productsService.findById(id, language);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug (public endpoint)' })
  @ApiParam({ name: 'slug', description: 'Product slug' })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id/similar')
  @ApiOperation({ summary: 'Get similar products (public endpoint)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiQuery({
    name: 'minCount',
    required: false,
    type: Number,
    description: 'Minimum number of products to return (default: 5)',
  })
  @ApiQuery({
    name: 'maxCount',
    required: false,
    type: Number,
    description: 'Maximum number of products to return (default: 15)',
  })
  @ApiQuery({
    name: 'language',
    required: false,
    enum: ['ka', 'en'],
    description: 'Language for localized fields',
  })
  @ApiResponse({
    status: 200,
    description: 'Similar products retrieved successfully',
    type: [ProductResponseDto],
  })
  findSimilar(
    @Param('id') id: string,

    @Query('language') language?: 'ka' | 'en',
  ) {
    return this.productsService.findSimilarProducts(id, language);
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Product code or slug already exists',
  })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a product by ID (admin only)',
    description:
      'If ID is provided in the route, this endpoint updates the product. Uses POST method instead of PATCH.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({
    status: 409,
    description: 'Product code or slug already exists',
  })
  update(@Param('id') id: string, @Body() updateProductDto: CreateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({
    status: 204,
    description: 'Product deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
