import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolePermission } from '../entities/role-permission.entity';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { PermissionModule } from '../permission/permission.module';
import { RoleModule } from '../role/role.module';

import { RolePermissionService } from './role-permission.service';
import { RolePermissionController } from './role-permission.controller';

@Module({
    controllers: [RolePermissionController],
    providers: [RolePermissionService],
    imports: [TypeOrmModule.forFeature([RolePermission, Role, Permission]), RoleModule, PermissionModule],
})
export class RolePermissionModule {}
