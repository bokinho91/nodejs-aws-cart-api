import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity, CartItemEntity, CartStatus } from '../entities';
import { PutCartPayload } from 'src/order/type';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepository: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepository: Repository<CartItemEntity>,
  ) {
    console.log('CartService constructor - cartRepository:', this.cartRepository);
    console.log('CartService constructor - cartItemRepository:', this.cartItemRepository);
  }

  async findByUserId (userId: string): Promise<CartEntity> {
    return this.cartRepository.findOne({
      where: { userId, status: CartStatus.OPEN },
      relations: ['items'],
    });
  }

  async createByUserId (userId: string): Promise<CartEntity> {
    const cart = this.cartRepository.create({
      userId,
      status: CartStatus.OPEN,
      items: [],
    });
    return this.cartRepository.save(cart);
  }

  async findOrCreateByUserId (userId: string): Promise<CartEntity> {
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId (userId: string, payload: PutCartPayload): Promise<CartEntity> {
    const cart = await this.findOrCreateByUserId(userId);

    const existingItem = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId: payload.product.id },
    });

    if (!existingItem) {
      // Add new item
      const newItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId: payload.product.id,
        count: payload.count,
      });
      await this.cartItemRepository.save(newItem);
    } else if (payload.count === 0) {
      // Remove item
      await this.cartItemRepository.remove(existingItem);
    } else {
      // Update item count
      existingItem.count = payload.count;
      await this.cartItemRepository.save(existingItem);
    }

    // Return updated cart with items
    return this.findByUserId(userId);
  }

  async removeByUserId (userId: string): Promise<void> {
    const cart = await this.findByUserId(userId);
    if (cart) {
      await this.cartRepository.remove(cart);
    }
  }

  async updateCartStatus (
    cartId: string,
    status: CartStatus): Promise<CartEntity> {
    const cart = await this.cartRepository.findOne({ where: { id: cartId } });
    if (cart) {
      cart.status = status;
      return this.cartRepository.save(cart);
    }
    return null;
  }
}
