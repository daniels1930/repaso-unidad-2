import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { User } from '../../auth/entities/user.entity';

@Entity('routines') // Mapea esta clase a la tabla 'routines'
export class Routine {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @ManyToOne(() => User, { eager: false, nullable: false }) // Cada rutina pertenece a un único usuario
    @JoinColumn({ name: 'user_id' })
    user: User;
}
