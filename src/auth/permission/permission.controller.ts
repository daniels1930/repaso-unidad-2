import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';

import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Controller('permissions')
export class PermissionController {
    constructor(private readonly permissionService: PermissionService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createPermissionDto: CreatePermissionDto) {
        return this.permissionService.create(createPermissionDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    findAll() {
        return this.permissionService.findAll();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.permissionService.findOne(id);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    update(@Param('id', ParseIntPipe) id: number, @Body() updatePermissionDto: UpdatePermissionDto) {
        return this.permissionService.update(id, updatePermissionDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.permissionService.remove(id);
    }

    // EJEMPLO DE UNA FUNCIONALIDAD EXTRA

    @Get('name/:name')
    @HttpCode(HttpStatus.OK)
    findByName(@Param('name') name: string) {
        return this.permissionService.findByName(name);
    }
}
