import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';

export enum CartStatus {
  OPEN = 'OPEN',
  ORDERED = 'ORDERED',
}

@Entity('carts')
export class CartEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', nullable: false })
  userId: string;

  @Column({
    type: 'enum',
    enum: CartStatus,
    default: CartStatus.OPEN,
  })
  status: CartStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => CartItemEntity, (item) => item.cart, {
    cascade: true,
    eager: true,
  })
  items: CartItemEntity[];
}

@Entity('cart_items')
export class CartItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cart_id', type: 'uuid', nullable: false })
  cartId: string;

  @Column({ name: 'product_id', type: 'varchar', nullable: false })
  productId: string;

  @Column({ type: 'integer', default: 1 })
  count: number;

  @ManyToOne(() => CartEntity, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: CartEntity;
}