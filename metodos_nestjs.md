# Recetario de métodos — Service + Controller NestJS/TypeORM (código en inglés, consistente)

> **Cómo usar este recetario:** en vez de nombres reales (Producto, Cliente,
> Categoría...) el código usa nombres placeholder en INGLÉS, consistentes en
> TODOS los bloques. Para adaptar un bloque a tu proyecto, hacés "buscar y
> reemplazar" de estos placeholders por los tuyos (también en inglés, para
> que tu código base quede uniforme):

| Placeholder                                                                                       | Qué representa                                                                              | Ejemplo de reemplazo                                       |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Example` / `example`                                                                             | La entidad principal sobre la que estás trabajando                                          | `Product` / `product`, `Event` / `event`                   |
| `RelatedExample` / `relatedExample`                                                               | Una entidad de la que `Example` depende (relación hacia afuera)                             | `Category`, `Customer`, `Event` (si Example=`Reservation`) |
| `SecondRelatedExample` / `secondRelatedExample`                                                   | Una SEGUNDA relación, solo aparece en tablas intermedias (2 relaciones)                     | `Course` (si `Example` es la tabla `Enrollment`)           |
| `NestedRelatedExample` / `nestedRelatedExample`                                                   | Una relación DENTRO de `RelatedExample` (2 niveles de anidación)                            | `City` (dentro de `Customer`)                              |
| `DependentExample` / `dependentExampleRepository`                                                 | Una entidad que depende de `Example` (relación hacia adentro, para validar antes de borrar) | `Product` (si `Example` es `Category`)                     |
| `field`, `textField`, `numericField`, `dateField`, `uniqueField`, `booleanField`, `optionalField` | Nombres de columnas propias de `Example`                                                    | `name`, `price`, `stock`, `email`, `status`                |
| `owner` / `ownerId`                                                                               | La relación de `Example` hacia el usuario dueño del recurso                                 | `user`, `userId` (ej. dueño de una `Reservation`)          |
| `currentUser`                                                                                     | El usuario autenticado extraído del JWT (`req.user`)                                        | -                                                          |

## 🔁 Cómo usar la tabla de placeholders (con un ejemplo real)

El MD usa nombres **inventados** (`field`, `dateField`, `owner`, etc.) porque no sabe cuáles son tus columnas reales. Cuando copiás un bloque a tu proyecto, tenés que **reemplazar esos nombres inventados por los nombres reales** de tu entidad. Es como una plantilla con "[NOMBRE AQUÍ]" — no se deja así, se reemplaza.

**Ejemplo con `Event`:**

```typescript
// event.entity.ts (tu entidad real)
export class Event {
    id: number;
    name: string; // esto es lo que el MD llama "textField" o "field"
    date: Date; // esto es lo que el MD llama "dateField"
    capacity: number; // esto es lo que el MD llama "numericField"
    isActive: boolean; // esto es lo que el MD llama "booleanField"
}
```

Si el MD te da:

```typescript
if (new Date(dto.dateField) <= new Date()) {
    throw new BadRequestException('The date must be in the future');
}
```

Vos lo escribís así en tu proyecto (cambiando `dateField` por `date`):

```typescript
if (new Date(dto.date) <= new Date()) {
    throw new BadRequestException('The date must be in the future');
}
```

**Ejemplo con `owner` (dueño del recurso):** si tu entidad `Reservation` tiene esto:

```typescript
// reservation.entity.ts
export class Reservation {
    id: number;
    user: User; // esto es lo que el MD llama "owner"
    event: Event;
}
```

El MD te da:

```typescript
if (example.owner.id !== currentUser.id) {
    throw new ForbiddenException('This is not yours');
}
```

Vos lo escribís así (cambiando `owner` por `user`):

```typescript
if (reservation.user.id !== currentUser.id) {
    throw new ForbiddenException('This is not yours');
}
```

**`currentUser` es distinto a los demás:** no es una columna de la base de datos, es el usuario que está haciendo la petición ahora mismo (sale de `req.user`, no del DTO). En el controller se ve así:

```typescript
@Get(':id')
findOne(@Param('id') id: number, @Req() req: AuthenticatedRequest) {
    return this.reservationService.findOne(id, req.user); // req.user ES el "currentUser"
}
```

**Regla general:** cada vez que veas un nombre en el MD que no reconozcas de tu proyecto (`field`, `dateField`, `owner`, `Example`...), preguntate _"¿cómo se llama ESTO en mi entidad real?"_ y hacés el cambio antes de pegar el código.

---

**Reglas de nombres que se repiten en TODOS los bloques** (aplicá estas
mismas reglas cuando pegues el código en tu proyecto, así queda todo
uniforme):

- La instancia creada antes de guardar → siempre `newExample` (nunca
  mezclar con `nuevoExample`, `example2`, etc.).
- Un registro buscado para validar/actualizar → `example`.
- Una validación booleana de existencia → `exists` / `alreadyExists`.
- Inputs genéricos de búsqueda → `value`, `text`, `ids`, `page`, `limit`.
- Errores → siempre lanzados con una excepción de NestJS (`NotFoundException`,
  `ConflictException`, `BadRequestException`, etc.) o con una excepción propia
  que extienda una de éstas (ver bloque 54), nunca `throw new Error(...)`.
- Rutas del controller → siempre en kebab-case en inglés (`'search'`,
  `'latest'`, `'paginated'`, etc.), nunca mezclado con español.
- Endpoints protegidos → siempre `@UseGuards(AuthGuard('jwt'), PermissionsGuard)`
  con el guard de autenticación PRIMERO en el array, seguido de
  `@Permissions('nombre_del_permiso')` (ver bloque 48).

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

> 🎯 **Úsalo en el examen cuando...:** Te piden crear una entidad que NO depende de ninguna otra tabla (solo tiene sus propias columnas). Frase típica: _"crear una Category/Tag que solo tiene nombre y descripción"_.
> 🧩 **Cómo se combina:** Esqueleto completo de `create`. Si el enunciado agrega una regla de negocio, el `if` va justo ANTES de `this.exampleRepository.create(...)`.

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

> 🎯 **Úsalo en el examen cuando...:** La entidad nueva debe "engancharse" a otra que ya existe en la BD (te llega su id en el DTO). Frase típica: _"crear un Order que pertenece a un Customer ya registrado"_.
> 🧩 **Cómo se combina:** Esqueleto completo. Reglas de negocio nuevas van después del `if (!relatedExample)`, antes de crear.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden una tabla que solo une dos entidades existentes, sin columnas propias más allá de los ids. Frase típica: _"un Enrollment que une un Student con un Course"_.
> 🧩 **Cómo se combina:** Esqueleto completo. Reglas nuevas van después de los dos `if` de "no encontrado", antes de crear.

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

> 🎯 **Úsalo en el examen cuando...:** Además de la relación, deben evitar que se repita la misma combinación dos veces. Frase típica: _"un mismo Student no puede inscribirse dos veces al mismo Course"_.
> 🧩 **Cómo se combina:** Esqueleto completo — la validación de duplicado YA es un ejemplo de "pieza insertada". Otras reglas van en el mismo lugar, antes de crear.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden listar todo mostrando el objeto relacionado completo, no solo su id. Frase típica: _"listar los Products mostrando su Category"_.
> 🧩 **Cómo se combina:** Esqueleto de lectura (`findAll`). Normalmente no lleva reglas de negocio, solo relaciones/filtros en el `where`.

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

> 🎯 **Úsalo en el examen cuando...:** La relación que traés tiene, a su vez, otra relación adentro (2 niveles). Frase típica: _"listar Orders con su Customer, y la City de ese Customer"_.
> 🧩 **Cómo se combina:** Igual que el bloque 5, con relación anidada. No suele llevar reglas de negocio.

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

> 🎯 **Úsalo en el examen cuando...:** El clásico `GET /:id` — aparece en CASI todos los exámenes, para cualquier entidad.
> 🧩 **Cómo se combina:** Esqueleto de lectura por id. Si agregás validaciones (ej. ownership, bloque 55), van DESPUÉS de comprobar que existe.

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

> 🎯 **Úsalo en el examen cuando...:** El filtro no vive en la propia tabla sino en la relacionada. Frase típica: _"traer los Products cuya Category se llame Electronics"_.
> 🧩 **Cómo se combina:** Esto es una PIEZA de filtro para el `where` de un `findAll` (bloque 5/6) — no es un método aparte.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden un buscador de texto que NO sea coincidencia exacta. Frase típica: _"buscar Examples cuyo nombre contenga cierta palabra"_.
> 🧩 **Cómo se combina:** Pieza de filtro (`Like`) para el `where` de un `findAll`.

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

> 🎯 **Úsalo en el examen cuando...:** Un `PATCH` que solo toca columnas propias, sin tocar relaciones. Es el update más común y simple.
> 🧩 **Cómo se combina:** Esqueleto de update SIN buscar primero. Si necesitás reglas de negocio, agregale antes el "buscar" del bloque 7 y meté los `if` entre buscar y guardar.

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

> 🎯 **Úsalo en el examen cuando...:** El update debe permitir cambiar A QUÉ entidad relacionada apunta el registro. Frase típica: _"reasignar una Order a otro Customer"_.
> 🧩 **Cómo se combina:** Esqueleto de update que YA busca primero — las reglas de negocio van entre el `if (!example)` y el `save`.

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

> 🎯 **Úsalo en el examen cuando...:** El update debe permitir cambiar dos relaciones distintas del mismo registro. Frase típica: _"cambiar el Student o el Course de un Enrollment existente"_.
> 🧩 **Cómo se combina:** Igual que el bloque 11, con dos relaciones. Las reglas nuevas van en el mismo lugar.

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

> 🎯 **Úsalo en el examen cuando...:** El clásico `DELETE /:id` sin ninguna validación extra — aparece casi siempre.
> 🧩 **Cómo se combina:** Esqueleto de delete simple. Reglas de negocio (ej. dependientes) van ANTES del `delete`.

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

> 🎯 **Úsalo en el examen cuando...:** No se debe poder borrar un registro si OTROS todavía dependen de él. Frase típica: _"no permitir borrar una Category si tiene Products asociados"_.
> 🧩 **Cómo se combina:** Esqueleto completo — ya incluye una regla (dependientes) como ejemplo de dónde insertar más.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden un endpoint que devuelva cuántos registros hay en total.
> 🧩 **Cómo se combina:** Esqueleto de conteo. No suele llevar reglas de negocio.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden contar registros pero filtrando por un dato de la relación. Frase típica: _"cuántos Products tiene tal Category"_.
> 🧩 **Cómo se combina:** Esqueleto de conteo filtrado. No suele llevar reglas de negocio.

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

> 🎯 **Úsalo en el examen cuando...:** Antes de crear, hay que asegurar que un campo (email, nombre, código) no se repita. Frase típica: _"no permitir dos Categories con el mismo nombre"_.
> 🧩 **Cómo se combina:** Esqueleto completo de `create` con duplicado — la validación va ANTES de crear, en el mismo lugar que cualquier otra regla.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden los últimos N registros creados. Frase típica: _"mostrar las últimas 5 Orders"_.
> 🧩 **Cómo se combina:** Esqueleto de lectura (últimos N). No suele llevar reglas de negocio.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden resultados paginados (`page`, `limit`) con el total de registros.
> 🧩 **Cómo se combina:** Esqueleto de lectura paginada. No suele llevar reglas de negocio.

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

> 🎯 **Úsalo en el examen cuando...:** La relación es de UNO a UNO y exclusiva. Frase típica: _"un User tiene un único Profile"_.
> 🧩 **Cómo se combina:** Esqueleto especial para relación 1 a 1. Reglas de negocio (si las hay) van igual que en el bloque 2, antes de crear.

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

> 🎯 **Úsalo en el examen cuando...:** Es muchos-a-muchos SIN necesidad de una tabla intermedia con su propio CRUD (TypeORM la maneja solo). Frase típica: _"un Book puede tener varios Authors"_.
> 🧩 **Cómo se combina:** Esqueleto especial para `ManyToMany`. Reglas de negocio van antes de crear/guardar.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden comparar por mayor/menor que un valor, o filtrar por un RANGO de fechas. Frase típica (¡MUY común!): _"filtrar reservas/eventos entre dos fechas"_.
> 🧩 **Cómo se combina:** Pieza de filtro para el `where` de un `findAll` — no es un método aparte.

_(Ejemplo real: "products con price mayor a X" o "orders/eventos entre
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

> 🎯 **Úsalo en el examen cuando...:** El cliente manda una selección múltiple de ids en la query. Frase típica: _"traer los Products de un carrito a partir de sus ids"_.
> 🧩 **Cómo se combina:** Pieza de filtro (lista de ids) para el `where` de un `findAll`.

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

> 🎯 **Úsalo en el examen cuando...:** El `find()` normal no alcanza: necesitás un JOIN manual, un `COUNT`/`SUM`, o una condición muy dinámica. Frase típica: _"reporte de cuántos X tiene cada Y"_.
> 🧩 **Cómo se combina:** Esqueleto de lectura avanzada. Las reglas de negocio normalmente NO van acá — esto es solo lectura/reportes.

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

> 🎯 **Úsalo en el examen cuando...:** Dos o más operaciones deben tener éxito JUNTAS o fallar juntas. Frase típica: _"crear una reserva y descontar el cupo disponible del evento en la misma operación"_.
> 🧩 **Cómo se combina:** Esqueleto especial cuando dos operaciones deben ir juntas. Las reglas de negocio (`if`) van DENTRO del callback de la transacción, antes de guardar cualquiera de las dos.

_(Ejemplo real: crear una Order y descontar el Stock del product — si
algo falla, no querés que se descuente el stock sin que exista la
order; también sirve para crear una Reservation y descontar
`availableSpots` de un Event de forma atómica)_

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

> 🎯 **Úsalo en el examen cuando...:** Cualquier vez que un recurso puede no existir o entrar en conflicto, y no querés que la respuesta sea un 500 genérico. Es la base de casi TODOS los servicios.
> 🧩 **Cómo se combina:** Esto no es un esqueleto — es la FORMA que deben tener todos los `if` de validación en cualquier bloque (siempre `throw new XException(...)`, nunca `throw new Error(...)`).

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

> 🎯 **Úsalo en el examen cuando...:** Siempre que haya un `POST`/`PATCH` con body — es prácticamente OBLIGATORIO en cualquier examen que use DTOs.
> 🧩 **Cómo se combina:** Esto no va en el service — es la capa de ENTRADA (el DTO). El service ni se entera si el dato ya viene validado por acá.

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

> **Nota de estilo:** si tu profe usa mensajes personalizados en español
> dentro de cada decorador (como en el proyecto real: `@IsNotEmpty({ message:
'El campo es obligatorio' })`), agregalos siempre — suma en la nota de
> "calidad de código".

---

### 28. Buscar por texto parcial ignorando mayúsculas y minúsculas (`ILike`)

> 🎯 **Úsalo en el examen cuando...:** Igual que el bloque 9, pero te piden explícitamente que la búsqueda ignore mayúsculas/minúsculas.
> 🧩 **Cómo se combina:** Pieza de filtro para el `where` de un `findAll`.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden "desde tal valor en adelante" (inclusive). Frase típica: _"productos con precio desde $50"_.
> 🧩 **Cómo se combina:** Pieza de filtro para el `where` de un `findAll`.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden "hasta tal valor" (inclusive). Frase típica: _"productos con precio hasta $200"_.
> 🧩 **Cómo se combina:** Pieza de filtro para el `where` de un `findAll`.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden encontrar registros donde un campo opcional esté vacío. Frase típica: _"clientes que no cargaron ningún email"_.
> 🧩 **Cómo se combina:** Pieza de filtro para el `where` de un `findAll`.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden todo MENOS un valor puntual. Frase típica: _"todas las Orders cuyo status no sea cancelled"_.
> 🧩 **Cómo se combina:** Pieza de filtro para el `where` de un `findAll`.

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

> 🎯 **Úsalo en el examen cuando...:** Tabla de referencia rápida: usala cuando dudes qué excepción de NestJS corresponde a qué código HTTP (400, 401, 403, 404, 409, etc.) en cualquier regla de negocio.
> 🧩 **Cómo se combina:** No es un bloque para copiar — es una TABLA de consulta para elegir qué excepción tirar en cualquier `if` que armes en otro bloque.

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
respuesta HTTP automáticamente. (Excepción: si tu profe pide la
variante defensiva del bloque 44, ahí sí se envuelve el `await` en
`try/catch` para capturar errores inesperados además de estos.)

---

### 34. Buscar registros cuyo campo empiece con un texto (`StartsWith`)

> 🎯 **Úsalo en el examen cuando...:** Te piden que el texto buscado esté al INICIO del campo, no en cualquier parte. Frase típica: _"clientes cuyo nombre empiece con A"_.
> 🧩 **Cómo se combina:** Pieza de filtro para el `where` de un `findAll`.

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

> 🎯 **Úsalo en el examen cuando...:** Variante corta del bloque 8 cuando el filtro es directamente el ID de la relación, no otro campo suyo. Frase típica: _"todos los Products de la Category con id=3"_.
> 🧩 **Cómo se combina:** Pieza de filtro para el `where` de un `findAll`.

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

> 🎯 **Úsalo en el examen cuando...:** Igual que el 35 pero la relación es muchos-a-muchos, así que necesitás `QueryBuilder` con `innerJoin` para no duplicar filas. Frase típica: _"Roles que tengan asignado el Permission con id=5"_.
> 🧩 **Cómo se combina:** Pieza de filtro (`QueryBuilder`) para un `findAll` con relación `ManyToMany`.

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

> 🎯 **Úsalo en el examen cuando...:** El endpoint recibe VARIOS `@Query()` opcionales a la vez y cada filtro se aplica solo si vino. Frase típica: _"buscar por nombre Y/O por categoría Y/O si está activo"_.
> 🧩 **Cómo se combina:** Esqueleto de lectura con filtros combinados — reemplaza al `where` fijo del bloque 5/6 cuando hay varios filtros opcionales.

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

> 🎯 **Úsalo en el examen cuando...:** El cliente elige por qué campo y en qué dirección ordenar desde la URL. Frase típica: _"?sortBy=name&order=DESC"_.
> 🧩 **Cómo se combina:** Pieza para el `order` de un `findAll` — no cambia el `where`.

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

> 🎯 **Úsalo en el examen cuando...:** El texto buscado puede estar en CUALQUIERA de dos o más campos (no en todos a la vez). Frase típica: _"que el texto aparezca en el nombre O en la descripción"_.
> 🧩 **Cómo se combina:** Pieza de filtro (OR) para el `where` de un `findAll`.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden sacar UN elemento puntual de una relación muchos-a-muchos sin tocar el resto. Frase típica: _"quitarle un Permission puntual a un Role"_.
> 🧩 **Cómo se combina:** Esqueleto completo (quitar de `ManyToMany`). No suele llevar más reglas de negocio.

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

> 🎯 **Úsalo en el examen cuando...:** Te piden reemplazar TODA la lista de relacionados de una sola vez, mandando el array completo de ids. Frase típica: _"actualizar todos los permisos de un Role de una sola vez"_.
> 🧩 **Cómo se combina:** Esqueleto completo (reemplazar `ManyToMany`). No suele llevar más reglas de negocio.

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

> 🎯 **Úsalo en el examen cuando...:** Un PATCH puntual que invierte un solo booleano sin recibir body. Frase típica: _"activar/desactivar un Product"_ o _"cancelar/desactivar un Event"_.
> 🧩 **Cómo se combina:** Esqueleto completo de toggle. Si el enunciado agrega una condición (ej. "no se puede si tiene reservas"), el `if` va ANTES de cambiar `example.booleanField`.

Un PATCH puntual que invierte un solo valor, sin recibir body.
_(Ejemplo real: activar/desactivar un User o un Product sin mandar
todos sus campos; también sirve para "desactivar" un Event)_

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

> 🎯 **Úsalo en el examen cuando...:** Te piden EXPLÍCITAMENTE el código HTTP de respuesta, o un `DELETE` que debe responder `204 NO_CONTENT` sin body.
> 🧩 **Cómo se combina:** Esto es un decorador que se agrega ARRIBA de cualquier método del controller — no cambia nada del service.

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

### 44. Variante defensiva del controller con `try/catch` (combinable con el bloque 43)

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice que NUNCA debe devolverse un `Internal Server Error 500` sin mensaje — hay que atrapar errores inesperados además de las excepciones de negocio.
> 🧩 **Cómo se combina:** Envuelve CUALQUIER llamada del controller al service — no cambia la lógica del service, solo atrapa errores no controlados.

En proyectos reales (como el de referencia con `UserController`) es
común combinar `@HttpCode` explícito **junto con** `try/catch`: el
`try/catch` no reemplaza las excepciones de negocio del bloque 26/33,
solo atrapa errores inesperados (ej. fallos de conexión a la BD) que
si no quedarían como un 500 sin mensaje.

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

> 🎯 **Úsalo en el examen cuando...:** El id no solo debe ser numérico, sino además POSITIVO (rechazar 0 o negativos) antes de llegar al service.
> 🧩 **Cómo se combina:** Reemplaza a `ParseIntPipe` dentro de `@Param(...)` en cualquier controller — no toca el service.

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

> 🎯 **Úsalo en el examen cuando...:** Cualquier creación de un `User` (o similar) que reciba una contraseña — SIEMPRE hay que hashearla, nunca guardarla en texto plano.
> 🧩 **Cómo se combina:** Esqueleto completo de `create` con hash. El hash SIEMPRE va justo antes de `create(...)`.

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

> 🎯 **Úsalo en el examen cuando...:** Solo si el examen pide control de acceso por ROL SIMPLE (sin tabla de permisos). Si ya existe `@Permissions()`/`PermissionsGuard` armado en el proyecto (como en este curso), usá el bloque 48 en su lugar.
> 🧩 **Cómo se combina:** Va en el controller, arriba del método, como cualquier guard — no toca el service.

Restringe el acceso a una ruta solo a usuarios con determinado rol.
Requiere que un guard de autenticación previo ya haya puesto
`request.user` (ej. con JWT). _(Ejemplo real: solo un `admin` puede
borrar un Example)_

> **Nota:** si tu proyecto YA trae un sistema de permisos armado
> (`@Permissions()` + `PermissionsGuard`, ver bloque 48), usá ese en
> vez de construir este `RolesGuard` desde cero — este bloque es para
> cuando el control de acceso es solo "por rol" y no hay tabla de
> permisos.

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

## Bloques de seguridad y reglas de negocio (48–66)

> Estos bloques cubren lo que NO estaba en el recetario original:
> autenticación + autorización combinadas, lectura del usuario
> autenticado, validaciones de fecha/capacidad/ownership, y variantes
> de auth que suelen aparecer en otros talleres (registro público,
> refresh de sesión, cambio de contraseña, etc.). Sirven tanto para
> este taller (Event/Reservation) como para cualquier otro módulo
> nuevo que te pidan más adelante.

### 48. Proteger un endpoint con autenticación (JWT) + autorización (permisos)

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice "los endpoints deben estar protegidos con autenticación y permisos" — es la combinación obligatoria en CASI todos los endpoints de un examen de seguridad.
> 🧩 **Cómo se combina:** Va en el controller, arriba del método — es la combinación que reemplaza/complementa al bloque 47.

Esto es obligatorio en **todos** los endpoints de recursos cuando el
taller dice "limitar según permisos del usuario".

```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/guards/permissions/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@Post()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('manage_examples')
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

**Regla:** el guard de autenticación va SIEMPRE primero en el array;
si no, `PermissionsGuard` no tiene `req.user` para leer.

---

### 49. Tipar y usar el usuario autenticado (`AuthenticatedRequest`)

> 🎯 **Úsalo en el examen cuando...:** Necesitás saber QUIÉN hizo la request para filtrar por él. Frase típica: _"obtener mis reservas/pedidos a través del token"_.
> 🧩 **Cómo se combina:** El `@Req()` se agrega como parámetro del método del controller; el `req.user.id` se pasa al service como argumento extra.

Necesario para endpoints tipo "mis recursos" y para chequear dueño del
recurso. _(Ejemplo real: `GET /reservations/user`)_

```typescript
import { Request } from 'express';
import { User } from '../../auth/entities/user.entity';

interface AuthenticatedRequest extends Request {
    user: User;
}
```

**Controller:**

```typescript
@Get('user')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('view_own_examples')
findMine(@Req() req: AuthenticatedRequest) {
    return this.exampleService.findByOwner(req.user.id);
}
```

**Service:**

```typescript
async findByOwner(ownerId: number) {
    return await this.exampleRepository.find({
        where: { owner: { id: ownerId } },
        relations: { owner: true },
    });
}
```

---

### 50. Validar que una fecha sea futura

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice que una fecha (de un evento, una cita, una reserva) debe ser FUTURA al crear o actualizar.
> 🧩 **Cómo se combina:** Es una PIEZA que se inserta en el esqueleto de `create` (bloque 1/2), justo antes de `this.exampleRepository.create(...)`.

_(Ejemplo real: la fecha del `Event` debe ser futura al crear/actualizar)_

```typescript
async create(createExampleDto: CreateExampleDto): Promise<Example> {
    const eventDate = new Date(createExampleDto.dateField);
    if (eventDate <= new Date()) {
        throw new BadRequestException('The date must be in the future');
    }

    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        availableSpots: createExampleDto.capacity, // se inicializa, no viene en el DTO
    });
    return await this.exampleRepository.save(newExample);
}
```

**DTO (nunca recibe `availableSpots`):**

```typescript
import { IsDateString, IsInt, IsString, MaxLength, Min } from 'class-validator';

export class CreateExampleDto {
    @IsString()
    @MaxLength(111, { message: 'El campo no puede superar los 111 caracteres' })
    textField: string;

    @IsDateString({}, { message: 'La fecha debe tener formato ISO válido' })
    dateField: string;

    @IsInt()
    @Min(1)
    capacity: number;
    // availableSpots NO va acá — lo calcula el service
}
```

---

### 51. Validar que un evento ocurra dentro de una ventana de N días

> 🎯 **Úsalo en el examen cuando...:** El enunciado agrega una ventana de tiempo límite. Frase típica: _"el evento debe realizarse dentro de los próximos N días"_.
> 🧩 **Cómo se combina:** Es una PIEZA que se inserta en el esqueleto de `create` (bloque 2), después de buscar la entidad relacionada.

_(Ejemplo real: la reserva solo se puede crear si el evento es dentro de los próximos 5 días)_

```typescript
async create(createExampleDto: CreateExampleDto) {
    const relatedExample = await this.relatedExampleRepository.findOneBy({ id: createExampleDto.relatedExampleId });
    if (!relatedExample) {
        throw new NotFoundException('RelatedExample not found');
    }

    const now = new Date();
    const limitDate = new Date();
    limitDate.setDate(now.getDate() + 5);

    if (relatedExample.dateField < now) {
        throw new BadRequestException('The related event has already occurred');
    }
    if (relatedExample.dateField > limitDate) {
        throw new BadRequestException('The related event is not within the next 5 days');
    }

    // ... continúa con la validación de cupos (bloque 52)
}
```

---

### 52. Descontar / reponer cupos disponibles con validación de capacidad

> 🎯 **Úsalo en el examen cuando...:** Hay un recurso con "cupos"/"stock" que se descuenta al reservar y se repone al cancelar, con validación de que no falten cupos.
> 🧩 **Cómo se combina:** Combina DOS piezas: una para `create` (antes de guardar) y otra para el esqueleto de "toggle/cancelar" (bloque 42).

_(Ejemplo real: `availableSpots` del `Event` al crear/cancelar una `Reservation`)_

```typescript
async create(createExampleDto: CreateExampleDto) {
    const relatedExample = await this.relatedExampleRepository.findOneBy({ id: createExampleDto.relatedExampleId });
    if (!relatedExample) {
        throw new NotFoundException('RelatedExample not found');
    }

    if (relatedExample.availableSpots < createExampleDto.numericField) {
        throw new BadRequestException('Not enough available spots for this event');
    }

    relatedExample.availableSpots -= createExampleDto.numericField;
    await this.relatedExampleRepository.save(relatedExample);

    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        relatedExample,
    });
    return await this.exampleRepository.save(newExample);
}

async cancel(id: number) {
    const example = await this.exampleRepository.findOne({
        where: { id },
        relations: { relatedExample: true },
    });
    if (!example) {
        throw new NotFoundException('Example not found');
    }
    if (example.booleanField === false) {
        // ya estaba cancelada, ejemplo de "estado"
        throw new ConflictException('This reservation was already cancelled');
    }

    example.relatedExample.availableSpots += example.numericField;
    await this.relatedExampleRepository.save(example.relatedExample);

    example.booleanField = false; // o example.status = 'CANCELLED'
    await this.exampleRepository.save(example);

    return { message: 'Reservation cancelled...' };
}
```

---

### 53. Limitar cuántos recursos activos puede tener un mismo usuario sobre otro recurso

> 🎯 **Úsalo en el examen cuando...:** El enunciado pone un TOPE por usuario sobre el mismo recurso. Frase típica: _"máximo 5 cupos activos por usuario en el mismo evento"_.
> 🧩 **Cómo se combina:** Es una PIEZA que se inserta en el esqueleto de `create`, antes de guardar (después de la de cupos, si también aplica).

_(Ejemplo real: máximo 5 cupos activos por usuario en el mismo evento)_

```typescript
async countActiveByOwnerAndRelated(ownerId: number, relatedExampleId: number) {
    return await this.exampleRepository
        .createQueryBuilder('example')
        .where('example.ownerId = :ownerId', { ownerId })
        .andWhere('example.relatedExampleId = :relatedExampleId', { relatedExampleId })
        .andWhere('example.booleanField = :active', { active: true })
        .getCount();
}

// dentro de create(), antes de guardar:
async create(createExampleDto: CreateExampleDto, ownerId: number) {
    const activeCount = await this.countActiveByOwnerAndRelated(ownerId, createExampleDto.relatedExampleId);
    if (activeCount + createExampleDto.numericField > 5) {
        throw new BadRequestException('You cannot reserve more than 5 spots for this event');
    }
    // ... resto de la lógica
}
```

---

### 54. Excepción personalizada siguiendo el estilo del proyecto (no `NotFoundException` a secas)

> 🎯 **Úsalo en el examen cuando...:** Te piden mantener el mismo formato de error que ya usa el resto del proyecto (con `error`, `message` y `code`), en vez de una excepción genérica de Nest.
> 🧩 **Cómo se combina:** No se inserta en ningún esqueleto — es una clase aparte que reemplaza a `NotFoundException` dentro de cualquier `throw` de otro bloque.

_(Mismo patrón que `UserNotFoundException` del proyecto real)_

```typescript
import { NotFoundException } from '@nestjs/common';

export class ExampleNotFoundException extends NotFoundException {
    constructor(id: number, internalCode?: string) {
        super({
            error: 'Example Not Found',
            message: `El Example con identificador ${id} no fue encontrado.`,
            code: internalCode,
        });
    }
}
```

---

### 55. Autorización mixta: ADMIN o dueño del recurso

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice que un recurso solo puede verlo/editarlo el ADMIN o su propio dueño, no cualquier usuario autenticado.
> 🧩 **Cómo se combina:** Es un esqueleto de lectura (como el bloque 7) con una pieza de ownership ya insertada en el medio.

_(Ejemplo real: `GET /reservations/:id` — solo ADMIN o el dueño de la reserva)_

```typescript
async findOneForUser(id: number, currentUser: User) {
    const example = await this.exampleRepository.findOne({
        where: { id },
        relations: { owner: true },
    });
    if (!example) {
        throw new NotFoundException('Example not found');
    }

    const isAdmin = currentUser.role?.name === 'admin';
    const isOwner = example.owner.id === currentUser.id;

    if (!isAdmin && !isOwner) {
        throw new ForbiddenException('You do not have access to this resource');
    }

    return example;
}
```

**Controller:**

```typescript
@Get(':id')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('view_examples')
findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.exampleService.findOneForUser(id, req.user);
}
```

---

### 56. Prefijo de ruta obligatorio por controlador (`api-test`)

> 🎯 **Úsalo en el examen cuando...:** El enunciado exige explícitamente que todas las rutas de un módulo empiecen con un prefijo particular (ej. `api-test`, `v1`, etc.).
> 🧩 **Cómo se combina:** Reemplaza la línea `@Controller('examples')` de cualquier controller — no toca el service.

_(Requisito puntual de un taller — no siempre viene por defecto)_

```typescript
@Controller('api-test/examples')
export class ExampleController {
    constructor(private readonly exampleService: ExampleService) {}
}
```

---

### 57. `@CurrentUser()` — decorador propio en vez de tipar `@Req()` a mano

> 🎯 **Úsalo en el examen cuando...:** Necesitás el usuario logueado en varios controllers y no querés repetir la interfaz `AuthenticatedRequest` en cada uno.
> 🧩 **Cómo se combina:** Reemplaza a `@Req() req: AuthenticatedRequest` como parámetro del método del controller.

Más limpio que repetir la interfaz `AuthenticatedRequest` en cada archivo.

```typescript
// current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../entities/user.entity';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
```

**Controller:**

```typescript
@Get('user')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('view_own_examples')
findMine(@CurrentUser() user: User) {
    return this.exampleService.findByOwner(user.id);
}
```

---

### 58. `@Public()` — excluir un endpoint de un guard global

> 🎯 **Úsalo en el examen cuando...:** Solo aplica si el proyecto usa (o te piden armar) un guard GLOBAL de autenticación y necesitás dejar rutas abiertas (login, registro).
> 🧩 **Cómo se combina:** Se agrega arriba del método del controller, junto a los guards, y modifica el guard global — no el service.

Útil si en algún taller te piden un `JwtAuthGuard` global (`APP_GUARD`)
y necesitás dejar rutas abiertas (ej. registro, login).

```typescript
// public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Dentro del guard (variante de bloque 47/48):**

```typescript
canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
    ]);
    if (isPublic) return true;
    // ... resto de la validación normal
}
```

**Controller:**

```typescript
@Public()
@Post('register')
register(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.register(createExampleDto);
}
```

---

### 59. Registro público de usuario (rol por defecto)

> 🎯 **Úsalo en el examen cuando...:** Te piden un endpoint de registro público donde el rol se asigna automáticamente (no viene en el body, a diferencia del `create` de un admin).
> 🧩 **Cómo se combina:** Esqueleto completo de `create`, variante de "registro". No se combina con otro bloque, es su propio flujo.

_(Distinto del `create` de admin: acá el rol no viene en el body, se asigna solo)_

```typescript
async register(createExampleDto: CreateExampleDto) {
    const exists = await this.exampleRepository.existsBy({ email: createExampleDto.email });
    if (exists) {
        throw new ConflictException('An account with that email already exists');
    }

    const defaultRole = await this.relatedExampleRepository.findOneBy({ name: 'user' });
    if (!defaultRole) {
        throw new NotFoundException('Default role not configured');
    }

    const hashedPassword = await bcrypt.hash(createExampleDto.password, 10);

    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        passwordHash: hashedPassword,
        role: defaultRole,
    });
    return await this.exampleRepository.save(newExample);
}
```

**Controller:**

```typescript
@Public()
@Post('register')
@HttpCode(HttpStatus.CREATED)
register(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.register(createExampleDto);
}
```

---

### 60. Cambiar contraseña (validar la actual antes de setear la nueva)

> 🎯 **Úsalo en el examen cuando...:** Te piden cambiar la contraseña del usuario logueado, validando que la actual sea correcta antes de guardar la nueva.
> 🧩 **Cómo se combina:** Esqueleto propio (no es create/update genérico) — es un método aparte del service.

```typescript
async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const example = await this.exampleRepository.findOneBy({ id: userId });
    if (!example) {
        throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, example.passwordHash);
    if (!isMatch) {
        throw new UnauthorizedException('Current password is incorrect');
    }

    example.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.exampleRepository.save(example);
    return { message: 'Password updated successfully' };
}
```

**Controller:**

```typescript
@Patch('change-password')
@UseGuards(AuthGuard('jwt'))
changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.exampleService.changePassword(user.id, dto.currentPassword, dto.newPassword);
}
```

---

### 61. Guard de permisos con lógica OR (variante del `PermissionsGuard` que usa AND)

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice que ALCANZA con tener cualquiera de varios permisos, no que se necesiten TODOS a la vez (a diferencia del `PermissionsGuard` estándar, que exige todos).
> 🧩 **Cómo se combina:** Reemplaza al `PermissionsGuard` estándar del bloque 48 — son alternativas, no se usan los dos juntos.

_(El `PermissionsGuard` estándar exige TODOS los permisos listados; a veces
te piden "con cualquiera de estos alcanza")_

```typescript
canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, context.getHandler());
    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new UnauthorizedException('Usuario no autenticado');

    const userPermissions = user.role?.rolePermissions?.map((rp) => rp.permission.name) ?? [];
    const hasAtLeastOne = requiredPermissions.some((permission) => userPermissions.includes(permission));

    if (!hasAtLeastOne) {
        throw new ForbiddenException('No cuentas con ninguno de los permisos requeridos');
    }
    return true;
}
```

---

### 62. Guard de "solo dueño", sin pasar por permisos (ownership puro)

> 🎯 **Úsalo en el examen cuando...:** El control de acceso depende ÚNICAMENTE de si sos el dueño del recurso, sin pasar por roles ni permisos.
> 🧩 **Cómo se combina:** Reemplaza al `PermissionsGuard` del bloque 48 cuando el control es solo por dueño, sin permisos de por medio.

_(Cuando el recurso no depende de rol/permiso, sino únicamente de si sos el creador)_

```typescript
@Injectable()
export class OwnershipGuard implements CanActivate {
    constructor(private readonly exampleService: ExampleService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const resourceId = Number(request.params.id);

        const example = await this.exampleService.findOne(resourceId);
        if (example.owner.id !== user.id) {
            throw new ForbiddenException('You do not own this resource');
        }
        return true;
    }
}
```

**Controller:**

```typescript
@Patch(':id')
@UseGuards(AuthGuard('jwt'), OwnershipGuard)
update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    return this.exampleService.update(id, updateExampleDto);
}
```

---

### 63. Validador personalizado reutilizable (`@IsFutureDate`)

> 🎯 **Úsalo en el examen cuando...:** Repetís la misma validación de "fecha futura" en varios DTOs distintos y querés no duplicar el código (decorador reutilizable).
> 🧩 **Cómo se combina:** Reemplaza a escribir el `if` de fecha futura (bloque 50) directamente en el DTO, en vez de en el service.

En vez de repetir el `if (date <= new Date())` en cada service, lo movés al DTO.

```typescript
import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsFutureDate(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isFutureDate',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: string) {
                    return new Date(value) > new Date();
                },
                defaultMessage() {
                    return 'The date must be in the future';
                },
            },
        });
    };
}
```

**DTO:**

```typescript
export class CreateExampleDto {
    @IsDateString()
    @IsFutureDate()
    dateField: string;
}
```

---

### 64. Validador `@Match` (confirmar contraseña)

> 🎯 **Úsalo en el examen cuando...:** Te piden confirmar una contraseña (campo `password` + campo `confirmPassword` que deben coincidir).
> 🧩 **Cómo se combina:** Se agrega como decorador dentro de un DTO — no toca el service.

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function Match(property: string, validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'match',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [property],
            validator: {
                validate(value: unknown, args: ValidationArguments) {
                    const [relatedProperty] = args.constraints;
                    const relatedValue = (args.object as Record<string, unknown>)[relatedProperty];
                    return value === relatedValue;
                },
                defaultMessage() {
                    return 'Passwords do not match';
                },
            },
        });
    };
}
```

**DTO:**

```typescript
export class ChangePasswordDto {
    @IsString()
    newPassword: string;

    @IsString()
    @Match('newPassword', { message: 'Password confirmation does not match' })
    confirmPassword: string;
}
```

---

### 65. Soft delete (no borrar físicamente, solo marcar)

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice que un recurso NO se debe borrar físicamente, solo marcarlo como eliminado (y opcionalmente poder restaurarlo).
> 🧩 **Cómo se combina:** Reemplaza el `delete()` del bloque 13 por `softDelete()` — mismo lugar, mismo esqueleto.

```typescript
// Entity: @DeleteDateColumn() deletedAt: Date;

async remove(id: number) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException('Example not found');
    }
    await this.exampleRepository.softDelete(id);
    return { message: 'Example deleted (soft)' };
}

async restore(id: number) {
    await this.exampleRepository.restore(id);
    return { message: 'Example restored' };
}
```

**Controller:**

```typescript
@Delete(':id')
remove(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.remove(id);
}

@Patch(':id/restore')
restore(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.restore(id);
}
```

---

### 66. Auditoría automática: guardar quién creó un registro

> 🎯 **Úsalo en el examen cuando...:** Te piden guardar automáticamente quién creó un registro, sin que ese dato venga en el body (se toma del usuario autenticado).
> 🧩 **Cómo se combina:** Es una PIEZA que se inserta en el esqueleto de `create`, en el momento de armar `newExample`.

_(Usa `@CurrentUser()` del bloque 57 para setear el campo sin que venga en el body)_

```typescript
async create(createExampleDto: CreateExampleDto, currentUser: User) {
    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        createdBy: currentUser,
    });
    return await this.exampleRepository.save(newExample);
}
```

**Controller:**

```typescript
@Post()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('manage_examples')
create(@Body() createExampleDto: CreateExampleDto, @CurrentUser() user: User) {
    return this.exampleService.create(createExampleDto, user);
}
```

---

## Tabla resumen — ¿qué bloque uso según lo que me piden?

Para no tener que escanear una lista de 66 filas, está agrupada por tipo de problema. Buscá primero la categoría que se parece a lo que te piden, y ahí el bloque puntual.

### 🧱 A. CRUD básico (crear, leer, actualizar, eliminar)

| El problema pide...                                  | Bloque                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Crear entidad simple (sin relación)                  | [#1](#1-crear-un-registro-simple-sin-relaciones)                                   |
| Crear entidad que depende de OTRA (1 relación)       | [#2](#2-crear-un-registro-que-depende-de-una-entidad-existente)                    |
| Crear tabla intermedia (2 relaciones)                | [#3](#3-crear-una-tabla-intermedia-dos-relaciones-sin-columnas-propias)            |
| Evitar asociación duplicada                          | [#4](#4-crear-un-registro-con-relación--validar-que-no-exista-duplicado)           |
| Buscar uno por id                                    | [#7](#7-buscar-uno-por-id)                                                         |
| Actualizar campos simples                            | [#10](#10-actualizar-campos-simples-sin-tocar-relaciones)                          |
| Actualizar cambiando 1 relación                      | [#11](#11-actualizar-reasignando-una-relación)                                     |
| Actualizar cambiando 2 relaciones                    | [#12](#12-actualizar-reasignando-dos-relaciones-tabla-intermedia)                  |
| Eliminar simple                                      | [#13](#13-eliminar-por-id-simple-cualquier-entidad)                                |
| Eliminar con validación de dependencias              | [#14](#14-eliminar-validando-que-no-tenga-dependencias)                            |
| Evitar valores duplicados en un campo único al crear | [#17](#17-verificar-si-ya-existe-antes-de-crear-evitar-duplicados-por-campo-único) |

### 🔗 B. Relaciones especiales (`OneToOne` / `ManyToMany`)

| El problema pide...                                   | Bloque                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Relación uno a uno (`@OneToOne`)                      | [#20](#20-relación-onetoone-uno-a-uno)                                         |
| Relación muchos a muchos directa (`@ManyToMany`)      | [#21](#21-relación-manytomany-directa-sin-service-de-tabla-intermedia)         |
| Quitar un elemento de una `ManyToMany`                | [#40](#40-quitar-un-elemento-de-una-relación-manytomany)                       |
| Reemplazar todos los relacionados de una `ManyToMany` | [#41](#41-reemplazar-todos-los-relacionados-de-una-manytomany-de-una-sola-vez) |

### 🔍 C. Búsquedas y filtros

| El problema pide...                                    | Bloque                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Listar todo con su relación                            | [#5](#5-buscar-todos-trayendo-la-relación-join)                                 |
| Listar con relación anidada (2 niveles)                | [#6](#6-buscar-todos-trayendo-dos-niveles-de-relación-anidados)                 |
| Filtrar por campo de la relación                       | [#8](#8-buscar-filtrando-por-un-campo-de-la-relación-no-propio)                 |
| Búsqueda parcial de texto (`Like`)                     | [#9](#9-buscar-por-texto-parcial-like--contiene)                                |
| Contar filtrando por relación                          | [#16](#16-contar-filtrando-por-relación)                                        |
| Filtrar por mayor/menor que, o rango de fechas         | [#22](#22-filtrar-con-operadores-de-comparación-morethan-lessthan-between)      |
| Filtrar por una lista de ids (`In`)                    | [#23](#23-filtrar-por-una-lista-de-ids-in)                                      |
| Buscar texto ignorando mayúsculas/minúsculas (`ILike`) | [#28](#28-buscar-por-texto-parcial-ignorando-mayúsculas-y-minúsculas-ilike)     |
| Filtrar por mayor o igual que (`MoreThanOrEqual`)      | [#29](#29-filtrar-por-valores-mayores-o-iguales-morethanorequal)                |
| Filtrar por menor o igual que (`LessThanOrEqual`)      | [#30](#30-filtrar-por-valores-menores-o-iguales-lessthanorequal)                |
| Buscar valores NULL (`IsNull`)                         | [#31](#31-buscar-registros-donde-un-campo-sea-null-isnull)                      |
| Negar una condición (`Not`)                            | [#32](#32-negar-una-condición-not)                                              |
| Buscar texto que EMPIECE con algo (`StartsWith`)       | [#34](#34-buscar-registros-cuyo-campo-empiece-con-un-texto-startswith)          |
| Buscar por id de una relación `ManyToOne`              | [#35](#35-buscar-por-id-de-una-relación-manytoone-variante-rápida-del-bloque-8) |
| Buscar por id de una relación `ManyToMany`             | [#36](#36-buscar-por-id-de-una-relación-manytomany-con-querybuilder)            |
| Combinar varios filtros opcionales en un solo endpoint | [#37](#37-combinar-varios-filtros-opcionales-en-un-solo-endpoint)               |
| Ordenar dinámicamente por query param                  | [#38](#38-ordenar-resultados-dinámicamente-orderby-desde-query-params)          |
| Buscar con OR entre varios campos                      | [#39](#39-buscar-con-or-entre-varios-campos)                                    |

### 📊 D. Consultas avanzadas, conteos y paginación

| El problema pide...                                       | Bloque                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Contar todos                                              | [#15](#15-contar-todos-los-registros)                                  |
| Traer los últimos N                                       | [#18](#18-traer-los-n-más-recientes)                                   |
| Paginación                                                | [#19](#19-paginar-resultados-con-total)                                |
| Consulta compleja / agregaciones (QueryBuilder)           | [#24](#24-consulta-con-querybuilder-cuando-find-no-alcanza)            |
| Varias operaciones que deben ocurrir juntas (transacción) | [#25](#25-transacción-varias-operaciones-que-deben-tener-éxito-juntas) |

### 🔄 E. Cambios de estado puntuales

| El problema pide...                           | Bloque                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| Activar/desactivar un campo booleano (toggle) | [#42](#42-activardesactivar-un-campo-booleano-toggle-sin-tocar-el-resto) |
| Soft delete (no borrar físicamente)           | [#65](#65-soft-delete-no-borrar-físicamente-solo-marcar)                 |

### ⚠️ F. Validación de entrada, errores y respuestas HTTP

| El problema pide...                                    | Bloque                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Que los errores devuelvan el código HTTP correcto      | [#26](#26-usar-excepciones-propias-de-nestjs-en-vez-de-throw-new-error)                          |
| Validar el formato de los datos que llegan (DTO)       | [#27](#27-validaciones-en-el-dto-con-class-validator)                                            |
| Manejar excepciones HTTP estándar (tabla de códigos)   | [#33](#33-excepciones-http-estándar-en-nestjs)                                                   |
| Forzar el código HTTP de respuesta (`@HttpCode`)       | [#43](#43-httpcode-explícito-en-cada-endpoint)                                                   |
| Controller defensivo con try/catch (combinable con 43) | [#44](#44-variante-defensiva-del-controller-con-trycatch-combinable-con-el-bloque-43)            |
| Pipe personalizado para validar id positivo            | [#45](#45-pipe-personalizado-positiveintpipe-en-vez-de-parseintpipe)                             |
| Excepción personalizada con el formato del proyecto    | [#54](#54-excepción-personalizada-siguiendo-el-estilo-del-proyecto-no-notfoundexception-a-secas) |

### 🔐 G. Autenticación y guards base

| El problema pide...                                               | Bloque                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Hashear contraseña antes de guardar (`bcrypt`)                    | [#46](#46-hashear-la-contraseña-antes-de-guardar-típico-en-authuser)         |
| Proteger endpoint con JWT + permisos (`@Permissions`)             | [#48](#48-proteger-un-endpoint-con-autenticación-jwt--autorización-permisos) |
| Leer el usuario autenticado (`AuthenticatedRequest` / `req.user`) | [#49](#49-tipar-y-usar-el-usuario-autenticado-authenticatedrequest)          |
| Prefijo de ruta obligatorio por controlador                       | [#56](#56-prefijo-de-ruta-obligatorio-por-controlador-api-test)              |
| Decorador `@CurrentUser()` para no repetir `@Req()`               | [#57](#57-currentuser--decorador-propio-en-vez-de-tipar-req-a-mano)          |
| Decorador `@Public()` para excluir un endpoint de un guard global | [#58](#58-public--excluir-un-endpoint-de-un-guard-global)                    |

### 🛂 H. Autorización avanzada (permisos, roles, ownership)

| El problema pide...                                           | Bloque                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Proteger una ruta según el rol del usuario (Guard + `@Roles`) | [#47](#47-guard--decorador-roles-para-proteger-rutas-según-el-rol-del-usuario)       |
| Autorización mixta: ADMIN o dueño del recurso                 | [#55](#55-autorización-mixta-admin-o-dueño-del-recurso)                              |
| Guard de permisos con lógica OR (al menos uno)                | [#61](#61-guard-de-permisos-con-lógica-or-variante-del-permissionsguard-que-usa-and) |
| Guard de "solo dueño" sin pasar por permisos                  | [#62](#62-guard-de-solo-dueño-sin-pasar-por-permisos-ownership-puro)                 |

### 📏 I. Reglas de negocio (fechas, cupos, límites)

| El problema pide...                                     | Bloque                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Validar que una fecha sea futura                        | [#50](#50-validar-que-una-fecha-sea-futura)                                                 |
| Validar que algo ocurra dentro de una ventana de N días | [#51](#51-validar-que-un-evento-ocurra-dentro-de-una-ventana-de-n-días)                     |
| Descontar/reponer cupos con validación de capacidad     | [#52](#52-descontar--reponer-cupos-disponibles-con-validación-de-capacidad)                 |
| Limitar cantidad de recursos activos por usuario        | [#53](#53-limitar-cuántos-recursos-activos-puede-tener-un-mismo-usuario-sobre-otro-recurso) |
| Validador personalizado `@IsFutureDate`                 | [#63](#63-validador-personalizado-reutilizable-isfuturedate)                                |
| Validador personalizado `@Match` (confirmar contraseña) | [#64](#64-validador-match-confirmar-contraseña)                                             |

### 👤 J. Flujos de usuario y cuenta

| El problema pide...                             | Bloque                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| Registro público de usuario con rol por defecto | [#59](#59-registro-público-de-usuario-rol-por-defecto)                   |
| Cambiar contraseña validando la actual          | [#60](#60-cambiar-contraseña-validar-la-actual-antes-de-setear-la-nueva) |
| Auditoría: guardar quién creó un registro       | [#66](#66-auditoría-automática-guardar-quién-creó-un-registro)           |
