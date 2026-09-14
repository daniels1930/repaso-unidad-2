# Recetario de métodos — Service + Controller NestJS/TypeORM (nombres genéricos)

> Nota general: en todos los controllers se asume que la entidad se inyecta así:
>
> ```typescript
> @Controller('examples')
> export class ExampleController {
>     constructor(private readonly exampleService: ExampleService) {}
>     // ...métodos de abajo
> }
> ```
>
> Y que `ParseIntPipe` se importa de `@nestjs/common` cuando se usa.

### 1. Crear un registro simple, sin relaciones

**Con esto podrías:** crear una entidad que solo tiene columnas propias
(texto, números), sin depender de otra tabla.

```typescript
async create(createExampleDto: CreateExampleDto): Promise<Example> {
    const newExample = this.exampleRepository.create(createExampleDto);
    return await this.exampleRepository.save(newExample);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

---

### 2. Crear un registro que depende de UNA entidad existente

**Con esto podrías:** crear una entidad que necesita otra ya existente
(ej: algo que se relaciona con un id que te mandan en el DTO).

```typescript
async create(createExampleDto: CreateExampleDto) {
    const relatedExample = await this.relatedExampleService.findOne(createExampleDto.relatedExampleId);
    if (!relatedExample) {
        throw new Error('RelatedExample not found');
    }

    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        relatedExample,
    });
    return await this.exampleRepository.save(newExample);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

---

### 3. Crear una tabla intermedia (dos relaciones, sin columnas propias)

**Con esto podrías:** crear una tabla que solo existe para unir dos
entidades (relación muchos-a-muchos con tabla intermedia).

```typescript
async create(createExampleDto: CreateExampleDto) {
    const relatedExample = await this.relatedExampleService.findOne(createExampleDto.relatedExampleId);
    const relatedExampleB = await this.relatedExampleBService.findOne(createExampleDto.relatedExampleBId);

    if (!relatedExample) {
        throw new Error('RelatedExample not found');
    }
    if (!relatedExampleB) {
        throw new Error('RelatedExampleB not found');
    }

    const newExample = this.exampleRepository.create({
        relatedExample,
        relatedExampleB,
    });

    return await this.exampleRepository.save(newExample);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

---

### 4. Crear un registro con relación + validar que NO exista duplicado

**Con esto podrías:** evitar que se cree la misma asociación dos veces
(ej: que la misma combinación de relaciones no se repita).

```typescript
async create(createExampleDto: CreateExampleDto) {
    const relatedExample = await this.relatedExampleService.findOne(createExampleDto.relatedExampleId);
    if (!relatedExample) {
        throw new Error('RelatedExample not found');
    }

    const relatedExampleB = await this.relatedExampleBService.findOne(createExampleDto.relatedExampleBId);
    if (!relatedExampleB) {
        throw new Error('RelatedExampleB not found');
    }

    // Verifica que esa combinación no exista ya
    const yaExiste = await this.exampleRepository.findOne({
        where: {
            relatedExample: { id: relatedExample.id },
            relatedExampleB: { id: relatedExampleB.id },
        },
    });
    if (yaExiste) {
        throw new Error('This combination already exists');
    }

    const newExample = this.exampleRepository.create({ relatedExample, relatedExampleB });
    return await this.exampleRepository.save(newExample);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

---

### 5. Buscar todos, trayendo la relación (JOIN)

**Con esto podrías:** listar todos los registros mostrando también su
relación (ej: mostrar el objeto relacionado, no solo su id).

```typescript
findAll() {
    return this.exampleRepository.find({
        relations: {
            relatedExample: true,
        },
    });
}
```

**Controller:**

```typescript
@Get()
findAll() {
    return this.exampleService.findAll();
}
```

---

### 6. Buscar todos, trayendo DOS niveles de relación anidados

**Con esto podrías:** listar registros mostrando su relación, y dentro de
esa relación, otra relación más (anidada).

```typescript
findAll() {
    return this.exampleRepository.find({
        relations: {
            relatedExample: {
                relatedExampleB: true,
            },
        },
    });
}
```

**Controller:**

```typescript
@Get()
findAll() {
    return this.exampleService.findAll();
}
```

---

### 7. Buscar uno por id

**Con esto podrías:** el `findOne` estándar de cualquier CRUD.

```typescript
findOne(id: number) {
    return this.exampleRepository.findOne({ where: { id } });
}
```

**Controller:**

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.findOne(id);
}
```

---

### 8. Buscar filtrando por un campo de la RELACIÓN (no propio)

**Con esto podrías:** "traer todos los registros cuya relación tenga tal
valor" (ej: filtrar por un campo que vive en la tabla relacionada).

```typescript
async findByRelatedField(value: string) {
    return await this.exampleRepository.find({
        where: { relatedExample: { name: value } },
        relations: { relatedExample: true },
        order: { id: 'ASC' },
    });
}
```

**Controller:**

```typescript
@Get('by-related-field')
findByRelatedField(@Query('value') value: string) {
    return this.exampleService.findByRelatedField(value);
}
```

---

### 9. Buscar por texto parcial (LIKE / contiene)

**Con esto podrías:** un buscador tipo "encuentra registros cuyo nombre
contenga tal palabra" (búsqueda parcial, no exacta).

```typescript
import { Like } from 'typeorm';

async searchByName(text: string) {
    return await this.exampleRepository.find({
        where: { name: Like(`%${text}%`) },
    });
}
```

**Controller:**

```typescript
@Get('search')
searchByName(@Query('text') text: string) {
    return this.exampleService.searchByName(text);
}
```

---

### 10. Actualizar campos simples (sin tocar relaciones)

**Con esto podrías:** actualizar columnas propias de una entidad sin
relaciones, o cuando el update no toca ninguna relación.

```typescript
async update(id: number, updateExampleDto: UpdateExampleDto): Promise<Example | null> {
    await this.exampleRepository.update(id, updateExampleDto);
    return await this.exampleRepository.findOneBy({ id });
}
```

**Controller:**

```typescript
@Patch(':id')
update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    return this.exampleService.update(id, updateExampleDto);
}
```

---

### 11. Actualizar reasignando UNA relación

**Con esto podrías:** cambiar a qué entidad relacionada apunta un
registro ya existente.

```typescript
async update(id: number, updateExampleDto: UpdateExampleDto) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new Error('Example not found');
    }

    if (updateExampleDto.relatedExampleId) {
        const relatedExample = await this.relatedExampleService.findOne(updateExampleDto.relatedExampleId);
        if (!relatedExample) {
            throw new Error('RelatedExample not found');
        }
        example.relatedExample = relatedExample;
    }

    return await this.exampleRepository.save({ ...example, ...updateExampleDto });
}
```

**Controller:**

```typescript
@Patch(':id')
update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    return this.exampleService.update(id, updateExampleDto);
}
```

---

### 12. Actualizar reasignando DOS relaciones (tabla intermedia)

**Con esto podrías:** cambiar a qué entidades apunta una fila de una tabla
intermedia ya existente.

```typescript
async update(id: number, updateExampleDto: UpdateExampleDto) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new Error('Example not found');
    }

    if (updateExampleDto.relatedExampleId) {
        const relatedExample = await this.relatedExampleService.findOne(updateExampleDto.relatedExampleId);
        if (!relatedExample) {
            throw new Error('RelatedExample not found');
        }
        example.relatedExample = relatedExample;
    }

    if (updateExampleDto.relatedExampleBId) {
        const relatedExampleB = await this.relatedExampleBService.findOne(updateExampleDto.relatedExampleBId);
        if (!relatedExampleB) {
            throw new Error('RelatedExampleB not found');
        }
        example.relatedExampleB = relatedExampleB;
    }

    return await this.exampleRepository.save(example);
}
```

**Controller:**

```typescript
@Patch(':id')
update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    return this.exampleService.update(id, updateExampleDto);
}
```

---

### 13. Eliminar por id (simple, cualquier entidad)

**Con esto podrías:** el `remove` estándar de cualquier CRUD, incluso
tablas intermedias — borrar nunca necesita resolver relaciones.

```typescript
async remove(id: number) {
    const result = await this.exampleRepository.delete(id);
    if (result.affected) {
        return { id };
    }
    return null;
}
```

**Controller:**

```typescript
@Delete(':id')
remove(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.remove(id);
}
```

---

### 14. Eliminar validando que no tenga dependencias

**Con esto podrías:** impedir borrar un registro si todavía tiene otros
registros dependiendo de él (evitar dejar datos huérfanos).

```typescript
async remove(id: number) {
    const dependientes = await this.relatedExampleRepository.count({
        where: { example: { id } },
    });
    if (dependientes > 0) {
        throw new Error('Cannot delete: there are dependent records');
    }

    const result = await this.exampleRepository.delete(id);
    if (result.affected) {
        return { id };
    }
    return null;
}
```

**Controller:**

```typescript
@Delete(':id')
remove(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.remove(id);
}
```

---

### 15. Contar todos los registros

**Con esto podrías:** "¿cuántos registros hay en total?".

```typescript
async count(): Promise<number> {
    return await this.exampleRepository.count();
}
```

**Controller:**

```typescript
// OJO: esta ruta debe declararse ANTES de @Get(':id') en el controller,
// si no, Nest intenta interpretar "count" como si fuera el id.
@Get('count')
count() {
    return this.exampleService.count();
}
```

---

### 16. Contar filtrando por relación

**Con esto podrías:** "¿cuántos registros tiene tal relación específica?".

```typescript
async countByRelatedField(value: string): Promise<number> {
    return await this.exampleRepository.count({
        where: { relatedExample: { name: value } },
    });
}
```

**Controller:**

```typescript
@Get('count/by-related')
countByRelatedField(@Query('value') value: string) {
    return this.exampleService.countByRelatedField(value);
}
```

---

### 17. Verificar si ya existe antes de crear (evitar duplicados por nombre)

**Con esto podrías:** que no se puedan crear dos registros con el mismo
valor en un campo único (ej: mismo nombre).

```typescript
async create(createExampleDto: CreateExampleDto): Promise<Example> {
    const existe = await this.exampleRepository.existsBy({ name: createExampleDto.name });
    if (existe) {
        throw new Error('A record with this name already exists');
    }

    const newExample = this.exampleRepository.create(createExampleDto);
    return await this.exampleRepository.save(newExample);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

---

### 18. Traer los N más recientes

**Con esto podrías:** "los últimos 5 registros creados".

```typescript
async findLatest(limit: number) {
    return await this.exampleRepository.find({
        order: { createdAt: 'DESC' },
        take: limit,
    });
}
```

**Controller:**

```typescript
@Get('latest')
findLatest(@Query('limit', ParseIntPipe) limit: number) {
    return this.exampleService.findLatest(limit);
}
```

---

### 19. Paginar resultados (con total)

**Con esto podrías:** un listado con paginación real, mostrando página
actual y total de registros.

```typescript
async findPaginated(page: number, limit: number) {
    const [items, total] = await this.exampleRepository.findAndCount({
        take: limit,
        skip: (page - 1) * limit,
    });
    return { items, total, page, limit };
}
```

**Controller:**

```typescript
@Get('paginated')
findPaginated(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
) {
    return this.exampleService.findPaginated(page, limit);
}
```

---

### 20. Relación `@OneToOne` (uno a uno)

**Con esto podrías:** crear una entidad que tiene exactamente UN registro
relacionado único de otra tabla (ej: un registro que tiene un único
"detalle" o "perfil" asociado, y viceversa).

```typescript
// entidad Example
@OneToOne(() => RelatedExample, { cascade: true })
@JoinColumn({ name: 'related_example_id' })
relatedExample: RelatedExample;

// service
async create(createExampleDto: CreateExampleDto) {
    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        relatedExample: createExampleDto.relatedExample, // objeto completo, se crea en cascada
    });
    return await this.exampleRepository.save(newExample);
}

findOne(id: number) {
    return this.exampleRepository.findOne({
        where: { id },
        relations: { relatedExample: true },
    });
}
```

**Controller:**

```typescript
@Post()
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}

@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.findOne(id);
}
```

---

### 21. Relación `@ManyToMany` DIRECTA (sin service de tabla intermedia)

**Con esto podrías:** cuando NO te piden una tabla intermedia con su propio
CRUD, sino una relación muchos-a-muchos simple manejada por TypeORM
automáticamente (usa una tabla intermedia oculta que tú no controlas).

```typescript
// entidad Example
@ManyToMany(() => RelatedExample)
@JoinTable({ name: 'example_related_example' }) // solo en el lado "dueño" de la relación
relatedExamples: RelatedExample[];

// service — crear asignando varias relaciones a la vez
async create(createExampleDto: CreateExampleDto) {
    const relatedExamples = await this.relatedExampleRepository.findBy({
        id: In(createExampleDto.relatedExampleIds), // array de ids
    });

    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        relatedExamples,
    });
    return await this.exampleRepository.save(newExample);
}

// agregar una relación más a un registro ya existente
async addRelatedExample(id: number, relatedExampleId: number) {
    const example = await this.exampleRepository.findOne({
        where: { id },
        relations: { relatedExamples: true },
    });
    if (!example) {
        throw new Error('Example not found');
    }

    const relatedExample = await this.relatedExampleRepository.findOneBy({ id: relatedExampleId });
    if (!relatedExample) {
        throw new Error('RelatedExample not found');
    }

    example.relatedExamples.push(relatedExample);
    return await this.exampleRepository.save(example);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}

@Patch(':id/related-examples/:relatedExampleId')
addRelatedExample(
    @Param('id', ParseIntPipe) id: number,
    @Param('relatedExampleId', ParseIntPipe) relatedExampleId: number,
) {
    return this.exampleService.addRelatedExample(id, relatedExampleId);
}
```

---

### 22. Filtrar con operadores de comparación (`MoreThan`, `LessThan`, `Between`)

**Con esto podrías:** "traer registros con precio mayor a X", "traer
registros creados entre dos fechas".

```typescript
import { MoreThan, LessThan, Between } from 'typeorm';

async findMoreThan(value: number) {
    return await this.exampleRepository.find({ where: { price: MoreThan(value) } });
}

async findLessThan(value: number) {
    return await this.exampleRepository.find({ where: { price: LessThan(value) } });
}

async findBetweenDates(start: Date, end: Date) {
    return await this.exampleRepository.find({ where: { createdAt: Between(start, end) } });
}
```

**Controller:**

```typescript
@Get('price/more-than')
findMoreThan(@Query('value', ParseIntPipe) value: number) {
    return this.exampleService.findMoreThan(value);
}

@Get('price/less-than')
findLessThan(@Query('value', ParseIntPipe) value: number) {
    return this.exampleService.findLessThan(value);
}

@Get('between-dates')
findBetweenDates(@Query('start') start: string, @Query('end') end: string) {
    return this.exampleService.findBetweenDates(new Date(start), new Date(end));
}
```

---

### 23. Filtrar por una lista de ids (`In`)

**Con esto podrías:** "traer solo los registros cuyos ids estén en esta
lista" (útil para selección múltiple desde el frontend).

```typescript
import { In } from 'typeorm';

async findByIds(ids: number[]) {
    return await this.exampleRepository.find({ where: { id: In(ids) } });
}
```

**Controller:**

```typescript
// se recibe como query string separado por comas, ej: /examples/by-ids?ids=1,2,3
@Get('by-ids')
findByIds(@Query('ids') ids: string) {
    const idsArray = ids.split(',').map(Number);
    return this.exampleService.findByIds(idsArray);
}
```

---

### 24. Consulta con QueryBuilder (cuando `find()` no alcanza)

**Con esto podrías:** consultas más complejas: joins manuales, agregaciones
(`COUNT`, `SUM`), condiciones dinámicas que `find()` no arma fácil.

```typescript
async findWithQueryBuilder(name: string) {
    return await this.exampleRepository
        .createQueryBuilder('example')
        .leftJoinAndSelect('example.relatedExample', 'relatedExample')
        .where('example.name LIKE :name', { name: `%${name}%` })
        .orderBy('example.id', 'ASC')
        .getMany();
}

// ejemplo con conteo agrupado
async countGroupedByRelated() {
    return await this.exampleRepository
        .createQueryBuilder('example')
        .select('relatedExample.name', 'relatedExampleName')
        .addSelect('COUNT(example.id)', 'total')
        .leftJoin('example.relatedExample', 'relatedExample')
        .groupBy('relatedExample.name')
        .getRawMany();
}
```

**Controller:**

```typescript
@Get('query-builder')
findWithQueryBuilder(@Query('name') name: string) {
    return this.exampleService.findWithQueryBuilder(name);
}

@Get('grouped-count')
countGroupedByRelated() {
    return this.exampleService.countGroupedByRelated();
}
```

---

### 25. Transacción (varias operaciones que deben tener éxito juntas)

**Con esto podrías:** cuando necesitas hacer 2+ operaciones en la BD y, si
una falla, se deben deshacer todas (ej: crear un `Example` y descontar
stock de otra tabla al mismo tiempo).

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class ExampleService {
    constructor(private dataSource: DataSource) {}

    async createWithTransaction(createExampleDto: CreateExampleDto) {
        return await this.dataSource.transaction(async (manager) => {
            const newExample = manager.create(Example, createExampleDto);
            const savedExample = await manager.save(newExample);

            // otra operación relacionada, dentro de la misma transacción
            await manager.update(RelatedExample, createExampleDto.relatedExampleId, {
                stock: () => 'stock - 1',
            });

            return savedExample;
            // si algo falla en cualquier punto, TypeORM revierte TODO automáticamente
        });
    }
}
```

**Controller:**

```typescript
@Post('with-transaction')
createWithTransaction(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.createWithTransaction(createExampleDto);
}
```

---

### 26. Usar excepciones propias de NestJS (en vez de `throw new Error`)

**Con esto podrías:** que los errores devuelvan el código HTTP correcto
(404, 409, etc.) en vez de un genérico 500 "Internal server error".

```typescript
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

async findOne(id: number) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException(`Example with id ${id} not found`); // devuelve 404
    }
    return example;
}

async create(createExampleDto: CreateExampleDto) {
    const existe = await this.exampleRepository.existsBy({ name: createExampleDto.name });
    if (existe) {
        throw new ConflictException('A record with this name already exists'); // devuelve 409
    }
    // ...
}

async someValidation(value: number) {
    if (value < 0) {
        throw new BadRequestException('Value cannot be negative'); // devuelve 400
    }
}
```

**Controller:**

```typescript
// El controller NO cambia en nada respecto a los bloques 1 y 7:
// Nest detecta el tipo de excepción lanzada en el service y arma
// automáticamente la respuesta HTTP con el código correcto.
// No hace falta ningún try/catch en el controller.
@Post()
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}

@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.findOne(id);
}
```

---

### 27. Validaciones en el DTO con `class-validator`

**Con esto podrías:** que NestJS rechace automáticamente datos mal
formados antes de que lleguen al service (requiere `ValidationPipe` global
en `main.ts`: `app.useGlobalPipes(new ValidationPipe())`).

```typescript
import {
    IsString,
    IsNotEmpty,
    IsInt,
    IsOptional,
    IsEmail,
    MinLength,
    MaxLength,
    Min,
    Max,
    IsPositive,
    IsBoolean,
    IsDateString,
} from 'class-validator';

export class CreateExampleDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;

    @IsInt()
    @IsPositive()
    relatedExampleId: number;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    percentage?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsDateString()
    startDate?: string;
}
```

**Controller:**

```typescript
// El controller tampoco cambia: el DTO se sigue recibiendo con @Body()
// tal cual en el bloque 1. La validación ocurre antes de entrar al método,
// gracias al ValidationPipe global registrado en main.ts:
//
//   app.useGlobalPipes(new ValidationPipe());
//
// Si algo no cumple las reglas del DTO, Nest responde 400 automáticamente
// sin que el método del controller ni del service lleguen a ejecutarse.
@Post()
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

---

## Tabla resumen — ¿qué bloque uso según lo que me piden?

| El problema pide...                                       | Usa el bloque # |
| --------------------------------------------------------- | --------------- |
| Crear entidad simple (sin relación)                       | 1               |
| Crear entidad que depende de OTRA (1 relación)            | 2               |
| Crear tabla intermedia (2 relaciones)                     | 3               |
| Evitar asociación duplicada                               | 4               |
| Listar todo con su relación                               | 5               |
| Listar con relación anidada (2 niveles)                   | 6               |
| Buscar uno por id                                         | 7               |
| Filtrar por campo de la relación                          | 8               |
| Búsqueda parcial de texto                                 | 9               |
| Actualizar campos simples                                 | 10              |
| Actualizar cambiando 1 relación                           | 11              |
| Actualizar cambiando 2 relaciones                         | 12              |
| Eliminar simple                                           | 13              |
| Eliminar con validación de dependencias                   | 14              |
| Contar todos                                              | 15              |
| Contar filtrando por relación                             | 16              |
| Evitar nombres duplicados al crear                        | 17              |
| Traer los últimos N                                       | 18              |
| Paginación                                                | 19              |
| Relación uno a uno (`@OneToOne`)                          | 20              |
| Relación muchos a muchos directa (`@ManyToMany`)          | 21              |
| Filtrar por mayor/menor que, o rango de fechas            | 22              |
| Filtrar por una lista de ids                              | 23              |
| Consulta compleja / agregaciones (QueryBuilder)           | 24              |
| Varias operaciones que deben ocurrir juntas (transacción) | 25              |
| Que los errores devuelvan el código HTTP correcto         | 26              |
| Validar el formato de los datos que llegan (DTO)          | 27              |
