import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';

import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleOutDto } from './dto/role-out.dto';

@Controller('role')
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Post()
    async create(@Body() createRoleDto: CreateRoleDto) {
        const rolCreated = await this.roleService.create(createRoleDto);
        const rolOutDto: RoleOutDto = {
            name: rolCreated.name,
        };
        return rolOutDto;
    }

    @Get()
    findAll() {
        return this.roleService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.roleService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
        return this.roleService.update(+id, updateRoleDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.roleService.remove(+id);
    }
}
