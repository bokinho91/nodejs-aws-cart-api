import {
  Controller,
  Get,
  Delete,
  Put,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { BasicAuthGuard } from '../auth';
import { Order, OrderService } from '../order';
import { AppRequest, getUserIdFromRequest } from '../shared';
import { calculateCartTotalFromEntities } from './models-rules';
import { CartService } from './services';
import { CartItemEntity } from './entities';
import { CreateOrderDto, PutCartPayload } from 'src/order/type';
import { CartStatus } from './entities';

@Controller('api/profile/cart')
export class CartController {
  constructor(
    @Inject(CartService) private readonly cartService: CartService,
    @Inject(OrderService) private readonly orderService: OrderService,
  ) {
    console.log('CartController constructor - cartService:', this.cartService);
    console.log('CartController constructor - orderService:', this.orderService);
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Get()
  async findUserCart (@Req() req: AppRequest): Promise<CartItemEntity[]> {
    const cart = await this.cartService.findOrCreateByUserId(
      getUserIdFromRequest(req),
    );

    return cart.items;
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Put()
  async updateUserCart (
    @Req() req: AppRequest,
    @Body() body: PutCartPayload,
  ): Promise<CartItemEntity[]> {
    // TODO: validate body payload...
    const cart = await this.cartService.updateByUserId(
      getUserIdFromRequest(req),
      body,
    );

    return cart.items;
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearUserCart (@Req() req: AppRequest) {
    await this.cartService.removeByUserId(getUserIdFromRequest(req));
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Put('order')
  async checkout (@Req() req: AppRequest, @Body() body: CreateOrderDto) {
    const userId = getUserIdFromRequest(req);
    const cart = await this.cartService.findByUserId(userId);

    if (!(cart && cart.items && cart.items.length)) {
      throw new BadRequestException('Cart is empty');
    }

    const { id: cartId, items } = cart;
    const total = calculateCartTotalFromEntities(items);
    const order = this.orderService.create({
      userId,
      cartId,
      items: items.map((item) => ({
        productId: item.productId,
        count: item.count,
      })),
      address: body.address,
      total,
    });

    // Update cart status to ORDERED instead of removing
    await this.cartService.updateCartStatus(cartId, CartStatus.ORDERED);

    return {
      order,
    };
  }

  @UseGuards(BasicAuthGuard)
  @Get('order')
  getOrder (): Order[] {
    return this.orderService.getAll();
  }
}
