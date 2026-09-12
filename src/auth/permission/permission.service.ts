import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Permission } from '../entities/permission.entity';

import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionService {
    constructor(
        @InjectRepository(Permission)
        private readonly permissionRepository: Repository<Permission>,
    ) {}
    async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
        const newPermission = this.permissionRepository.create(createPermissionDto);
        return await this.permissionRepository.save(newPermission);
    }

    async findAll(): Promise<Permission[]> {
        return await this.permissionRepository.find();
    }

    async findOne(id: number): Promise<Permission | null> {
        return await this.permissionRepository.findOneBy({ id });
    }

    async update(id: number, updatePermissionDto: UpdatePermissionDto): Promise<Permission | null> {
        await this.permissionRepository.update(id, updatePermissionDto);
        return await this.permissionRepository.findOneBy({ id });
    }

    async remove(id: number): Promise<{ id: number } | null> {
        const result = await this.permissionRepository.delete(id);
        if (result.affected) {
            return { id };
        }
        return null;
    }

    // EJEMPLO DE UNA FUNCIONALIDAD EXTRA
    findByName(name: string) {
        return this.permissionRepository.find({
            where: { name },
        });
    }
}
