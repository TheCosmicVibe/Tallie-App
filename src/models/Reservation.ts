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
import { Table } from './Table';
import { ReservationStatus } from '../types';

@Entity('reservations')
@Index(['restaurantId', 'reservationDate'])
@Index(['tableId', 'reservationDate', 'startTime'])
@Index(['customerPhone'])
@Index(['status'])
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'restaurant_id' })
  restaurantId: number;

  @Column({ type: 'int', name: 'table_id' })
  tableId: number;

  @Column({ type: 'varchar', length: 255, name: 'customer_name' })
  customerName: string;

  @Column({ type: 'varchar', length: 20, name: 'customer_phone' })
  customerPhone: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'customer_email' })
  customerEmail: string;

  @Column({ type: 'int', name: 'party_size' })
  partySize: number;

  @Column({ type: 'date', name: 'reservation_date' })
  reservationDate: string;

  @Column({ type: 'time', name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', name: 'end_time' })
  endTime: string;

  @Column({ type: 'int' })
  duration: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({ type: 'text', nullable: true, name: 'special_requests' })
  specialRequests: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'confirmation_code' })
  confirmationCode: string;

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.reservations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @ManyToOne(() => Table, (table) => table.reservations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
