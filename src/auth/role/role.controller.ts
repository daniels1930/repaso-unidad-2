import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';

import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleOutDto } from './dto/role-out.dto';

@Controller('roles')
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createRoleDto: CreateRoleDto) {
        const rolCreated = await this.roleService.create(createRoleDto);
        const rolOutDto: RoleOutDto = {
            name: rolCreated.name,
        };
        return rolOutDto;
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    findAll() {
        return this.roleService.findAll();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.roleService.findOne(id);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    update(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: UpdateRoleDto) {
        return this.roleService.update(id, updateRoleDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.roleService.remove(id);
    }
}
