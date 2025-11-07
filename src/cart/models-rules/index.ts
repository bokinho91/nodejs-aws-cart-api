import { CartItem } from '../models';
import { CartItemEntity } from '../entities';

export function calculateCartTotal (items: CartItem[]): number {
  return items.length
    ? items.reduce((acc: number, { product: { price }, count }: CartItem) => {
      return (acc += price * count);
    }, 0)
    : 0;
}

export function calculateCartTotalFromEntities (items: CartItemEntity[]): number {
  // For now, just return the count of items
  // TODO: Fetch product prices and calculate actual total
  return items.reduce((acc, item) => acc + item.count, 0);
}
