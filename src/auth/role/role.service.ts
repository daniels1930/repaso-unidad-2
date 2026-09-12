import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Role } from '../entities/role.entity';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
    ) {}

    // Crea un nuevo Role en la base de datos.
    // Recibe un DTO (objeto con los datos validados que llegan del cliente).
    async create(createRoleDto: CreateRoleDto): Promise<Role> {
        // .create() NO guarda en la BD todavía; solo construye una instancia
        // de la entidad Role en memoria a partir del DTO (aplica los valores,
        // valores por defecto de la entidad, etc.).
        const newRole = this.roleRepository.create(createRoleDto);

        // .save() sí ejecuta el INSERT en la base de datos
        // y devuelve la entidad ya guardada (con su id generado, por ejemplo).
        return await this.roleRepository.save(newRole);
    }

    // Devuelve todos los registros de la tabla Role.
    async findAll(): Promise<Role[]> {
        // .find() sin argumentos hace un SELECT * (equivalente) de toda la tabla.
        return await this.roleRepository.find();
    }

    // Busca un único Role por su id.
    async findOne(id: number): Promise<Role | null> {
        // .findOneBy() busca la primera fila que cumpla la condición { id }.
        // Si no encuentra nada, devuelve null (por eso el tipo de retorno es Role | null).
        return await this.roleRepository.findOneBy({ id });
    }

    // Actualiza un Role existente con los datos del DTO de actualización.
    async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role | null> {
        // .update() ejecuta un UPDATE directo en la BD sobre la fila con ese id,
        // aplicando solo los campos presentes en updateRoleDto.
        // OJO: no devuelve la entidad actualizada, solo el resultado de la operación (filas afectadas, etc.).
        await this.roleRepository.update(id, updateRoleDto);

        // Por eso, después de actualizar, se vuelve a consultar el registro
        // para devolver la versión actualizada al llamador.
        return await this.roleRepository.findOneBy({ id });
    }

    // Elimina un Role por su id.
    async remove(id: number): Promise<{ id: number } | null> {
        // .delete() ejecuta un DELETE en la BD y devuelve un objeto con info
        // de la operación, entre ella "affected" (cuántas filas se borraron).
        const result = await this.roleRepository.delete(id);

        // Si "affected" es mayor a 0 (o truthy), significa que sí se borró algo,
        // así que devolvemos el id como confirmación.
        if (result.affected) {
            return { id };
        }

        // Si no se borró nada (por ejemplo, el id no existía), devolvemos null.
        return null;
    }
}
