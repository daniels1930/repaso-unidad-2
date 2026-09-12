import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { RolePermission } from '../entities/role-permission.entity';
import { RoleService } from '../role/role.service';
import { PermissionService } from '../permission/permission.service';

import { CreateRolePermissionDto } from './dto/create-role-permission.dto';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';

@Injectable()
export class RolePermissionService {
    constructor(
        @InjectRepository(RolePermission)
        private readonly rolePermissionRepository: Repository<RolePermission>,
        private roleService: RoleService,
        private permissionService: PermissionService,
    ) {}
    async create(createRolePermissionDto: CreateRolePermissionDto) {
        const role = await this.roleService.findOne(createRolePermissionDto.roleId);
        const permission = await this.permissionService.findOne(createRolePermissionDto.permissionId);
        if (!role) {
            throw new Error('Role not found');
        }
        if (!permission) {
            throw new Error('Permission Not Found');
        }

        const newRolePermission = this.rolePermissionRepository.create({
            role,
            permission,
        });

        return await this.rolePermissionRepository.save(newRolePermission);
    }

    findAll() {
        return this.rolePermissionRepository.find({
            relations: {
                role: true,
                permission: true,
            },
        });
    }

    findOne(id: number) {
        return this.rolePermissionRepository.findOne({ where: { id } });
    }

    async update(id: number, updateRolePermissionDto: UpdateRolePermissionDto) {
        const rolePermission = await this.rolePermissionRepository.findOneBy({ id });
        if (!rolePermission) {
            throw new Error('RolePermission not found');
        }

        if (updateRolePermissionDto.roleId) {
            // reasigna la relación con Role (no un campo simple)
            // cambia el permiso de tipo de rol, no actualiza formatos
            // naturales en la BD
            const role = await this.roleService.findOne(updateRolePermissionDto.roleId);
            if (!role) {
                throw new Error('Role not found');
            }
            rolePermission.role = role;
        }

        if (updateRolePermissionDto.permissionId) {
            const permission = await this.permissionService.findOne(updateRolePermissionDto.permissionId);
            if (!permission) {
                throw new Error('Permission not found');
            }
            rolePermission.permission = permission;
        }

        return await this.rolePermissionRepository.save(rolePermission);
    }

    async remove(id: number) {
        const result = await this.rolePermissionRepository.delete(id);
        if (result.affected) {
            return { id };
        }
        return null;
    }
}
