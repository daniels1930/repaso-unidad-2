import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';

import { RolePermissionService } from './role-permission.service';
import { CreateRolePermissionDto } from './dto/create-role-permission.dto';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';

@Controller('role-permissions')
export class RolePermissionController {
    constructor(private readonly rolePermissionService: RolePermissionService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createRolePermissionDto: CreateRolePermissionDto) {
        return this.rolePermissionService.create(createRolePermissionDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    findAll() {
        return this.rolePermissionService.findAll();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.rolePermissionService.findOne(id);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    update(@Param('id', ParseIntPipe) id: number, @Body() updateRolePermissionDto: UpdateRolePermissionDto) {
        return this.rolePermissionService.update(id, updateRolePermissionDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.rolePermissionService.remove(id);
    }
}
