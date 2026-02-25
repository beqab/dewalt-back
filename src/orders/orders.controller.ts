import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentCallbackDto } from './dto/payment-callback.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { UserAuthGuard } from '../guards/user.guard';
import { CurrentUser } from '../decorators/getCurrentUser';
import type { CurrentUserType } from '../decorators/getCurrentUser';
import { AdminAuthGuard } from '../guards/admin.guard';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: Order,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  create(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return this.ordersService.create(createOrderDto);
  }

  @Post('payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create payment link for an order' })
  @ApiQuery({ name: 'locale', required: false, enum: ['ka', 'en'] })
  createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Query('locale') locale?: 'ka' | 'en',
  ) {
    return this.ordersService.createPayment(createPaymentDto.orderId, locale);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payment callback from provider' })
  callback(@Body() body: PaymentCallbackDto) {
    console.log(body, 'callback+++++++++++++++++');
    return this.ordersService.callback(body);
  }

  @Post('return')
  @ApiOperation({ summary: 'Payment return redirect from provider' })
  paymentReturn(
    @Body() body: Record<string, unknown>,
    @Query('locale') locale: 'ka' | 'en' = 'ka',
    @Res() res: Response,
  ) {
    const orderId =
      typeof body.order_id === 'string'
        ? body.order_id
        : typeof body.ORDER_ID === 'string'
          ? body.ORDER_ID
          : null;
    if (!orderId) {
      throw new BadRequestException('Order ID not found in return payload');
    }

    const redirectUrl = `${process.env.FRONT_URL}${locale}/payment-status?orderId=${orderId}`;
    return res.redirect(303, redirectUrl);
  }

  @Get()
  @ApiOperation({ summary: 'Get orders with optional filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'userId', required: false, type: String })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
    @Query('userId') userId?: string,
  ) {
    return this.ordersService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      userId,
    });
  }

  @Get('admin')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get orders list (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'id', required: false, type: String })
  @ApiQuery({ name: 'uuid', required: false, type: String })
  @ApiQuery({ name: 'finaId', required: false, type: String })
  @ApiQuery({ name: 'finalId', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'userEmail', required: false, type: String })
  findAllAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
    @Query('id') id?: string,
    @Query('uuid') uuid?: string,
    @Query('finaId') finaId?: string,
    @Query('finalId') finalId?: string,
    @Query('email') email?: string,
    @Query('userEmail') userEmail?: string,
  ) {
    return this.ordersService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      id: id ? String(id) : undefined,
      uuid: uuid || finaId || finalId,
      email: (userEmail || email) ?? undefined,
    });
  }

  @Get('admin/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order details (admin)' })
  findOneAdmin(@Param('id') id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @Post('admin/status')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update order status (admin)' })
  updateStatusAdmin(@Body() updateOrderDto: UpdateOrderDto): Promise<Order> {
    return this.ordersService.updateStatus(updateOrderDto);
  }

  @Get('my')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's orders" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  myOrders(
    @CurrentUser() user: CurrentUserType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findMyOrders({
      userId: user.id,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
    });
  }

  @Get('status')
  @ApiOperation({ summary: 'Check order status' })
  @ApiQuery({ name: 'orderId', required: true, type: String })
  checkOrderStatus(@Query('orderId') orderId: string) {
    return this.ordersService.checkOrderStatus(orderId);
  }

  @Post('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update order status' })
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  updateStatus(@Body() updateOrderDto: UpdateOrderDto): Promise<Order> {
    return this.ordersService.updateStatus(updateOrderDto);
  }
}
