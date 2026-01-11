import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Table } from './Table';
import { Reservation } from './Reservation';
import { Waitlist } from './Waitlist';

@Entity('restaurants')
@Index(['name'])
export class Restaurant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'time', name: 'opening_time' })
  openingTime: string;

  @Column({ type: 'time', name: 'closing_time' })
  closingTime: string;

  @Column({ type: 'int', name: 'total_tables' })
  totalTables: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @OneToMany(() => Table, (table) => table.restaurant, { cascade: true })
  tables: Table[];

  @OneToMany(() => Reservation, (reservation) => reservation.restaurant)
  reservations: Reservation[];

  @OneToMany(() => Waitlist, (waitlist) => waitlist.restaurant)
  waitlists: Waitlist[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
