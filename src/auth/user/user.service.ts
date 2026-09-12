import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';
import { RoleService } from '../role/role.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private roleService: RoleService,
    ) {}

    // Crea un nuevo usuario, asociándolo a un Role existente
    async create(createUserDto: CreateUserDto) {
        // Primero busca el Role usando el roleId que viene en el DTO
        const role = await this.roleService.findOne(createUserDto.roleId);

        // Si no existe ese role, no tiene sentido crear el usuario:
        // se corta la ejecución lanzando un error
        if (!role) {
            throw new Error('Role not found');
        }

        // Se construye la entidad User en memoria:
        // - se copian todos los campos del DTO (...createUserDto)
        // - se sobreescribe/añade la propiedad "role" con la entidad Role ya encontrada
        //   (en vez de dejar solo el roleId, se guarda la relación completa)
        const newUser = this.userRepository.create({
            ...createUserDto,
            role,
        });

        // Se guarda el usuario en la base de datos (INSERT) y se retorna ya creado
        return await this.userRepository.save(newUser);
    }

    // Devuelve todos los usuarios, incluyendo la información de su Role relacionado
    findAll() {
        return this.userRepository.find({
            relations: {
                role: true, // le dice a TypeORM que haga el JOIN con la tabla role
            },
        });
    }

    // Busca un usuario por id (sin traer su relación con role)
    findOne(id: number) {
        return this.userRepository.findOne({ where: { id } });
    }

    // Actualiza un usuario existente con los datos del DTO
    async update(id: number, updateUserDto: UpdateUserDto) {
        // .update() ejecuta el UPDATE en la BD, pero no devuelve la entidad actualizada
        await this.userRepository.update(id, updateUserDto);

        // por eso se vuelve a buscar el usuario ya actualizado para devolverlo
        return this.findOne(id);
    }

    // Elimina un usuario por id
    async remove(id: number) {
        // .delete() ejecuta el DELETE y devuelve info de la operación (affected, etc.)
        const result = await this.userRepository.delete(id);

        // Si se borró alguna fila, se confirma devolviendo el id
        if (result.affected) {
            return { id };
        }

        // Si no se borró nada (el id no existía), se devuelve null
        return null;
    }

    /**
     * Busca usuarios que tengan un Role con el nombre indicado
     */
    async findByRole(roleName: string) {
        return await this.userRepository.find({
            // Filtra por una propiedad de la relación: role.name === roleName
            where: { role: { name: roleName } },
            relations: {
                role: true, // trae también los datos del role relacionado
            },
            order: { username: 'ASC' }, // ordena los resultados por username ascendente
        });
    }

    /**
     * Cuenta el total de usuarios en la tabla
     */
    async count(): Promise<number> {
        return await this.userRepository.count();
    }

    /**
     * Cuenta cuántos usuarios tienen un Role específico
     */
    async countByRole(roleName: string): Promise<number> {
        return await this.userRepository.count({
            where: { role: { name: roleName } }, // mismo filtro que findByRole, pero solo cuenta
        });
    }
}
