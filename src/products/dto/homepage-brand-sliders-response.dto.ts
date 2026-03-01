import { ApiProperty } from '@nestjs/swagger';
import { BrandPublicResponseDto } from '../../categories/dto/category-response.dto';
import { ProductPublicResponseDto } from './product-public-response.dto';

export class HomepageBrandSliderDto {
  @ApiProperty({ type: BrandPublicResponseDto })
  brand: BrandPublicResponseDto;

  @ApiProperty({ type: [ProductPublicResponseDto] })
  products: ProductPublicResponseDto[];
}
