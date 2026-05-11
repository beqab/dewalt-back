import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateTbcInstalmentDto } from './dto/create-tbc-instalment.dto';
import {
  TbcInstalmentOrderContext,
  TbcInstalmentService,
} from './tbc-instalment.service';

@ApiTags('tbc-instalment')
@Controller('tbc-instalment')
export class TbcInstalmentController {
  constructor(private readonly tbcInstalmentService: TbcInstalmentService) {}

  @Post('orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prepare TBC instalment flow for an order' })
  @ApiResponse({
    status: 200,
    description: 'Order context prepared for TBC instalment flow',
  })
  createForOrder(
    @Body() dto: CreateTbcInstalmentDto,
  ): Promise<TbcInstalmentOrderContext> {
    return this.tbcInstalmentService.createForOrder(dto);
  }
}
