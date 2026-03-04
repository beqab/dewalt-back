import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FinaService } from './fina.service';
import { SaveDocProductOutDto } from './dto/save-doc-product-out.dto';
import { GetPriceTypesResponseDto } from './dto/get-price-types.response.dto';
import { GetUsersResponseDto } from './dto/get-users.response.dto';

type SaveDocProductOutResponse = { id: number; ex?: string | null };

@ApiTags('fina')
@Controller('api/operation')
export class FinaOperationController {
  constructor(private readonly finaService: FinaService) {}

  @Get('getPriceTypes')
  @ApiOperation({
    summary: 'getPriceTypes proxy (ფასის ტიპები)',
    description: 'Forwards to FINA /api/operation/getPriceTypes.',
  })
  @ApiResponse({
    status: 200,
    description: 'FINA getPriceTypes response (raw)',
    type: GetPriceTypesResponseDto,
  })
  getPriceTypes(): Promise<GetPriceTypesResponseDto> {
    return this.finaService.getPriceTypes() as Promise<GetPriceTypesResponseDto>;
  }

  @Get('getUsers')
  @ApiOperation({
    summary: 'getUsers proxy (მომხმარებლები)',
    description: 'Forwards to FINA /api/operation/getUsers.',
  })
  @ApiResponse({
    status: 200,
    description: 'FINA getUsers response (raw)',
    type: GetUsersResponseDto,
  })
  getUsers(): Promise<GetUsersResponseDto> {
    return this.finaService.getUsers() as Promise<GetUsersResponseDto>;
  }

  @Get('getCustomers')
  @ApiOperation({
    summary: 'getCustomers proxy (მყიდველები)',
    description: 'Forwards to FINA /api/operation/getCustomers.',
  })
  @ApiResponse({
    status: 200,
    description: 'FINA getCustomers response (raw)',
  })
  getCustomers(): Promise<unknown> {
    return this.finaService.getCustomers();
  }

  @Post('saveDocProductOut')
  @ApiOperation({
    summary: 'saveDocProductOut proxy (საქონლის რეალიზაცია)',
    description:
      'Accepts a reduced payload and forwards to FINA /api/operation/saveDocProductOut with safe defaults for omitted fields.',
  })
  @ApiBody({
    type: SaveDocProductOutDto,
    examples: {
      sample: {
        summary: 'Example payload (minimal + common optional fields)',
        value: {
          date: '2026-03-03T12:00:00',
          purpose: 'ონლაინ გაყიდვა',
          amount: 120,
          currency: 'GEL',
          rate: 1,
          store: 1,
          user: 3,
          customer: 0,
          is_vat: true,
          vat: 1,
          make_entry: true,
          pay_type: 3,
          price_type: 3,
          w_type: 3,
          t_type: 7,
          t_payer: 1,
          products: [{ id: 15, sub_id: 0, quantity: 2, price: 60 }],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'FINA saveDocProductOut response (raw)',
  })
  saveDocProductOut(
    @Body() body: SaveDocProductOutDto,
  ): Promise<SaveDocProductOutResponse> {
    console.log(body, 'body<insert>');
    return this.finaService.saveDocProductOut(body);
  }
}
