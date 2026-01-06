import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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
import { CategoriesService } from './categories.service';
import {
  CreateBrandDto,
  UpdateBrandDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateChildCategoryDto,
  UpdateChildCategoryDto,
  BrandResponseDto,
  CategoryResponseDto,
  ChildCategoryResponseDto,
} from './dto';
import { AdminAuthGuard } from 'src/guards/admin.guard';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ==================== BRAND ENDPOINTS ====================

  @Get('brands')
  @ApiOperation({ summary: 'Get all brands (public endpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Brands retrieved successfully',
    type: [BrandResponseDto],
  })
  findAllBrands() {
    return this.categoriesService.findAllBrands();
  }

  @Get('brands/:id')
  @ApiOperation({ summary: 'Get a single brand by ID (public endpoint)' })
  @ApiParam({ name: 'id', description: 'Brand ID' })
  @ApiResponse({
    status: 200,
    description: 'Brand retrieved successfully',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  findBrandById(@Param('id') id: string) {
    return this.categoriesService.findBrandById(id);
  }

  @Post('brands')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new brand (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Brand created successfully',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Brand with this slug already exists',
  })
  createBrand(@Body() createBrandDto: CreateBrandDto) {
    return this.categoriesService.createBrand(createBrandDto);
  }

  @Patch('brands/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a brand by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Brand ID' })
  @ApiResponse({
    status: 200,
    description: 'Brand updated successfully',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  updateBrand(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
    return this.categoriesService.updateBrand(id, updateBrandDto);
  }

  @Delete('brands/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a brand by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Brand ID' })
  @ApiResponse({ status: 204, description: 'Brand deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete brand with categories',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  removeBrand(@Param('id') id: string) {
    return this.categoriesService.removeBrand(id);
  }

  // ==================== CATEGORY ENDPOINTS ====================

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories (public endpoint)' })
  @ApiQuery({
    name: 'brandId',
    required: false,
    description: 'Filter by brand ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: [CategoryResponseDto],
  })
  findAllCategories(@Query('brandId') brandId?: string) {
    if (brandId) {
      return this.categoriesService.findCategoriesByBrand(brandId);
    }
    return this.categoriesService.findAllCategories();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get a single category by ID (public endpoint)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findCategoryById(@Param('id') id: string) {
    return this.categoriesService.findCategoryById(id);
  }

  @Post('categories')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ApiResponse({
    status: 409,
    description: 'Category with this slug already exists',
  })
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.createCategory(createCategoryDto);
  }

  @Patch('categories/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a category by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a category by ID (admin only)',
    description:
      'Deletes a category and removes categoryId reference from all child categories',
  })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: 204,
    description:
      'Category deleted successfully. All child categories had their categoryId removed.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  removeCategory(@Param('id') id: string) {
    return this.categoriesService.removeCategory(id);
  }

  // ==================== CHILD CATEGORY ENDPOINTS ====================

  @Get('child-categories')
  @ApiOperation({ summary: 'Get all child categories (public endpoint)' })
  @ApiQuery({
    name: 'brandId',
    required: false,
    description: 'Filter by brand ID',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Child categories retrieved successfully',
    type: [ChildCategoryResponseDto],
  })
  findAllChildCategories(
    @Query('brandId') brandId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    if (brandId && categoryId) {
      return this.categoriesService.findChildCategoriesByBrandAndCategory(
        brandId,
        categoryId,
      );
    }
    return this.categoriesService.findAllChildCategories();
  }

  @Get('child-categories/:id')
  @ApiOperation({
    summary: 'Get a single child category by ID (public endpoint)',
  })
  @ApiParam({ name: 'id', description: 'Child Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Child category retrieved successfully',
    type: ChildCategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Child category not found' })
  findChildCategoryById(@Param('id') id: string) {
    return this.categoriesService.findChildCategoryById(id);
  }

  @Post('child-categories')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new child category (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Child category created successfully',
    type: ChildCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({
    status: 409,
    description: 'Child category with this slug already exists',
  })
  createChildCategory(@Body() createChildCategoryDto: CreateChildCategoryDto) {
    return this.categoriesService.createChildCategory(createChildCategoryDto);
  }

  @Patch('child-categories/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a child category by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Child Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Child category updated successfully',
    type: ChildCategoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Child category not found' })
  updateChildCategory(
    @Param('id') id: string,
    @Body() updateChildCategoryDto: UpdateChildCategoryDto,
  ) {
    return this.categoriesService.updateChildCategory(
      id,
      updateChildCategoryDto,
    );
  }

  @Delete('child-categories/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a child category by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Child Category ID' })
  @ApiResponse({
    status: 204,
    description: 'Child category deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Child category not found' })
  removeChildCategory(@Param('id') id: string) {
    return this.categoriesService.removeChildCategory(id);
  }
}
