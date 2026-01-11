import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Restaurant } from './Restaurant';
import { WaitlistStatus } from '../types';

@Entity('waitlists')
@Index(['restaurantId', 'waitlistDate', 'status'])
@Index(['customerPhone'])
export class Waitlist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'restaurant_id' })
  restaurantId: number;

  @Column({ type: 'varchar', length: 255, name: 'customer_name' })
  customerName: string;

  @Column({ type: 'varchar', length: 20, name: 'customer_phone' })
  customerPhone: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'customer_email' })
  customerEmail: string;

  @Column({ type: 'int', name: 'party_size' })
  partySize: number;

  @Column({ type: 'date', name: 'waitlist_date' })
  waitlistDate: string;

  @Column({ type: 'time', nullable: true, name: 'preferred_time' })
  preferredTime: string;

  @Column({
    type: 'enum',
    enum: WaitlistStatus,
    default: WaitlistStatus.WAITING,
  })
  status: WaitlistStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true, name: 'notified_at' })
  notifiedAt: Date;

  @Column({ type: 'int', default: 0, name: 'position' })
  position: number;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.waitlists, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
