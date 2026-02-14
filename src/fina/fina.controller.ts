import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FinaService } from './fina.service';
import { GetProductsRestArrayDto } from './dto/get-products-rest-array.dto';

@ApiTags('fina')
@Controller('fina')
export class FinaController {
  constructor(private readonly finaService: FinaService) {}

  @Get('info')
  @ApiOperation({ summary: 'Get FINA API info (connectivity check)' })
  @ApiResponse({
    status: 200,
    description: 'FINA api info response (raw)',
  })
  getApiInfo() {
    return this.finaService.getApiInfo();
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products from FINA (proxy)' })
  @ApiResponse({
    status: 200,
    description: 'FINA products response (raw)',
  })
  getAllProducts() {
    return this.finaService.getAllProducts();
  }

  @Get('products/rest')
  @ApiOperation({
    summary: 'Get product rests from FINA (getProductsRest proxy)',
  })
  @ApiResponse({
    status: 200,
    description: 'FINA getProductsRest response (raw)',
  })
  getProductsRest() {
    return this.finaService.getProductsRest();
  }

  @Post('products/rest-array')
  @ApiOperation({
    summary: 'Get FINA products by id list (getProductsRestArray proxy)',
  })
  @ApiBody({ type: GetProductsRestArrayDto })
  @ApiResponse({
    status: 200,
    description: 'FINA getProductsRestArray response (raw)',
  })
  async getProductsRestArray(@Body() body: GetProductsRestArrayDto) {
    return await this.finaService.getProductsRestArray(body.prods);
  }
}
