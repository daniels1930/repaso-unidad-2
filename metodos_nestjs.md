# Recetario de métodos — Service + Controller NestJS/TypeORM (código en inglés, consistente)

> **Cómo usar este recetario:** en vez de nombres reales (Producto, Cliente,
> Categoría...) el código usa nombres placeholder en INGLÉS, consistentes en
> TODOS los bloques. Para adaptar un bloque a tu proyecto, hacés "buscar y
> reemplazar" de estos placeholders por los tuyos (también en inglés, para
> que tu código base quede uniforme):

| Placeholder                                                                                       | Qué representa                                                                              | Ejemplo de reemplazo                             |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `Example` / `example`                                                                             | La entidad principal sobre la que estás trabajando                                          | `Product` / `product`                            |
| `RelatedExample` / `relatedExample`                                                               | Una entidad de la que `Example` depende (relación hacia afuera)                             | `Category`, `Customer`                           |
| `SecondRelatedExample` / `secondRelatedExample`                                                   | Una SEGUNDA relación, solo aparece en tablas intermedias (2 relaciones)                     | `Course` (si `Example` es la tabla `Enrollment`) |
| `NestedRelatedExample` / `nestedRelatedExample`                                                   | Una relación DENTRO de `RelatedExample` (2 niveles de anidación)                            | `City` (dentro de `Customer`)                    |
| `DependentExample` / `dependentExampleRepository`                                                 | Una entidad que depende de `Example` (relación hacia adentro, para validar antes de borrar) | `Product` (si `Example` es `Category`)           |
| `field`, `textField`, `numericField`, `dateField`, `uniqueField`, `booleanField`, `optionalField` | Nombres de columnas propias de `Example`                                                    | `name`, `price`, `stock`, `email`, `status`      |

**Reglas de nombres que se repiten en TODOS los bloques** (aplicá estas
mismas reglas cuando pegues el código en tu proyecto, así queda todo
uniforme):

- La instancia creada antes de guardar → siempre `newExample` (nunca
  mezclar con `nuevoExample`, `example2`, etc.).
- Un registro buscado para validar/actualizar → `example`.
- Una validación booleana de existencia → `exists` / `alreadyExists`.
- Inputs genéricos de búsqueda → `value`, `text`, `ids`, `page`, `limit`.
- Errores → siempre lanzados con una excepción de NestJS (`NotFoundException`,
  `ConflictException`, `BadRequestException`, etc.), nunca `throw new Error(...)`.
- Rutas del controller → siempre en kebab-case en inglés (`'search'`,
  `'latest'`, `'paginated'`, etc.), nunca mezclado con español.

En todos los controllers se asume una inyección estándar, por ejemplo:

```typescript
@Controller('examples')
export class ExampleController {
    constructor(private readonly exampleService: ExampleService) {}
}
```

Y que `ParseIntPipe` se importa de `@nestjs/common` cuando se necesita.

---

### 1. Crear un registro simple, sin relaciones

Cuando la entidad no depende de ninguna otra tabla — solo tiene sus
propias columnas. _(Ejemplo real: crear una Categoría de productos,
que solo tiene nombre — aquí `Example` = `Category`)_

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

La entidad nueva necesita "engancharse" a otra que ya existe en la base
de datos (te llega su id en el DTO). _(Ejemplo real: crear una Order
que pertenece a un Customer ya registrado — `Example` = `Order`,
`RelatedExample` = `Customer`)_

```typescript
async create(createExampleDto: CreateExampleDto) {
    const relatedExample = await this.relatedExampleService.findOne(createExampleDto.relatedExampleId);
    if (!relatedExample) {
        throw new NotFoundException('RelatedExample not found');
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

Una tabla que solo existe para unir dos entidades — típico de una
relación muchos-a-muchos con tabla propia. _(Ejemplo real: un
Enrollment que une a un Student con un Course — `Example` =
`Enrollment`, `RelatedExample` = `Student`, `SecondRelatedExample` =
`Course`)_

```typescript
async create(createExampleDto: CreateExampleDto) {
    const relatedExample = await this.relatedExampleService.findOne(createExampleDto.relatedExampleId);
    const secondRelatedExample = await this.secondRelatedExampleService.findOne(createExampleDto.secondRelatedExampleId);

    if (!relatedExample) {
        throw new NotFoundException('RelatedExample not found');
    }
    if (!secondRelatedExample) {
        throw new NotFoundException('SecondRelatedExample not found');
    }

    const newExample = this.exampleRepository.create({
        relatedExample,
        secondRelatedExample,
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

Evita que se repita la misma combinación dos veces. _(Ejemplo real:
que un mismo Student no pueda inscribirse dos veces al mismo Course)_

```typescript
async create(createExampleDto: CreateExampleDto) {
    const relatedExample = await this.relatedExampleService.findOne(createExampleDto.relatedExampleId);
    if (!relatedExample) {
        throw new NotFoundException('RelatedExample not found');
    }

    const secondRelatedExample = await this.secondRelatedExampleService.findOne(createExampleDto.secondRelatedExampleId);
    if (!secondRelatedExample) {
        throw new NotFoundException('SecondRelatedExample not found');
    }

    const alreadyExists = await this.exampleRepository.findOne({
        where: {
            relatedExample: { id: relatedExample.id },
            secondRelatedExample: { id: secondRelatedExample.id },
        },
    });
    if (alreadyExists) {
        throw new ConflictException('An Example with that combination already exists');
    }

    const newExample = this.exampleRepository.create({ relatedExample, secondRelatedExample });
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

Lista registros mostrando también el objeto relacionado completo, no
solo su id. _(Ejemplo real: listar Products mostrando su Category
completa, no solo `categoryId`)_

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
_(Ejemplo real: listar Orders con su Customer, y dentro del customer,
la City a la que pertenece — `NestedRelatedExample` = `City`)_

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
_(Ejemplo real: traer todos los Products cuya Category se llame
"Electronics" — reemplazá `field` por la columna real, ej. `name`)_

```typescript
async findByRelatedExampleField(value: string) {
    return await this.exampleRepository.find({
        where: { relatedExample: { field: value } },
        relations: { relatedExample: true },
        order: { id: 'ASC' },
    });
}
```

**Controller:**

```typescript
@Get('by-related')
findByRelatedExampleField(@Query('value') value: string) {
    return this.exampleService.findByRelatedExampleField(value);
}
```

---

### 9. Buscar por texto parcial (LIKE / contiene)

Un buscador tipo "encontrame los Example cuyo campo contenga esta
palabra", sin coincidencia exacta.

```typescript
import { Like } from 'typeorm';

async searchByField(text: string) {
    return await this.exampleRepository.find({
        where: { field: Like(`%${text}%`) },
    });
}
```

**Controller:**

```typescript
@Get('search')
searchByField(@Query('text') text: string) {
    return this.exampleService.searchByField(text);
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
_(Ejemplo real: reasignar una Order a otro Customer)_

```typescript
async update(id: number, updateExampleDto: UpdateExampleDto) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException('Example not found');
    }

    if (updateExampleDto.relatedExampleId) {
        const relatedExample = await this.relatedExampleService.findOne(updateExampleDto.relatedExampleId);
        if (!relatedExample) {
            throw new NotFoundException('RelatedExample not found');
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

_(Ejemplo real: cambiar el Student o el Course de un Enrollment ya
existente)_

```typescript
async update(id: number, updateExampleDto: UpdateExampleDto) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException('Example not found');
    }

    if (updateExampleDto.relatedExampleId) {
        const relatedExample = await this.relatedExampleService.findOne(updateExampleDto.relatedExampleId);
        if (!relatedExample) {
            throw new NotFoundException('RelatedExample not found');
        }
        example.relatedExample = relatedExample;
    }

    if (updateExampleDto.secondRelatedExampleId) {
        const secondRelatedExample = await this.secondRelatedExampleService.findOne(updateExampleDto.secondRelatedExampleId);
        if (!secondRelatedExample) {
            throw new NotFoundException('SecondRelatedExample not found');
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

No dejar borrar un registro si otros todavía dependen de él. _(Ejemplo
real: no permitir borrar una Category si todavía tiene Products
asociados — `DependentExample` = `Product`)_

```typescript
async remove(id: number) {
    const dependentCount = await this.dependentExampleRepository.count({
        where: { example: { id } },
    });
    if (dependentCount > 0) {
        throw new ConflictException('Cannot delete: there are dependent records associated with this Example');
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

_(Ejemplo real: "¿cuántos products tiene tal category?")_

```typescript
async countByRelatedExample(value: string) {
    return await this.exampleRepository.count({
        where: { relatedExample: { field: value } },
    });
}
```

**Controller:**

```typescript
@Get('count/by-related')
countByRelatedExample(@Query('value') value: string) {
    return this.exampleService.countByRelatedExample(value);
}
```

---

### 17. Verificar si ya existe antes de crear (evitar duplicados por campo único)

_(Ejemplo real: no permitir dos Categories con el mismo nombre —
reemplazá `uniqueField` por la columna real, ej. `name`)_

```typescript
async create(createExampleDto: CreateExampleDto): Promise<Example> {
    const exists = await this.exampleRepository.existsBy({ uniqueField: createExampleDto.uniqueField });
    if (exists) {
        throw new ConflictException('An Example with that unique value already exists');
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

_(Ejemplo real: mostrar los últimos 5 Orders que entraron)_

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

Cuando una entidad tiene exactamente UN registro relacionado y único
de otra tabla. _(Ejemplo real: un User que tiene un único Profile —
`Example` = `User`, `RelatedExample` = `Profile`)_

```typescript
// Example entity
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

Cuando NO necesitás una tabla intermedia con su propio CRUD, sino una
relación muchos-a-muchos simple que maneja TypeORM automáticamente.
_(Ejemplo real: un Book puede tener varios Authors — `Example` =
`Book`, `RelatedExample` = `Author`)_

```typescript
// Example entity
@ManyToMany(() => RelatedExample)
@JoinTable({ name: 'example_related_example' }) // solo en el lado "dueño" de la relación
relatedExamples: RelatedExample[];

// service — crear asignando varios relacionados a la vez
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

// agregar un relacionado más a un Example ya existente
async addRelatedExample(id: number, relatedExampleId: number) {
    const example = await this.exampleRepository.findOne({
        where: { id },
        relations: { relatedExamples: true },
    });
    if (!example) {
        throw new NotFoundException('Example not found');
    }

    const relatedExample = await this.relatedExampleRepository.findOneBy({ id: relatedExampleId });
    if (!relatedExample) {
        throw new NotFoundException('RelatedExample not found');
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

_(Ejemplo real: "products con price mayor a X" o "orders hechas entre
dos fechas" — reemplazá `numericField`/`dateField` por tus columnas
reales)_

```typescript
import { MoreThan, LessThan, Between } from 'typeorm';

async findMoreThan(value: number) {
    return await this.exampleRepository.find({ where: { numericField: MoreThan(value) } });
}

async findLessThan(value: number) {
    return await this.exampleRepository.find({ where: { numericField: LessThan(value) } });
}

async findBetweenDates(start: Date, end: Date) {
    return await this.exampleRepository.find({ where: { dateField: Between(start, end) } });
}
```

**Controller:**

```typescript
@Get('field/greater-than')
findMoreThan(@Query('value', ParseIntPipe) value: number) {
    return this.exampleService.findMoreThan(value);
}

@Get('field/less-than')
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

Útil cuando el frontend te manda una selección múltiple. _(Ejemplo
real: traer los Products de un carrito de compras a partir de sus
ids)_

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

Para joins manuales, agregaciones (`COUNT`, `SUM`) o condiciones
dinámicas.

```typescript
async findWithQueryBuilder(text: string) {
    return await this.exampleRepository
        .createQueryBuilder('example')
        .leftJoinAndSelect('example.relatedExample', 'relatedExample')
        .where('example.field LIKE :text', { text: `%${text}%` })
        .orderBy('example.id', 'ASC')
        .getMany();
}

// reporte: cuántos Example tiene cada RelatedExample
async countExamplesByRelatedExample() {
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
findWithQueryBuilder(@Query('text') text: string) {
    return this.exampleService.findWithQueryBuilder(text);
}

@Get('reports/by-related')
countExamplesByRelatedExample() {
    return this.exampleService.countExamplesByRelatedExample();
}
```

---

### 25. Transacción (varias operaciones que deben tener éxito juntas)

_(Ejemplo real: crear una Order y descontar el Stock del product — si
algo falla, no querés que se descuente el stock sin que exista la
order)_

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class ExampleService {
    constructor(private dataSource: DataSource) {}

    async createWithTransaction(createExampleDto: CreateExampleDto) {
        return await this.dataSource.transaction(async (manager) => {
            const newExample = manager.create(Example, createExampleDto);
            const savedExample = await manager.save(newExample);

            // actualiza un campo del relacionado, dentro de la misma transacción
            await manager.update(RelatedExample, createExampleDto.relatedExampleId, {
                numericField: () => 'numericField - 1',
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

Para que los errores devuelvan el código HTTP correcto (404, 409, etc.)
en vez de un genérico 500.

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
    const exists = await this.exampleRepository.existsBy({ uniqueField: createExampleDto.uniqueField });
    if (exists) {
        throw new ConflictException('An Example with that unique value already exists'); // devuelve 409
    }
    // ...
}

async validateAmount(value: number) {
    if (value < 0) {
        throw new BadRequestException('Value cannot be negative'); // devuelve 400
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
    textField: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    optionalField?: string;

    @IsInt()
    @IsPositive()
    relatedExampleId: number;

    @IsInt()
    @Min(0)
    numericField: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    optionalNumericField?: number;

    @IsOptional()
    @IsBoolean()
    booleanField?: boolean;
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

async searchByField(text: string) {
    return await this.exampleRepository.find({
        where: { field: ILike(`%${text}%`) },
    });
}
```

**Controller:**

```typescript
@Get('search')
searchByField(@Query('text') text: string) {
    return this.exampleService.searchByField(text);
}
```

---

### 29. Filtrar por valores mayores o iguales (`MoreThanOrEqual`)

```typescript
import { MoreThanOrEqual } from 'typeorm';

async findMoreThanOrEqual(value: number) {
    return await this.exampleRepository.find({
        where: { numericField: MoreThanOrEqual(value) },
    });
}
```

**Controller:**

```typescript
@Get('field/from')
findMoreThanOrEqual(@Query('value', ParseIntPipe) value: number) {
    return this.exampleService.findMoreThanOrEqual(value);
}
```

---

### 30. Filtrar por valores menores o iguales (`LessThanOrEqual`)

```typescript
import { LessThanOrEqual } from 'typeorm';

async findLessThanOrEqual(value: number) {
    return await this.exampleRepository.find({
        where: { numericField: LessThanOrEqual(value) },
    });
}
```

**Controller:**

```typescript
@Get('field/up-to')
findLessThanOrEqual(@Query('value', ParseIntPipe) value: number) {
    return this.exampleService.findLessThanOrEqual(value);
}
```

---

### 31. Buscar registros donde un campo sea NULL (`IsNull`)

`IsNull()` equivale a `WHERE column IS NULL`. _(Ejemplo real: listar
Customers que no cargaron ningún email)_

```typescript
import { IsNull } from 'typeorm';

async findWithNullField() {
    return await this.exampleRepository.find({
        where: { optionalField: IsNull() },
    });
}
```

**Controller:**

```typescript
@Get('null-field')
findWithNullField() {
    return this.exampleService.findWithNullField();
}
```

---

### 32. Negar una condición (`Not`)

`Not()` también sirve para negar otros operadores, como `Not(In([...]))`
o `Not(IsNull())`. _(Ejemplo real: traer todas las Orders cuyo status
no sea "cancelled")_

```typescript
import { Not } from 'typeorm';

async findExcludingValue(value: string) {
    return await this.exampleRepository.find({
        where: { field: Not(value) },
    });
}
```

**Controller:**

```typescript
@Get('excluding')
findExcludingValue(@Query('value') value: string) {
    return this.exampleService.findExcludingValue(value);
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
        throw new NotFoundException(`Example with id ${id} not found`);
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
    const exists = await this.exampleRepository.existsBy({
        uniqueField: createExampleDto.uniqueField,
    });

    if (exists) {
        throw new ConflictException('An Example with that unique value already exists');
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

**Ejemplo: `BadRequestException`** — rechazar un valor negativo.

```typescript
import { BadRequestException } from '@nestjs/common';

async validateAmount(value: number) {
    if (value < 0) {
        throw new BadRequestException('Value cannot be negative');
    }
}
```

**Controller:**

```typescript
@Post('apply-adjustment')
applyAdjustment(@Body('value') value: number) {
    return this.exampleService.validateAmount(value);
}
```

**Ejemplo: `UnauthorizedException`** — no se mandaron credenciales
válidas al intentar loguearse.

```typescript
import { UnauthorizedException } from '@nestjs/common';

async authenticate() {
    const isAuthenticated = false;
    if (!isAuthenticated) {
        throw new UnauthorizedException('Invalid or missing credentials');
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
    const hasPermission = false;
    if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to perform this action');
    }
}
```

**Controller:**

```typescript
@Get('check-permission')
checkPermission() {
    return this.exampleService.checkPermission();
}
```

**Regla importante:** el controller nunca necesita `try/catch` para
estas excepciones. Se lanzan desde el service y NestJS arma la
respuesta HTTP automáticamente.

---

### 34. Buscar registros cuyo campo empiece con un texto (`StartsWith`)

`Like` con el patrón `texto%` (el `%` al final, no al principio) busca
coincidencias que EMPIECEN con ese texto. _(Ejemplo real: traer los
Customers cuyo nombre empiece con "A")_

```typescript
import { Like } from 'typeorm';

async findStartingWith(text: string) {
    return await this.exampleRepository.find({
        where: { field: Like(`${text}%`) },
    });
}
```

**Controller:**

```typescript
@Get('starts-with')
findStartingWith(@Query('text') text: string) {
    return this.exampleService.findStartingWith(text);
}
```

---

### 35. Buscar por id de una relación `ManyToOne` (variante rápida del bloque 8)

Cuando lo único que te interesa filtrar es el id del relacionado, no
otro campo suyo. _(Ejemplo real: traer todos los Products de una
Category puntual por su id)_

```typescript
async findByRelatedExampleId(relatedExampleId: number) {
    return await this.exampleRepository.find({
        where: { relatedExample: { id: relatedExampleId } },
        relations: { relatedExample: true },
    });
}
```

**Controller:**

```typescript
@Get('by-related-id')
findByRelatedExampleId(@Query('relatedExampleId', ParseIntPipe) relatedExampleId: number) {
    return this.exampleService.findByRelatedExampleId(relatedExampleId);
}
```

---

### 36. Buscar por id de una relación `ManyToMany` (con `QueryBuilder`)

Cuando la relación es muchos-a-muchos, conviene usar `QueryBuilder`
con `innerJoin` para filtrar por el id del relacionado sin
duplicar filas. _(Ejemplo real: traer los Roles que tengan asignado
tal Permission por su id)_

```typescript
async findByRelatedExampleId(relatedExampleId: number) {
    return await this.exampleRepository
        .createQueryBuilder('example')
        .innerJoin('example.relatedExamples', 'relatedExample')
        .where('relatedExample.id = :relatedExampleId', { relatedExampleId })
        .getMany();
}
```

**Controller:**

```typescript
@Get('by-related-id')
findByRelatedExampleId(@Query('relatedExampleId', ParseIntPipe) relatedExampleId: number) {
    return this.exampleService.findByRelatedExampleId(relatedExampleId);
}
```

---

### 37. Combinar varios filtros opcionales en un solo endpoint

Cuando el frontend puede mandar cero, uno o varios `@Query()` a la
vez, y el filtro solo debe aplicarse si ese valor vino. _(Ejemplo
real: buscar Products por nombre Y/O por categoría Y/O por si están
activos, sin que ningún filtro sea obligatorio)_

```typescript
async findWithFilters(filters: { textValue?: string; relatedExampleId?: number; booleanValue?: boolean }) {
    const where: any = {};

    if (filters.textValue) {
        where.field = Like(`%${filters.textValue}%`);
    }
    if (filters.relatedExampleId) {
        where.relatedExample = { id: filters.relatedExampleId };
    }
    if (filters.booleanValue !== undefined) {
        where.booleanField = filters.booleanValue;
    }

    return await this.exampleRepository.find({ where });
}
```

**Controller:**

```typescript
@Get('filter')
findWithFilters(
    @Query('text') text?: string,
    @Query('relatedExampleId') relatedExampleId?: number,
    @Query('booleanValue') booleanValue?: string,
) {
    return this.exampleService.findWithFilters({
        textValue: text,
        relatedExampleId: relatedExampleId ? Number(relatedExampleId) : undefined,
        booleanValue: booleanValue !== undefined ? booleanValue === 'true' : undefined,
    });
}
```

---

### 38. Ordenar resultados dinámicamente (`orderBy` desde query params)

En vez de un orden fijo en el código, el cliente elige por qué campo y
en qué dirección ordenar. _(Ejemplo real: `?sortBy=name&order=DESC`)_

```typescript
async findAllSorted(sortBy: string, order: 'ASC' | 'DESC') {
    return await this.exampleRepository.find({
        order: { [sortBy]: order },
    });
}
```

**Controller:**

```typescript
@Get('sorted')
findAllSorted(
    @Query('sortBy') sortBy: string = 'id',
    @Query('order') order: 'ASC' | 'DESC' = 'ASC',
) {
    return this.exampleService.findAllSorted(sortBy, order);
}
```

---

### 39. Buscar con OR entre varios campos

Un array de objetos `where` en TypeORM se traduce en un `OR` entre
condiciones (a diferencia de un solo objeto, que es `AND`). _(Ejemplo
real: que el texto buscado aparezca en el nombre O en la
descripción)_

```typescript
async searchInMultipleFields(text: string) {
    return await this.exampleRepository.find({
        where: [
            { textField: Like(`%${text}%`) },
            { optionalField: Like(`%${text}%`) },
        ],
    });
}
```

**Controller:**

```typescript
@Get('search-multi')
searchInMultipleFields(@Query('text') text: string) {
    return this.exampleService.searchInMultipleFields(text);
}
```

---

### 40. Quitar UN elemento de una relación `ManyToMany`

El bloque 21 solo agrega un relacionado; este lo saca sin tocar el
resto. _(Ejemplo real: quitarle un Permission puntual a un Role)_

```typescript
async removeRelatedExample(id: number, relatedExampleId: number) {
    const example = await this.exampleRepository.findOne({
        where: { id },
        relations: { relatedExamples: true },
    });
    if (!example) {
        throw new NotFoundException('Example not found');
    }

    example.relatedExamples = example.relatedExamples.filter(
        (relatedExample) => relatedExample.id !== relatedExampleId,
    );

    return await this.exampleRepository.save(example);
}
```

**Controller:**

```typescript
@Delete(':id/related-examples/:relatedExampleId')
removeRelatedExample(
    @Param('id', ParseIntPipe) id: number,
    @Param('relatedExampleId', ParseIntPipe) relatedExampleId: number,
) {
    return this.exampleService.removeRelatedExample(id, relatedExampleId);
}
```

---

### 41. Reemplazar TODOS los relacionados de una `ManyToMany` de una sola vez

En vez de agregar/quitar uno por uno, reemplaza el array completo por
uno nuevo. _(Ejemplo real: actualizar de una vez todos los Permissions
de un Role, mandando la lista completa de ids)_

```typescript
async setRelatedExamples(id: number, relatedExampleIds: number[]) {
    const example = await this.exampleRepository.findOne({
        where: { id },
        relations: { relatedExamples: true },
    });
    if (!example) {
        throw new NotFoundException('Example not found');
    }

    const relatedExamples = await this.relatedExampleRepository.findBy({
        id: In(relatedExampleIds),
    });

    example.relatedExamples = relatedExamples;
    return await this.exampleRepository.save(example);
}
```

**Controller:**

```typescript
@Patch(':id/related-examples')
setRelatedExamples(
    @Param('id', ParseIntPipe) id: number,
    @Body('relatedExampleIds') relatedExampleIds: number[],
) {
    return this.exampleService.setRelatedExamples(id, relatedExampleIds);
}
```

---

### 42. Activar/desactivar un campo booleano (`toggle`) sin tocar el resto

Un PATCH puntual que invierte un solo valor, sin recibir body.
_(Ejemplo real: activar/desactivar un User o un Product sin mandar
todos sus campos)_

```typescript
async toggleStatus(id: number) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException('Example not found');
    }

    example.booleanField = !example.booleanField;
    return await this.exampleRepository.save(example);
}
```

**Controller:**

```typescript
@Patch(':id/toggle-status')
toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.toggleStatus(id);
}
```

---

### 43. `@HttpCode()` explícito en cada endpoint

Nest ya usa `201` para `@Post()` y `200` para el resto por defecto,
pero podés forzar el código igual — es buena práctica dejarlo
explícito y es obligatorio cuando querés un código distinto al
default (como `204 NO_CONTENT` en un `delete`, que no debe devolver
body).

```typescript
import { HttpCode, HttpStatus } from '@nestjs/common';

@Post()
@HttpCode(HttpStatus.CREATED)
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}

@Get()
@HttpCode(HttpStatus.OK)
findAll() {
    return this.exampleService.findAll();
}

@Get(':id')
@HttpCode(HttpStatus.OK)
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.findOne(id);
}

@Patch(':id')
@HttpCode(HttpStatus.OK)
update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    return this.exampleService.update(id, updateExampleDto);
}

// OJO: con NO_CONTENT no se debe devolver body, por eso el método
// solo hace await sin "return" del resultado.
@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
async remove(@Param('id', ParseIntPipe) id: number) {
    await this.exampleService.remove(id);
}
```

---

### 44. Variante defensiva del controller con `try/catch` (alternativa al bloque 26/33)

**Usar SOLO esta variante O la del bloque 26/33 en todo el proyecto,
no mezcladas.** Esta versión hace que el controller también atrape
errores inesperados (ej. fallos de conexión a la BD) y los envuelva en
un `500`, mientras deja pasar sin tocar las excepciones de negocio que
ya vienen con su código HTTP correcto desde el service.

```typescript
import { InternalServerErrorException } from '@nestjs/common';

@Patch(':id')
@HttpCode(HttpStatus.OK)
async update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    try {
        return await this.exampleService.update(id, updateExampleDto);
    } catch (error) {
        // Si la excepción ya es de negocio (NotFoundException, ConflictException, etc.),
        // se relanza tal cual para que Nest arme su respuesta HTTP normal.
        if (error instanceof Error && 'status' in error) {
            throw error;
        }
        throw new InternalServerErrorException('Failed to update the Example', {
            cause: error,
            description: 'Unexpected error while persisting changes to the database.',
        });
    }
}
```

---

### 45. Pipe personalizado (`PositiveIntPipe`) en vez de `ParseIntPipe`

Cuando además de validar que el `id` sea un número, tenés que validar
que sea positivo (rechazar `0` o negativos) antes de que llegue al
service.

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PositiveIntPipe implements PipeTransform<string, number> {
    transform(value: string): number {
        const parsedValue = parseInt(value, 10);
        if (isNaN(parsedValue) || parsedValue <= 0) {
            throw new BadRequestException('The id must be a positive integer');
        }
        return parsedValue;
    }
}
```

**Controller (reemplaza `ParseIntPipe` por este en cualquier bloque):**

```typescript
@Get(':id')
findOne(@Param('id', PositiveIntPipe) id: number) {
    return this.exampleService.findOne(id);
}
```

---

### 46. Hashear la contraseña antes de guardar (típico en Auth/User)

Nunca se guarda una contraseña en texto plano. _(Ejemplo real: crear
un User con su password hasheada con `bcrypt`)_

```typescript
import * as bcrypt from 'bcrypt';

async create(createExampleDto: CreateExampleDto): Promise<Example> {
    const hashedPassword = await bcrypt.hash(createExampleDto.password, 10);

    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        password: hashedPassword,
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

### 47. Guard + decorador `@Roles()` para proteger rutas según el rol del usuario

Restringe el acceso a una ruta solo a usuarios con determinado rol.
Requiere que un guard de autenticación previo ya haya puesto
`request.user` (ej. con JWT). _(Ejemplo real: solo un `admin` puede
borrar un Example)_

```typescript
import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
        if (!requiredRoles) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user; // seteado previamente por un guard/estrategia de auth
        return requiredRoles.includes(user?.role);
    }
}
```

**Controller:**

```typescript
import { UseGuards } from '@nestjs/common';

@UseGuards(RolesGuard)
@Roles('admin')
@Delete(':id')
remove(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.remove(id);
}
```

---

## Tabla resumen — ¿qué bloque uso según lo que me piden?

| El problema pide...                                           | Usa el bloque # |
| ------------------------------------------------------------- | --------------- |
| Crear entidad simple (sin relación)                           | 1               |
| Crear entidad que depende de OTRA (1 relación)                | 2               |
| Crear tabla intermedia (2 relaciones)                         | 3               |
| Evitar asociación duplicada                                   | 4               |
| Listar todo con su relación                                   | 5               |
| Listar con relación anidada (2 niveles)                       | 6               |
| Buscar uno por id                                             | 7               |
| Filtrar por campo de la relación                              | 8               |
| Búsqueda parcial de texto                                     | 9               |
| Actualizar campos simples                                     | 10              |
| Actualizar cambiando 1 relación                               | 11              |
| Actualizar cambiando 2 relaciones                             | 12              |
| Eliminar simple                                               | 13              |
| Eliminar con validación de dependencias                       | 14              |
| Contar todos                                                  | 15              |
| Contar filtrando por relación                                 | 16              |
| Evitar valores duplicados en un campo único al crear          | 17              |
| Traer los últimos N                                           | 18              |
| Paginación                                                    | 19              |
| Relación uno a uno (`@OneToOne`)                              | 20              |
| Relación muchos a muchos directa (`@ManyToMany`)              | 21              |
| Filtrar por mayor/menor que, o rango de fechas                | 22              |
| Filtrar por una lista de ids                                  | 23              |
| Consulta compleja / agregaciones (QueryBuilder)               | 24              |
| Varias operaciones que deben ocurrir juntas (transacción)     | 25              |
| Que los errores devuelvan el código HTTP correcto             | 26              |
| Validar el formato de los datos que llegan (DTO)              | 27              |
| Buscar texto ignorando mayúsculas/minúsculas (`ILike`)        | 28              |
| Filtrar por mayor o igual que (`MoreThanOrEqual`)             | 29              |
| Filtrar por menor o igual que (`LessThanOrEqual`)             | 30              |
| Buscar valores NULL (`IsNull`)                                | 31              |
| Negar una condición (`Not`)                                   | 32              |
| Manejar excepciones HTTP estándar                             | 33              |
| Buscar texto que EMPIECE con algo (`StartsWith`)              | 34              |
| Buscar por id de una relación `ManyToOne`                     | 35              |
| Buscar por id de una relación `ManyToMany`                    | 36              |
| Combinar varios filtros opcionales en un solo endpoint        | 37              |
| Ordenar dinámicamente por query param                         | 38              |
| Buscar con OR entre varios campos                             | 39              |
| Quitar un elemento de una `ManyToMany`                        | 40              |
| Reemplazar todos los relacionados de una `ManyToMany`         | 41              |
| Activar/desactivar un campo booleano (toggle)                 | 42              |
| Forzar el código HTTP de respuesta (`@HttpCode`)              | 43              |
| Controller defensivo con try/catch (alternativa)              | 44              |
| Pipe personalizado para validar id positivo                   | 45              |
| Hashear contraseña antes de guardar (`bcrypt`)                | 46              |
| Proteger una ruta según el rol del usuario (Guard + `@Roles`) | 47              |
