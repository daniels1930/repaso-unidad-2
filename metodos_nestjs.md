# Recetario de métodos — Service + Controller NestJS/TypeORM (versión genérica)

> **Cómo usar este recetario:** en vez de nombres reales (Producto, Cliente,
> Categoría...) el código usa nombres placeholder consistentes en TODOS los
> bloques. Así, para adaptar un bloque a tu proyecto, hacés "buscar y
> reemplazar" de estos nombres por los tuyos:
>
> | Placeholder                                                                                          | Qué representa                                                                              | Ejemplo de reemplazo                             |
> | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------ |
> | `Example` / `example`                                                                                | La entidad principal sobre la que estás trabajando                                          | `Producto` / `producto`                          |
> | `RelatedExample` / `relatedExample`                                                                  | Una entidad de la que `Example` depende (relación hacia afuera)                             | `Categoria`, `Cliente`                           |
> | `SecondRelatedExample` / `secondRelatedExample`                                                      | Una SEGUNDA relación, solo aparece en tablas intermedias (2 relaciones)                     | `Curso` (si `Example` es la tabla `Inscripcion`) |
> | `NestedRelatedExample` / `nestedRelatedExample`                                                      | Una relación DENTRO de `RelatedExample` (2 niveles de anidación)                            | `Ciudad` (dentro de `Cliente`)                   |
> | `DependentExample` / `dependentExampleRepository`                                                    | Una entidad que depende de `Example` (relación hacia adentro, para validar antes de borrar) | `Producto` (si `Example` es `Categoria`)         |
> | `campo`, `campoTexto`, `campoNumerico`, `campoFecha`, `campoUnico`, `campoBooleano`, `campoOpcional` | Nombres de columnas propias de `Example`                                                    | `nombre`, `precio`, `stock`, `email`, `estado`   |
>
> En todos los controllers se asume una inyección estándar, por ejemplo:
>
> ```typescript
> @Controller('examples')
> export class ExampleController {
>     constructor(private readonly exampleService: ExampleService) {}
> }
> ```
>
> Y que `ParseIntPipe` se importa de `@nestjs/common` cuando se necesita.

---

### 1. Crear un registro simple, sin relaciones

Cuando la entidad no depende de ninguna otra tabla — solo tiene sus
propias columnas. _(Ejemplo real: crear una Categoría de productos,
que solo tiene nombre — aquí `Example` = `Categoria`)_

```typescript
async create(createExampleDto: CreateExampleDto): Promise<Example> {
    const nuevoExample = this.exampleRepository.create(createExampleDto);
    return await this.exampleRepository.save(nuevoExample);
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

La entidad nueva necesita "engancharse" a otra que ya existe en la base
de datos (te llega su id en el DTO). _(Ejemplo real: crear un Pedido
que pertenece a un Cliente ya registrado — `Example` = `Pedido`,
`RelatedExample` = `Cliente`)_

```typescript
async create(createExampleDto: CreateExampleDto) {
    const relatedExample = await this.relatedExampleService.findOne(createExampleDto.relatedExampleId);
    if (!relatedExample) {
        throw new Error('RelatedExample no encontrado');
    }

    const nuevoExample = this.exampleRepository.create({
        ...createExampleDto,
        relatedExample,
    });
    return await this.exampleRepository.save(nuevoExample);
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

Una tabla que solo existe para unir dos entidades — típico de una
relación muchos-a-muchos con tabla propia. _(Ejemplo real: una
Inscripción que une a un Estudiante con un Curso — `Example` =
`Inscripcion`, `RelatedExample` = `Estudiante`, `SecondRelatedExample`
= `Curso`)_

```typescript
async create(createExampleDto: CreateExampleDto) {
    const relatedExample = await this.relatedExampleService.findOne(createExampleDto.relatedExampleId);
    const secondRelatedExample = await this.secondRelatedExampleService.findOne(createExampleDto.secondRelatedExampleId);

    if (!relatedExample) {
        throw new Error('RelatedExample no encontrado');
    }
    if (!secondRelatedExample) {
        throw new Error('SecondRelatedExample no encontrado');
    }

    const nuevoExample = this.exampleRepository.create({
        relatedExample,
        secondRelatedExample,
    });

    return await this.exampleRepository.save(nuevoExample);
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

Evita que se repita la misma combinación dos veces. _(Ejemplo real:
que un mismo Estudiante no pueda inscribirse dos veces al mismo Curso)_

```typescript
async create(createExampleDto: CreateExampleDto) {
    const relatedExample = await this.relatedExampleService.findOne(createExampleDto.relatedExampleId);
    if (!relatedExample) {
        throw new Error('RelatedExample no encontrado');
    }

    const secondRelatedExample = await this.secondRelatedExampleService.findOne(createExampleDto.secondRelatedExampleId);
    if (!secondRelatedExample) {
        throw new Error('SecondRelatedExample no encontrado');
    }

    const yaExiste = await this.exampleRepository.findOne({
        where: {
            relatedExample: { id: relatedExample.id },
            secondRelatedExample: { id: secondRelatedExample.id },
        },
    });
    if (yaExiste) {
        throw new Error('Ya existe un Example con esa combinación');
    }

    const nuevoExample = this.exampleRepository.create({ relatedExample, secondRelatedExample });
    return await this.exampleRepository.save(nuevoExample);
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

Lista registros mostrando también el objeto relacionado completo, no
solo su id. _(Ejemplo real: listar Productos mostrando su Categoría
completa, no solo `categoriaId`)_

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

Cuando la relación que traés tiene, a su vez, otra relación adentro.
_(Ejemplo real: listar Pedidos con su Cliente, y dentro del cliente, la
Ciudad a la que pertenece — `NestedRelatedExample` = `Ciudad`)_

```typescript
findAll() {
    return this.exampleRepository.find({
        relations: {
            relatedExample: {
                nestedRelatedExample: true,
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

El clásico `findOne` de cualquier CRUD.

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

El filtro no vive en la propia tabla sino en la tabla relacionada.
_(Ejemplo real: traer todos los Productos cuya Categoría se llame
"Electrónica" — reemplazá `campo` por la columna real, ej. `nombre`)_

```typescript
async findByRelatedExampleField(valor: string) {
    return await this.exampleRepository.find({
        where: { relatedExample: { campo: valor } },
        relations: { relatedExample: true },
        order: { id: 'ASC' },
    });
}
```

**Controller:**

```typescript
@Get('por-relacionado')
findByRelatedExampleField(@Query('valor') valor: string) {
    return this.exampleService.findByRelatedExampleField(valor);
}
```

---

### 9. Buscar por texto parcial (LIKE / contiene)

Un buscador tipo "encontrame los Example cuyo campo contenga esta
palabra", sin coincidencia exacta.

```typescript
import { Like } from 'typeorm';

async searchByField(texto: string) {
    return await this.exampleRepository.find({
        where: { campo: Like(`%${texto}%`) },
    });
}
```

**Controller:**

```typescript
@Get('buscar')
searchByField(@Query('texto') texto: string) {
    return this.exampleService.searchByField(texto);
}
```

---

### 10. Actualizar campos simples (sin tocar relaciones)

Cuando el update solo toca columnas propias.

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

Cambiar a qué entidad relacionada apunta un registro que ya existe.
_(Ejemplo real: reasignar un Pedido a otro Cliente)_

```typescript
async update(id: number, updateExampleDto: UpdateExampleDto) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new Error('Example no encontrado');
    }

    if (updateExampleDto.relatedExampleId) {
        const relatedExample = await this.relatedExampleService.findOne(updateExampleDto.relatedExampleId);
        if (!relatedExample) {
            throw new Error('RelatedExample no encontrado');
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

_(Ejemplo real: cambiar el Estudiante o el Curso de una Inscripción ya
existente)_

```typescript
async update(id: number, updateExampleDto: UpdateExampleDto) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new Error('Example no encontrado');
    }

    if (updateExampleDto.relatedExampleId) {
        const relatedExample = await this.relatedExampleService.findOne(updateExampleDto.relatedExampleId);
        if (!relatedExample) {
            throw new Error('RelatedExample no encontrado');
        }
        example.relatedExample = relatedExample;
    }

    if (updateExampleDto.secondRelatedExampleId) {
        const secondRelatedExample = await this.secondRelatedExampleService.findOne(updateExampleDto.secondRelatedExampleId);
        if (!secondRelatedExample) {
            throw new Error('SecondRelatedExample no encontrado');
        }
        example.secondRelatedExample = secondRelatedExample;
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

El `remove` estándar, incluso para tablas intermedias — borrar nunca
necesita resolver relaciones.

```typescript
async remove(id: number) {
    const resultado = await this.exampleRepository.delete(id);
    if (resultado.affected) {
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

No dejar borrar un registro si otros todavía dependen de él. _(Ejemplo
real: no permitir borrar una Categoría si todavía tiene Productos
asociados — `DependentExample` = `Producto`)_

```typescript
async remove(id: number) {
    const dependientesAsociados = await this.dependentExampleRepository.count({
        where: { example: { id } },
    });
    if (dependientesAsociados > 0) {
        throw new Error('No se puede eliminar: hay registros dependientes asociados a este Example');
    }

    const resultado = await this.exampleRepository.delete(id);
    if (resultado.affected) {
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

```typescript
async count(): Promise<number> {
    return await this.exampleRepository.count();
}
```

**Controller:**

```typescript
// OJO: esta ruta debe declararse ANTES de @Get(':id'),
// si no, Nest intenta interpretar "count" como si fuera el id.
@Get('count')
count() {
    return this.exampleService.count();
}
```

---

### 16. Contar filtrando por relación

_(Ejemplo real: "¿cuántos productos tiene tal categoría?")_

```typescript
async countByRelatedExample(valor: string) {
    return await this.exampleRepository.count({
        where: { relatedExample: { campo: valor } },
    });
}
```

**Controller:**

```typescript
@Get('count/por-relacionado')
countByRelatedExample(@Query('valor') valor: string) {
    return this.exampleService.countByRelatedExample(valor);
}
```

---

### 17. Verificar si ya existe antes de crear (evitar duplicados por campo único)

_(Ejemplo real: no permitir dos Categorías con el mismo nombre —
reemplazá `campoUnico` por la columna real, ej. `nombre`)_

```typescript
async create(createExampleDto: CreateExampleDto): Promise<Example> {
    const existe = await this.exampleRepository.existsBy({ campoUnico: createExampleDto.campoUnico });
    if (existe) {
        throw new Error('Ya existe un Example con ese valor único');
    }

    const nuevoExample = this.exampleRepository.create(createExampleDto);
    return await this.exampleRepository.save(nuevoExample);
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

_(Ejemplo real: mostrar los últimos 5 Pedidos que entraron)_

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
@Get('recientes')
findLatest(@Query('limit', ParseIntPipe) limit: number) {
    return this.exampleService.findLatest(limit);
}
```

---

### 19. Paginar resultados (con total)

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
@Get('paginado')
findPaginated(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
) {
    return this.exampleService.findPaginated(page, limit);
}
```

---

### 20. Relación `@OneToOne` (uno a uno)

Cuando una entidad tiene exactamente UN registro relacionado y único
de otra tabla. _(Ejemplo real: un Usuario que tiene un único Perfil —
`Example` = `Usuario`, `RelatedExample` = `Perfil`)_

```typescript
// entidad Example
@OneToOne(() => RelatedExample, { cascade: true })
@JoinColumn({ name: 'related_example_id' })
relatedExample: RelatedExample;

// service
async create(createExampleDto: CreateExampleDto) {
    const nuevoExample = this.exampleRepository.create({
        ...createExampleDto,
        relatedExample: createExampleDto.relatedExample, // objeto completo, se crea en cascada
    });
    return await this.exampleRepository.save(nuevoExample);
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

Cuando NO necesitás una tabla intermedia con su propio CRUD, sino una
relación muchos-a-muchos simple que maneja TypeORM automáticamente.
_(Ejemplo real: un Libro puede tener varios Autores — `Example` =
`Libro`, `RelatedExample` = `Autor`)_

```typescript
// entidad Example
@ManyToMany(() => RelatedExample)
@JoinTable({ name: 'example_related_example' }) // solo en el lado "dueño" de la relación
relatedExamples: RelatedExample[];

// service — crear asignando varios relacionados a la vez
async create(createExampleDto: CreateExampleDto) {
    const relatedExamples = await this.relatedExampleRepository.findBy({
        id: In(createExampleDto.relatedExampleIds), // array de ids
    });

    const nuevoExample = this.exampleRepository.create({
        ...createExampleDto,
        relatedExamples,
    });
    return await this.exampleRepository.save(nuevoExample);
}

// agregar un relacionado más a un Example ya existente
async addRelatedExample(id: number, relatedExampleId: number) {
    const example = await this.exampleRepository.findOne({
        where: { id },
        relations: { relatedExamples: true },
    });
    if (!example) {
        throw new Error('Example no encontrado');
    }

    const relatedExample = await this.relatedExampleRepository.findOneBy({ id: relatedExampleId });
    if (!relatedExample) {
        throw new Error('RelatedExample no encontrado');
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

_(Ejemplo real: "productos con precio mayor a X" o "pedidos hechos
entre dos fechas" — reemplazá `campoNumerico`/`campoFecha` por tus
columnas reales)_

```typescript
import { MoreThan, LessThan, Between } from 'typeorm';

async findMoreThan(valor: number) {
    return await this.exampleRepository.find({ where: { campoNumerico: MoreThan(valor) } });
}

async findLessThan(valor: number) {
    return await this.exampleRepository.find({ where: { campoNumerico: LessThan(valor) } });
}

async findBetweenDates(inicio: Date, fin: Date) {
    return await this.exampleRepository.find({ where: { campoFecha: Between(inicio, fin) } });
}
```

**Controller:**

```typescript
@Get('campo/mayor-a')
findMoreThan(@Query('valor', ParseIntPipe) valor: number) {
    return this.exampleService.findMoreThan(valor);
}

@Get('campo/menor-a')
findLessThan(@Query('valor', ParseIntPipe) valor: number) {
    return this.exampleService.findLessThan(valor);
}

@Get('entre-fechas')
findBetweenDates(@Query('inicio') inicio: string, @Query('fin') fin: string) {
    return this.exampleService.findBetweenDates(new Date(inicio), new Date(fin));
}
```

---

### 23. Filtrar por una lista de ids (`In`)

Útil cuando el frontend te manda una selección múltiple. _(Ejemplo
real: traer los Productos de un carrito de compras a partir de sus
ids)_

```typescript
import { In } from 'typeorm';

async findByIds(ids: number[]) {
    return await this.exampleRepository.find({ where: { id: In(ids) } });
}
```

**Controller:**

```typescript
// se recibe como query string separado por comas, ej: /examples/por-ids?ids=1,2,3
@Get('por-ids')
findByIds(@Query('ids') ids: string) {
    const idsArray = ids.split(',').map(Number);
    return this.exampleService.findByIds(idsArray);
}
```

---

### 24. Consulta con QueryBuilder (cuando `find()` no alcanza)

Para joins manuales, agregaciones (`COUNT`, `SUM`) o condiciones
dinámicas.

```typescript
async findWithQueryBuilder(texto: string) {
    return await this.exampleRepository
        .createQueryBuilder('example')
        .leftJoinAndSelect('example.relatedExample', 'relatedExample')
        .where('example.campo LIKE :texto', { texto: `%${texto}%` })
        .orderBy('example.id', 'ASC')
        .getMany();
}

// reporte: cuántos Example tiene cada RelatedExample
async countExamplesPorRelatedExample() {
    return await this.exampleRepository
        .createQueryBuilder('example')
        .select('relatedExample.nombre', 'relatedExampleNombre')
        .addSelect('COUNT(example.id)', 'total')
        .leftJoin('example.relatedExample', 'relatedExample')
        .groupBy('relatedExample.nombre')
        .getRawMany();
}
```

**Controller:**

```typescript
@Get('query-builder')
findWithQueryBuilder(@Query('texto') texto: string) {
    return this.exampleService.findWithQueryBuilder(texto);
}

@Get('reportes/por-relacionado')
countExamplesPorRelatedExample() {
    return this.exampleService.countExamplesPorRelatedExample();
}
```

---

### 25. Transacción (varias operaciones que deben tener éxito juntas)

_(Ejemplo real: crear un Pedido y descontar el Stock del producto — si
algo falla, no querés que se descuente el stock sin que exista el
pedido)_

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class ExampleService {
    constructor(private dataSource: DataSource) {}

    async createWithTransaction(createExampleDto: CreateExampleDto) {
        return await this.dataSource.transaction(async (manager) => {
            const nuevoExample = manager.create(Example, createExampleDto);
            const exampleGuardado = await manager.save(nuevoExample);

            // actualiza un campo del relacionado, dentro de la misma transacción
            await manager.update(RelatedExample, createExampleDto.relatedExampleId, {
                campoNumerico: () => 'campoNumerico - 1',
            });

            return exampleGuardado;
            // si algo falla en cualquier punto, TypeORM revierte TODO automáticamente
        });
    }
}
```

**Controller:**

```typescript
@Post('con-transaccion')
createWithTransaction(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.createWithTransaction(createExampleDto);
}
```

---

### 26. Usar excepciones propias de NestJS (en vez de `throw new Error`)

Para que los errores devuelvan el código HTTP correcto (404, 409, etc.)
en vez de un genérico 500.

```typescript
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

async findOne(id: number) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException(`Example con id ${id} no encontrado`); // devuelve 404
    }
    return example;
}

async create(createExampleDto: CreateExampleDto) {
    const existe = await this.exampleRepository.existsBy({ campoUnico: createExampleDto.campoUnico });
    if (existe) {
        throw new ConflictException('Ya existe un Example con ese valor único'); // devuelve 409
    }
    // ...
}

async someValidation(valor: number) {
    if (valor < 0) {
        throw new BadRequestException('El valor no puede ser negativo'); // devuelve 400
    }
}
```

**Controller:**

```typescript
// El controller no cambia respecto a los bloques 1 y 7: Nest detecta
// el tipo de excepción lanzada en el service y arma automáticamente
// la respuesta HTTP con el código correcto. No hace falta try/catch aquí.
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

Para que NestJS rechace automáticamente datos mal formados antes de que
lleguen al service (requiere `ValidationPipe` global en `main.ts`:
`app.useGlobalPipes(new ValidationPipe())`).

```typescript
import { IsString, IsNotEmpty, IsInt, IsOptional, MaxLength, Min, IsPositive, IsBoolean } from 'class-validator';

export class CreateExampleDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    campoTexto: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    campoOpcional?: string;

    @IsInt()
    @IsPositive()
    relatedExampleId: number;

    @IsInt()
    @Min(0)
    campoNumerico: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    campoOpcionalNumerico?: number;

    @IsOptional()
    @IsBoolean()
    campoBooleano?: boolean;
}
```

**Controller:**

```typescript
// El controller tampoco cambia: el DTO se sigue recibiendo con @Body()
// tal cual en el bloque 1. La validación ocurre antes de entrar al método,
// gracias al ValidationPipe global registrado en main.ts.
// Si algo no cumple las reglas del DTO, Nest responde 400 automáticamente.
@Post()
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

---

### 28. Buscar por texto parcial ignorando mayúsculas y minúsculas (`ILike`)

Igual que `Like`, pero sin importar mayúsculas/minúsculas — muy usado
con PostgreSQL.

```typescript
import { ILike } from 'typeorm';

async searchByField(texto: string) {
    return await this.exampleRepository.find({
        where: { campo: ILike(`%${texto}%`) },
    });
}
```

**Controller:**

```typescript
@Get('buscar')
searchByField(@Query('texto') texto: string) {
    return this.exampleService.searchByField(texto);
}
```

---

### 29. Filtrar por valores mayores o iguales (`MoreThanOrEqual`)

```typescript
import { MoreThanOrEqual } from 'typeorm';

async findMoreThanOrEqual(valor: number) {
    return await this.exampleRepository.find({
        where: { campoNumerico: MoreThanOrEqual(valor) },
    });
}
```

**Controller:**

```typescript
@Get('campo/desde')
findMoreThanOrEqual(@Query('valor', ParseIntPipe) valor: number) {
    return this.exampleService.findMoreThanOrEqual(valor);
}
```

---

### 30. Filtrar por valores menores o iguales (`LessThanOrEqual`)

```typescript
import { LessThanOrEqual } from 'typeorm';

async findLessThanOrEqual(valor: number) {
    return await this.exampleRepository.find({
        where: { campoNumerico: LessThanOrEqual(valor) },
    });
}
```

**Controller:**

```typescript
@Get('campo/hasta')
findLessThanOrEqual(@Query('valor', ParseIntPipe) valor: number) {
    return this.exampleService.findLessThanOrEqual(valor);
}
```

---

### 31. Buscar registros donde un campo sea NULL (`IsNull`)

`IsNull()` equivale a `WHERE columna IS NULL`. _(Ejemplo real: listar
Clientes que no cargaron ningún correo)_

```typescript
import { IsNull } from 'typeorm';

async findWithNullField() {
    return await this.exampleRepository.find({
        where: { campoOpcional: IsNull() },
    });
}
```

**Controller:**

```typescript
@Get('sin-campo')
findWithNullField() {
    return this.exampleService.findWithNullField();
}
```

---

### 32. Negar una condición (`Not`)

`Not()` también sirve para negar otros operadores, como `Not(In([...]))`
o `Not(IsNull())`. _(Ejemplo real: traer todos los Pedidos cuyo estado
no sea "cancelado")_

```typescript
import { Not } from 'typeorm';

async findExcludingValue(valor: string) {
    return await this.exampleRepository.find({
        where: { campo: Not(valor) },
    });
}
```

**Controller:**

```typescript
@Get('excluyendo')
findExcludingValue(@Query('valor') valor: string) {
    return this.exampleService.findExcludingValue(valor);
}
```

---

### 33. Excepciones HTTP estándar en NestJS

Cada error tiene el código HTTP que le corresponde, en vez de que todo
termine como un 500 genérico. Se lanzan desde el service, y NestJS
arma automáticamente la respuesta HTTP.

| Excepción en NestJS             | Código HTTP | Cuándo usarla                                                  |
| ------------------------------- | ----------- | -------------------------------------------------------------- |
| `BadRequestException`           | 400         | Datos de entrada con formato o validaciones incorrectas.       |
| `UnauthorizedException`         | 401         | Falta de credenciales o token expirado/inválido.               |
| `ForbiddenException`            | 403         | Está autenticado, pero no tiene permiso para esa acción.       |
| `NotFoundException`             | 404         | El recurso solicitado no existe.                               |
| `MethodNotAllowedException`     | 405         | El verbo HTTP usado no está soportado en esa ruta.             |
| `NotAcceptableException`        | 406         | El formato pedido no es aceptable según las cabeceras.         |
| `RequestTimeoutException`       | 408         | Se agotó el tiempo de respuesta.                               |
| `ConflictException`             | 409         | Conflicto con el estado actual (ej. un valor único duplicado). |
| `GoneException`                 | 410         | El recurso existió, pero se eliminó permanentemente.           |
| `PayloadTooLargeException`      | 413         | El archivo o body de la petición supera el límite permitido.   |
| `UnsupportedMediaTypeException` | 415         | Tipo de contenido no soportado por el servidor.                |
| `UnprocessableEntityException`  | 422         | Errores semánticos de validación más detallados.               |
| `InternalServerErrorException`  | 500         | Error no controlado o fallo inesperado.                        |
| `NotImplementedException`       | 501         | Funcionalidad todavía no implementada.                         |
| `BadGatewayException`           | 502         | Falla en un servicio upstream o proxy intermediario.           |
| `ServiceUnavailableException`   | 503         | El servidor está sobrecargado o en mantenimiento.              |
| `GatewayTimeoutException`       | 504         | Se agotó el tiempo esperando una respuesta externa.            |

**Ejemplo: `NotFoundException`** — devolver 404 cuando el `Example`
buscado no existe.

```typescript
import { NotFoundException } from '@nestjs/common';

async findOne(id: number) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException(`Example con id ${id} no encontrado`);
    }
    return example;
}
```

**Controller:**

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.findOne(id);
}
```

**Ejemplo: `ConflictException`** — indicar que ya existe un `Example`
con ese valor único.

```typescript
import { ConflictException } from '@nestjs/common';

async create(createExampleDto: CreateExampleDto) {
    const existe = await this.exampleRepository.existsBy({
        campoUnico: createExampleDto.campoUnico,
    });

    if (existe) {
        throw new ConflictException('Ya existe un Example con ese valor único');
    }

    const nuevoExample = this.exampleRepository.create(createExampleDto);
    return await this.exampleRepository.save(nuevoExample);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

**Ejemplo: `BadRequestException`** — rechazar un valor negativo.

```typescript
import { BadRequestException } from '@nestjs/common';

async aplicarAjuste(valor: number) {
    if (valor < 0) {
        throw new BadRequestException('El valor no puede ser negativo');
    }
}
```

**Controller:**

```typescript
@Post('aplicar-ajuste')
aplicarAjuste(@Body('valor') valor: number) {
    return this.exampleService.aplicarAjuste(valor);
}
```

**Ejemplo: `UnauthorizedException`** — no se mandaron credenciales
válidas al intentar loguearse.

```typescript
import { UnauthorizedException } from '@nestjs/common';

async authenticate() {
    const autenticado = false;
    if (!autenticado) {
        throw new UnauthorizedException('Credenciales inválidas o faltantes');
    }
}
```

**Controller:**

```typescript
@Post('login')
authenticate() {
    return this.exampleService.authenticate();
}
```

**Ejemplo: `ForbiddenException`** — usuario autenticado, pero sin
permisos para esa acción.

```typescript
import { ForbiddenException } from '@nestjs/common';

async checkPermission() {
    const tienePermiso = false;
    if (!tienePermiso) {
        throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }
}
```

**Controller:**

```typescript
@Get('verificar-permiso')
checkPermission() {
    return this.exampleService.checkPermission();
}
```

**Regla importante:** el controller nunca necesita `try/catch` para
estas excepciones. Se lanzan desde el service y NestJS arma la
respuesta HTTP automáticamente.

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
| Evitar valores duplicados en un campo único al crear      | 17              |
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
| Buscar texto ignorando mayúsculas/minúsculas (`ILike`)    | 28              |
| Filtrar por mayor o igual que (`MoreThanOrEqual`)         | 29              |
| Filtrar por menor o igual que (`LessThanOrEqual`)         | 30              |
| Buscar valores NULL (`IsNull`)                            | 31              |
| Negar una condición (`Not`)                               | 32              |
| Manejar excepciones HTTP estándar                         | 33              |
