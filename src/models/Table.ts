import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Restaurant } from './Restaurant';
import { Reservation } from './Reservation';

@Entity('tables')
@Index(['restaurantId', 'tableNumber'], { unique: true })
@Index(['restaurantId', 'capacity'])
export class Table {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'restaurant_id' })
  restaurantId: number;

  @Column({ type: 'varchar', length: 50, name: 'table_number' })
  tableNumber: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.tables, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @OneToMany(() => Reservation, (reservation) => reservation.table)
  reservations: Reservation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
