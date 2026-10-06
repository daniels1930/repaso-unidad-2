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
| `ExampleStatus` / `ExampleType`                                                                   | Un enum declarado en la entity `Example` (estado o tipo) y reutilizado en el DTO            | `ModificationStatus`, `CarType`                            |

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
@HttpCode(HttpStatus.OK)
findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
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

Y que `ParseIntPipe`, `HttpCode` y `HttpStatus` se importan de `@nestjs/common` cuando se necesitan.

---

## 🧭 Cómo combinar los bloques (leé esto primero)

> Un endpoint del parcial casi nunca es UN solo bloque: es un
> **esqueleto** (el método completo) + varias **piezas** (los `if` de las
> reglas de negocio). Esta guía te dice qué esqueleto elegir, en qué ORDEN
> meter las piezas y cómo queda armado un parcial completo. La línea 🧩 de
> cada bloque te dice si es esqueleto o pieza.

### Tipos de bloque

| Tipo                          | Qué es                                                 | Dónde va                         | Ejemplos                   |
| ----------------------------- | ------------------------------------------------------ | -------------------------------- | -------------------------- |
| **Esqueleto**                 | Un método completo del service + su endpoint           | Service + controller             | 1, 2, 5, 7, 10, 11, 13     |
| **Pieza**                     | Un `if` o un filtro que se METE dentro de un esqueleto | Dentro del método del service    | 8, 22, 50, 51, 52, 72, 84  |
| **Decorador / configuración** | No cambia la lógica                                    | Controller, DTO, entity o module | 27, 48, 56, 75, 76, 78, 79 |
| **Receta armada**             | Varios bloques ya combinados de principio a fin        | Copiar y adaptar                 | 85, 86, 97                 |

### Paso 0 — Antes de escribir código: levantar la BD y cargar el seed

```bash
docker compose up -d        # 1) levanta Postgres
npm run start:dev           # 2) con synchronize: true, TypeORM crea las tablas
docker compose exec -T db psql -U postgres -d nombre_db < db/scripts/inserts.sql   # 3) carga el seed
```

- El seed va DESPUÉS de arrancar la app: si las tablas todavía no existen, el `INSERT` falla.
- `db` es el nombre del servicio en `docker-compose.yml`; `postgres` y `nombre_db` salen del `.env`.
- Si el seed falla por nombres de columna, revisá los `name:` de las entities (ej. `"passwordHash"` vs `password_hash`).
- En Postman, lo primero es el login: comprobá que el token se guarde bien (bloque 103).

### Paso 1 — Elegí el esqueleto según el endpoint

| Endpoint que te piden                        | Esqueleto                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `POST` simple                                | 1 (sin relación) · 2 (con relación) · 3/4 (tabla intermedia)               |
| `POST` donde el dueño sale del token         | 66 (+ 49 o 57 para leer el usuario)                                        |
| `GET` lista                                  | 5 (con relación) · 37 (con filtros) · 19 (paginado)                        |
| `GET /:id`                                   | 7 + 26 (404) · 55 o 91 (solo ADMIN o dueño)                                |
| `GET` "mis cosas" (`/user`, `/me`)           | 49                                                                         |
| `GET` entre fechas / por rango               | 22 · 88 (validando las fechas del query)                                   |
| `PATCH /:id`                                 | 10 (sin reglas) · 11 (con reglas o relaciones) · 82 / 87 (con cupos)       |
| `PATCH /:id/<acción>` (activar, cancelar...) | 42 (toggle) · 70 (estado enum) · 83 (desactivar) · 86 (cancelar)           |
| `DELETE /:id`                                | 13 (simple) · 14 (si tiene dependientes) · 78 (cascada) · 89 (con mensaje) |

### Paso 2 — Meté las piezas en este ORDEN

Siempre el mismo orden, sea create, update o una acción. Así nunca
guardás algo que después falla en una validación:

```typescript
async metodo(/* ... */) {
    // 1) BUSCAR lo que tiene que existir                  → 404 NotFoundException  (bloques 2, 7, 26)
    // 2) PERMISOS sobre ESE registro (dueño / admin)      → 403 ForbiddenException (bloques 55, 91)
    // 3) ESTADO (activo, ya cancelado, ya ocurrió)        → 400 / 409              (bloques 51, 70, 83)
    // 4) REGLAS de datos (fechas, cupos, límites, únicos) → 400 / 409              (bloques 17, 50, 52, 84)
    // 5) MODIFICAR (descontar, cambiar estado, save)      → si toca 2+ tablas: transacción (bloque 25)
    // 6) RESPONDER (la entidad o un { message })          → (bloque 90)
}
```

> 🧠 **Regla de oro:** nada se guarda (`save`, `update`, `delete`) hasta
> que pasaron TODAS las validaciones. Si modificás 2 tablas (ej. descontar
> cupos del evento + crear la reserva), va dentro de una transacción.

> 💡 Si tu `findOne` ya lanza 404 (bloque 26), reutilizalo en `update` /
> `remove` / acciones: `const example = await this.findOne(id);` y el
> paso 1) queda en una sola línea (así lo hace el curso).

### Paso 3 — Armá el controller

- Prefijo de ruta si lo piden: `@Controller('api-test/examples')` (bloque 56).
- En cada endpoint protegido: `@UseGuards(AuthGuard('jwt'), PermissionsGuard)` + `@Permissions('...')` (bloque 48), o los guards UNA vez sobre la clase y en cada método solo `@Permissions` (bloque 101). Los nombres de permisos tienen que ser EXACTAMENTE los del `insert.sql` del parcial.
- Usuario del token: `@Req() req: AuthenticatedRequest` → `req.user` (bloque 49) o `@CurrentUser()` (bloque 57). Nunca desde el body.
- Ids en la ruta: `ParseIntPipe` (número) o `ParseUUIDPipe` (UUID, bloque 76). Query opcionales con valor por defecto, enums, booleanos o listas: pipes del bloque 104.
- Rutas fijas (`user`, `filter`, `between-dates`, `count`) SIEMPRE antes de `@Get(':id')`.
- El controller no tiene lógica: recibe y delega al service (opcional: `try/catch` del bloque 44).

### Paso 4 — Armá los DTOs

- `CreateDto`: cada campo con `class-validator` (bloque 27 + `validaciones_dto.md`).
- Lo que calcula el service NO va en el DTO: `availableSpots`, `status`, el `userId` del token (bloques 50 y 66).
- `UpdateDto`: `PartialType(CreateDto)`, u `OmitType` si hay campos que no se pueden cambiar (bloque 75).
- Leé los límites con cuidado: _"menos de"_ no es lo mismo que _"hasta"_ (ver la nota del bloque 50).

### Ejemplo: pre-parcial Event / Reservation armado con bloques

| Endpoint                          | Bloques que se combinan                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `POST /events`                    | 1 + 50 (fecha futura, `availableSpots = capacity`) + DTO 27 (`@MaxLength(110)`)      |
| `GET /events` · `GET /events/:id` | 5 · 7 + 26                                                                           |
| `PATCH /events/:id`               | 82 (fecha futura si viene + capacidad ≥ reservados)                                  |
| `PATCH /events/:id/deactivate`    | 83 (solo si no tiene reservas activas)                                               |
| `DELETE /events/:id`              | 89 (validar existencia + 14 + mensaje _"Este evento ha sido eliminado"_)             |
| `POST /reservations`              | 85 (receta armada: 2 + 51 + 52 + 84 + 66 + 25)                                       |
| `GET /reservations`               | 5                                                                                    |
| `GET /reservations/user`          | 49 (ruta ANTES de `:id`)                                                             |
| `GET /reservations/:id`           | 55 o 91 (ADMIN o dueño)                                                              |
| `PATCH /reservations/:id`         | 87 (ajustar cupos por la diferencia)                                                 |
| `PATCH /reservations/:id/cancel`  | 86 (receta armada: dueño + estado + fecha + liberar cupos + mensaje)                 |
| `DELETE /reservations/:id`        | 89 (variante que libera cupos si estaba activa)                                      |
| Filtrar reservas entre dos fechas | 88                                                                                   |
| TODOS                             | 56 (`api-test`) + 48 o 101 (guards + permisos) + 26/33 (excepciones) + 44 (opcional) |

### ✅ Checklist antes de entregar

- [ ] Cada endpoint protegido tiene `@UseGuards(AuthGuard('jwt'), PermissionsGuard)` + `@Permissions(...)` con nombres del `insert.sql`.
- [ ] Todos los controllers empiezan con el prefijo pedido (ej. `api-test`).
- [ ] Rutas fijas (`user`, `filter`, `between-dates`...) declaradas ANTES de `@Get(':id')`.
- [ ] Ningún `throw new Error(...)`: siempre excepciones de Nest (bloques 26 y 33).
- [ ] Ningún 500 posible: ids con pipe, fechas del query validadas (bloque 88), borrados con FK controlados (bloques 14, 78 y 89).
- [ ] DTOs con `class-validator`; lo calculado (`availableSpots`, `status`, `user`) NO viene en el DTO.
- [ ] Todo lo que toca 2+ tablas va en una transacción (bloque 25).
- [ ] Los mensajes que el enunciado pide LITERALES están copiados exactos (_"Reservation cancelled..."_, _"Este evento ha sido eliminado"_).
- [ ] Las respuestas no devuelven el `passwordHash` del usuario (bloque 90).
- [ ] Si todo da 401 o 403 teniendo el permiso: revisá la clave del token en Postman (bloque 103) y las relaciones del `JwtStrategy` (bloque 102).

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
@HttpCode(HttpStatus.CREATED)
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

---

### 2. Crear un registro que pertenece a otra entidad (buscar el relacionado por id + 404)

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
@HttpCode(HttpStatus.CREATED)
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

---

### 3. Crear un registro que une dos entidades (tabla intermedia: inscripción, rol-permiso)

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
@HttpCode(HttpStatus.CREATED)
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

---

### 4. Crear sin repetir la misma combinación (ej. no inscribirse dos veces al mismo curso)

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
@HttpCode(HttpStatus.CREATED)
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
@HttpCode(HttpStatus.OK)
findAll() {
    return this.exampleService.findAll();
}
```

---

### 6. Buscar todos, trayendo DOS niveles de relación anidados

> 🎯 **Úsalo en el examen cuando...:** La relación que traés tiene, a su vez, otra relación adentro (2 niveles). Frase típica: _"listar Orders con su Customer, y la City de ese Customer"_.
> 🧩 **Cómo se combina:** Es el mismo `find` que lista con su relación, pero dentro de `relations` anidás un segundo nivel: `{ relacion: { relacionDeAdentro: true } }`. No suele llevar reglas de negocio.

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
@HttpCode(HttpStatus.OK)
findAll() {
    return this.exampleService.findAll();
}
```

---

### 7. Buscar uno por id

> 🎯 **Úsalo en el examen cuando...:** El clásico `GET /:id` — aparece en CASI todos los exámenes, para cualquier entidad.
> 🧩 **Cómo se combina:** Esqueleto de lectura por id. Si además tenés que validar algo (ej. que el registro sea del usuario), ese `if` va DESPUÉS de comprobar que existe.
> ⚠️ **Así como está, si el id no existe responde 200 con el body vacío.** Para que dé 404 usá la versión del **bloque 26**, que es la que conviene reutilizar en `update` / `remove`.

El clásico `findOne` de cualquier CRUD.

```typescript
findOne(id: number) {
    return this.exampleRepository.findOne({ where: { id } });
}
```

**Controller:**

```typescript
@Get(':id')
@HttpCode(HttpStatus.OK)
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.findOne(id);
}
```

---

### 8. Buscar filtrando por un campo de la RELACIÓN (no propio)

> 🎯 **Úsalo en el examen cuando...:** El filtro no vive en la propia tabla sino en la relacionada. Frase típica: _"traer los Products cuya Category se llame Electronics"_.
> 🧩 **Cómo se combina:** No es un método aparte: es lo que ponés dentro del `where` de un `find` para filtrar por un campo de la tabla relacionada: `where: { relacion: { campo: valor } }`.

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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
searchByField(@Query('text') text: string) {
    return this.exampleService.searchByField(text);
}
```

---

### 10. Actualizar campos simples (sin tocar relaciones)

> 🎯 **Úsalo en el examen cuando...:** Un `PATCH` que solo toca columnas propias, sin tocar relaciones. Es el update más común y simple.
> 🧩 **Cómo se combina:** Esqueleto de update SIN buscar primero. Si necesitás reglas de negocio, primero buscá el registro (404 si no existe) y meté los `if` entre ese buscar y el guardar.

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
@HttpCode(HttpStatus.OK)
update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    return this.exampleService.update(id, updateExampleDto);
}
```

> ⚠️ `repository.update(id, dto)` solo sirve si el DTO trae columnas
> propias. Si trae un id de relación (ej. `roleId`), TypeORM no encuentra
> esa propiedad en la entity y responde **500** (pasa en el `PATCH /users`
> del curso). Y si el id no existe no lanza nada: responde 200 vacío. En
> esos casos buscá primero con el `findOne` que lanza 404 (bloque 26) y
> usá el **bloque 11**.

---

### 11. Actualizar cambiando a qué registro pertenece (reasignar UNA relación)

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
@HttpCode(HttpStatus.OK)
update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    return this.exampleService.update(id, updateExampleDto);
}
```

---

### 12. Actualizar reasignando DOS relaciones (tabla intermedia)

> 🎯 **Úsalo en el examen cuando...:** El update debe permitir cambiar dos relaciones distintas del mismo registro. Frase típica: _"cambiar el Student o el Course de un Enrollment existente"_.
> 🧩 **Cómo se combina:** Igual que actualizar reasignando una relación, pero con dos `if` (uno por cada relación). Las reglas nuevas van en el mismo lugar: después de buscar, antes del `save`.

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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
remove(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.remove(id);
}
```

> 💡 **Variante del curso:** devolver `null` responde un 200 vacío aunque
> el id no exista. El curso lanza 404 cuando no se borró nada:
>
> ```typescript
> async remove(id: number) {
>     const result = await this.exampleRepository.delete(id);
>     if (!result.affected) {
>         throw new NotFoundException(`Example with id ${id} not found`);
>     }
> }
> ```
>
> Combinado con `@HttpCode(HttpStatus.NO_CONTENT)` (bloque 43) responde
> 204 sin body. Si el enunciado pide un mensaje, usá el bloque 89.

---

### 14. Eliminar solo si no tiene registros asociados (ej. evento con reservas → 409)

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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.CREATED)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
findPaginated(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
) {
    return this.exampleService.findPaginated(page, limit);
}
```

> 💡 Con `ParseIntPipe` solo, si el cliente NO manda `page` o `limit`
> responde 400. Para que sean opcionales con valor por defecto:
> `@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number`
> (bloque 104).

---

### 20. Relación `@OneToOne` (uno a uno)

> 🎯 **Úsalo en el examen cuando...:** La relación es de UNO a UNO y exclusiva. Frase típica: _"un User tiene un único Profile"_.
> 🧩 **Cómo se combina:** Esqueleto especial para relación 1 a 1. Si hay reglas de negocio, van antes del `create(...)`, igual que en cualquier create.

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
@HttpCode(HttpStatus.CREATED)
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}

@Get(':id')
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.CREATED)
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}

@Patch(':id/related-examples/:relatedExampleId')
@HttpCode(HttpStatus.OK)
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
> ⚠️ **El `findBetweenDates` de acá da 500 si mandan una fecha inválida (`?start=hola`) y deja afuera el día final.** Para un endpoint "entre dos fechas" del parcial usá el **bloque 88**.

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
@HttpCode(HttpStatus.OK)
findMoreThan(@Query('value', ParseIntPipe) value: number) {
    return this.exampleService.findMoreThan(value);
}

@Get('field/less-than')
@HttpCode(HttpStatus.OK)
findLessThan(@Query('value', ParseIntPipe) value: number) {
    return this.exampleService.findLessThan(value);
}

@Get('between-dates')
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
findWithQueryBuilder(@Query('text') text: string) {
    return this.exampleService.findWithQueryBuilder(text);
}

@Get('reports/by-related')
@HttpCode(HttpStatus.OK)
countExamplesByRelatedExample() {
    return this.exampleService.countExamplesByRelatedExample();
}
```

---

### 25. Transacción: varias operaciones que deben ir juntas (ej. descontar cupos + crear la reserva)

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
@HttpCode(HttpStatus.CREATED)
createWithTransaction(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.createWithTransaction(createExampleDto);
}
```

---

### 26. Lanzar errores con excepciones de Nest (404, 409, 400) en vez de `throw new Error`

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

**Controller:** no cambia respecto a los bloques 1 y 7. Nest detecta el
tipo de excepción lanzada en el service y arma automáticamente la
respuesta HTTP con el código correcto. No hace falta `try/catch` aquí.

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

**Controller:** tampoco cambia: el DTO se sigue recibiendo con `@Body()`
tal cual en el bloque 1. La validación ocurre antes de entrar al método,
gracias al `ValidationPipe` global registrado en `main.ts`. Si algo no
cumple las reglas del DTO, Nest responde 400 automáticamente.

> ⚠️ Con el `ValidationPipe` del curso (`whitelist: true` +
> `forbidNonWhitelisted: true`), **cada** propiedad del DTO necesita al
> menos un decorador. Un campo sin decoradores (ej. un `CreateRoleDto` que
> solo declara `name: string;`) no cuenta como declarado y el request
> entero responde 400 _"property name should not exist"_. Si un campo no
> necesita reglas, alcanza con `@IsOptional()` o `@IsString()`.

> **Nota de estilo:** si tu profe usa mensajes personalizados en español
> dentro de cada decorador (como en el proyecto real:
> `@IsNotEmpty({ message: 'El campo es obligatorio' })`), agregalos
> siempre — suma en la nota de "calidad de código".

---

### 28. Buscar por texto parcial ignorando mayúsculas y minúsculas (`ILike`)

> 🎯 **Úsalo en el examen cuando...:** Igual que el buscador con `Like`, pero te piden explícitamente que la búsqueda ignore mayúsculas/minúsculas.
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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

**Ejemplos de las 3 más usadas:** `NotFoundException` (404),
`ConflictException` (409) y `BadRequestException` (400) ya están
mostradas en el **bloque 26** (y el caso completo de 409 por duplicado,
en el 17). Dónde aparecen en uso real:

| Excepción               | Caso típico                                  | Bloques           |
| ----------------------- | -------------------------------------------- | ----------------- |
| `NotFoundException`     | El registro o su relacionado no existe       | 2, 7, 26, 85      |
| `ConflictException`     | Duplicado, ya cancelado, tiene dependientes  | 4, 14, 17, 67, 83 |
| `BadRequestException`   | Regla de negocio: fecha, cupos, límite       | 50, 51, 52, 84    |
| `ForbiddenException`    | Autenticado, pero no es el dueño ni admin    | 55, 86, 91        |
| `UnauthorizedException` | Credenciales o contraseña actual incorrectas | 60                |

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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
findStartingWith(@Query('text') text: string) {
    return this.exampleService.findStartingWith(text);
}
```

---

### 35. Buscar por id de una relación `ManyToOne` (variante rápida del bloque 8)

> 🎯 **Úsalo en el examen cuando...:** Te piden filtrar por el ID de una relación (no por otro campo suyo). Frase típica: _"todos los Products de la Category con id=3"_.
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
findByRelatedExampleId(@Query('relatedExampleId', ParseIntPipe) relatedExampleId: number) {
    return this.exampleService.findByRelatedExampleId(relatedExampleId);
}
```

---

### 37. Combinar varios filtros opcionales en un solo endpoint

> 🎯 **Úsalo en el examen cuando...:** El endpoint recibe VARIOS `@Query()` opcionales a la vez y cada filtro se aplica solo si vino. Frase típica: _"buscar por nombre Y/O por categoría Y/O si está activo"_.
> 🧩 **Cómo se combina:** Esqueleto de lectura: armás un objeto `where` vacío, le agregás cada filtro SOLO si vino en la query, y al final hacés un único `find({ where })`.

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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.toggleStatus(id);
}
```

> ⚠️ Un toggle INVIERTE: si llaman dos veces a "desactivar", la segunda
> vez reactiva. Si el enunciado dice solo "desactivar" o "cancelar" (una
> sola vía), usá el **bloque 83**. Si solo uno puede estar activo a la vez
> (ej. "principal"), usá el **bloque 69**.

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

### 44. Controller con `try/catch` para nunca responder un 500 sin mensaje

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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.CREATED)
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

> 💡 **Como lo hace el curso:** las rondas salen del `.env`
> (`SALT_ROUNDS=10`) inyectando `ConfigService`, y el hash se quita antes
> de responder (bloque 90):
>
> ```typescript
> const saltRounds = parseInt(this.configService.get<string>('SALT_ROUNDS') ?? '10', 10);
> const passwordHash = await bcrypt.hash(createExampleDto.password, saltRounds);
> // ... create + save
> const { passwordHash: _, ...userWithoutPassword } = savedUser;
> return userWithoutPassword;
> ```

---

### 47. Guard + decorador `@Roles()` para proteger rutas según el rol del usuario

> 🎯 **Úsalo en el examen cuando...:** Solo si el examen pide control de acceso por ROL SIMPLE (sin tabla de permisos). Si el proyecto ya trae `@Permissions()` + `PermissionsGuard` (como en este curso), usá eso en su lugar.
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
@HttpCode(HttpStatus.OK)
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
> 🧩 **Cómo se combina:** Va en el controller, arriba del método: primero `@UseGuards(AuthGuard('jwt'), PermissionsGuard)` y debajo `@Permissions('...')`. El service no cambia.

Esto es obligatorio en **todos** los endpoints de recursos cuando el
taller dice "limitar según permisos del usuario".

```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/guards/permissions/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@Post()
@HttpCode(HttpStatus.CREATED)
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
@HttpCode(HttpStatus.OK)
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

> ⚠️ **Trampa de compilación:** si `AuthenticatedRequest` está en OTRO
> archivo (ej. `interfaces/authenticated-request.interface.ts`), con el
> `tsconfig` del curso (`isolatedModules` + `emitDecoratorMetadata`) el
> proyecto no compila (_error TS1272_). Importala con `import type`:
> `import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';`.
> Declarada en el mismo archivo del controller, como arriba, no hay
> problema.

---

### 50. Crear con fecha futura e inicializar `availableSpots` con `capacity`

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice que una fecha (de un evento, una cita, una reserva) debe ser FUTURA al crear o actualizar.
> 🧩 **Cómo se combina:** Es un `if` que va dentro del `create`, justo antes de `this.exampleRepository.create(...)`: si la fecha no es futura, 400.

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

> ⚠️ Leé bien el número: _"menos de 111 caracteres"_ es
> `@MaxLength(110)`; _"hasta 111"_ o _"máximo 111"_ es `@MaxLength(111)`.
> Para el update (fecha futura solo si viene), ver el **bloque 82**.

---

### 51. Validar que el evento no haya ocurrido y sea dentro de los próximos N días

> 🎯 **Úsalo en el examen cuando...:** El enunciado agrega una ventana de tiempo límite. Frase típica: _"el evento debe realizarse dentro de los próximos N días"_.
> 🧩 **Cómo se combina:** Son dos `if` que van dentro del `create`, después de buscar la entidad relacionada (necesitás su fecha) y antes de guardar.

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

> 💡 Si `dateField` es una columna `type: 'date'`, llega como string:
> compará con `new Date(relatedExample.dateField)` (ver **bloque 92**).

---

### 52. Descontar cupos al reservar y devolverlos al cancelar (no exceder `availableSpots`)

> 🎯 **Úsalo en el examen cuando...:** Hay un recurso con "cupos"/"stock" que se descuenta al reservar y se repone al cancelar, con validación de que no falten cupos.
> 🧩 **Cómo se combina:** Son dos piezas: en el `create`, después de buscar el relacionado, validás que alcancen los cupos y los descontás antes de guardar; en el `cancel`, los devolvés antes de marcarla como cancelada.

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

> 💡 Estas son las dos PIEZAS de cupos por separado. Las versiones
> completas, con todas las reglas y dentro de una transacción, son el
> **bloque 85** (crear) y el **86** (cancelar: además valida el dueño y que
> el evento no haya ocurrido).

---

### 53. Límite por usuario CONTANDO reservas activas (si cada reserva es de 1 cupo)

> 🎯 **Úsalo en el examen cuando...:** El enunciado pone un TOPE por usuario sobre el mismo recurso. Frase típica: _"máximo 5 cupos activos por usuario en el mismo evento"_.
> 🧩 **Cómo se combina:** Es una PIEZA que se inserta en el esqueleto de `create`, antes de guardar (después de la de cupos, si también aplica).
> ⚠️ **Solo sirve si cada reserva es de 1 cupo.** Si la reserva tiene cantidad, este bloque cuenta reservas y no cupos: usá el **bloque 84**.

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

> ⚠️ `getCount()` cuenta RESERVAS, no cupos. Solo sirve si cada reserva es
> de 1 cupo. Si la reserva tiene cantidad (`numericField`), usá el
> **bloque 84**, que SUMA. Además, `example.ownerId` en el QueryBuilder
> solo funciona si la entity tiene esa columna declarada (bloque 80); si
> no, usá `innerJoin` como en el 84.

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

### 55. Ver un registro solo si es ADMIN o el dueño (403 si no)

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice que un recurso solo puede verlo/editarlo el ADMIN o su propio dueño, no cualquier usuario autenticado.
> 🧩 **Cómo se combina:** Es un `findOne` normal (buscar + 404) con un `if` extra en el medio: si no es admin ni dueño, 403.

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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.CREATED)
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
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'))
changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.exampleService.changePassword(user.id, dto.currentPassword, dto.newPassword);
}
```

---

### 61. Guard de permisos con lógica OR (variante del `PermissionsGuard` que usa AND)

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice que ALCANZA con tener cualquiera de varios permisos, no que se necesiten TODOS a la vez (a diferencia del `PermissionsGuard` estándar, que exige todos).
> 🧩 **Cómo se combina:** Es otra versión del `PermissionsGuard`: cambia `every` (todos los permisos) por `some` (al menos uno). Se usa EN LUGAR del guard normal, no junto con él.

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
> 🧩 **Cómo se combina:** Es un guard que se usa EN LUGAR del `PermissionsGuard` cuando lo único que importa es si el usuario es el dueño del recurso.

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
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), OwnershipGuard)
update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    return this.exampleService.update(id, updateExampleDto);
}
```

---

### 63. Validador personalizado reutilizable (`@IsFutureDate`)

> 🎯 **Úsalo en el examen cuando...:** Repetís la misma validación de "fecha futura" en varios DTOs distintos y querés no duplicar el código (decorador reutilizable).
> 🧩 **Cómo se combina:** En vez de escribir el `if` de fecha futura en el service, lo convertís en un decorador y lo ponés sobre el campo del DTO.

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
> 🧩 **Cómo se combina:** Mismo método que eliminar, pero cambiás `delete(id)` por `softDelete(id)` y agregás `@DeleteDateColumn()` en la entity.

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
@HttpCode(HttpStatus.OK)
remove(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.remove(id);
}

@Patch(':id/restore')
@HttpCode(HttpStatus.OK)
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
@HttpCode(HttpStatus.CREATED)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('manage_examples')
create(@Body() createExampleDto: CreateExampleDto, @CurrentUser() user: User) {
    return this.exampleService.create(createExampleDto, user);
}
```

---

## Bloques de relaciones, estados y trampas de TypeORM (67–81)

> Estos bloques salen de implementar un proyecto real (módulos `vehicles`
> y `build` de `backend-speak`: Car, Garage, SavedCars, Modifications).
> Cubren situaciones que los bloques 1–66 no resolvían directo: validar
> únicos al editar, "solo uno activo a la vez", transiciones de estado con
> enum, crear copiando datos de otra entidad, cascadas desde la entity,
> conectar módulos entre sí y trampas de TypeORM que rompen los `INSERT`
> sin avisar.

### 67. Validar un campo único también al ACTUALIZAR (no solo al crear)

> 🎯 **Úsalo en el examen cuando...:** Ya validaste que un campo sea único al crear y te piden que el `PATCH` tampoco permita repetirlo. Frase típica: _"no se puede editar una Category para ponerle un nombre que ya usa otra"_.
> 🧩 **Cómo se combina:** Es un update que primero busca el registro (404 si no existe). El `if` del duplicado va entre ese buscar y el `update`.

El bloque 17 solo protege el `create`: si no repetís la validación en el
`update`, cualquiera puede "pisar" un valor único editando otro registro
(y la BD responde un 500 por la constraint `unique`). Ojo: si el cliente
manda el MISMO valor que ya tenía, no es duplicado — por eso se compara
contra el valor actual. _(Ejemplo real: el `code` único de un
`ModificationCatalog`)_

```typescript
async update(id: number, updateExampleDto: UpdateExampleDto) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException('Example not found');
    }

    // solo se valida si viene el campo Y es distinto al que ya tenía
    if (updateExampleDto.uniqueField && updateExampleDto.uniqueField !== example.uniqueField) {
        const alreadyExists = await this.exampleRepository.existsBy({ uniqueField: updateExampleDto.uniqueField });
        if (alreadyExists) {
            throw new ConflictException('An Example with that unique value already exists');
        }
    }

    await this.exampleRepository.update(id, updateExampleDto);
    return await this.exampleRepository.findOneBy({ id });
}
```

**Controller:**

```typescript
@Patch(':id')
@HttpCode(HttpStatus.OK)
update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    return this.exampleService.update(id, updateExampleDto);
}
```

---

### 68. Buscar-o-crear el relacionado (si no existe, se crea solo)

> 🎯 **Úsalo en el examen cuando...:** La entidad nueva necesita un relacionado que quizás todavía no existe, y el enunciado dice que se cree automáticamente. Frase típica: _"al registrar el primer vehículo, si el usuario no tiene garage se le crea uno"_.
> 🧩 **Cómo se combina:** Es un create con relación, pero cuando el relacionado no existe NO lanzás 404: lo creás en ese momento y seguís.

Diferencia clave con el bloque 2: allá, si el relacionado no existe es un
ERROR (404). Acá es parte del flujo normal. El `??` usa lo de la izquierda
si existe y, si es `null`, ejecuta la creación. Para que funcione, el
método de búsqueda tiene que devolver `null` (NO lanzar excepción).
_(Ejemplo real: crear un `Car` y asignarle el `Garage` del `User`; el
Garage es 1 a 1 con el usuario)_

```typescript
async create(createExampleDto: CreateExampleDto) {
    const owner = await this.userRepository.findOneBy({ id: createExampleDto.ownerId });
    if (!owner) {
        throw new NotFoundException('Owner not found');
    }

    // si el owner ya tiene su RelatedExample se reutiliza; si no, se crea en el momento
    const relatedExample =
        (await this.relatedExampleService.findByOwner(owner.id)) ??
        (await this.relatedExampleService.create({ ownerId: owner.id }));

    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        owner,
        relatedExample,
    });
    return await this.exampleRepository.save(newExample);
}

// en RelatedExampleService: devuelve null (NO lanza excepción) para poder usar ??
async findByOwner(ownerId: number) {
    return await this.relatedExampleRepository.findOne({
        where: { owner: { id: ownerId } },
    });
}
```

**Controller:**

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
}
```

---

### 69. Solo UNO marcado a la vez (principal / predeterminado / activo)

> 🎯 **Úsalo en el examen cuando...:** Un booleano que solo puede estar en `true` en UN registro por dueño. Frase típica: _"el usuario elige su vehículo principal; solo uno puede ser principal a la vez"_ o _"una sola dirección predeterminada por cliente"_.
> 🧩 **Cómo se combina:** Dentro de una transacción hacés dos pasos: primero ponés en `false` todos los registros del mismo dueño y después ponés en `true` solo el elegido.

Si solo hacés `example.booleanField = true` (bloque 42) quedan DOS
principales. Hay que apagar los demás del MISMO dueño (no de toda la
tabla) y hacerlo en una transacción: si falla el segundo paso, no querés
quedar con cero principales. _(Ejemplo real: `Car.is_principal` por
`User`)_

```typescript
import { DataSource } from 'typeorm';

async setPrincipal(id: number) {
    const example = await this.exampleRepository.findOne({
        where: { id },
        relations: { owner: true },
    });
    if (!example) {
        throw new NotFoundException('Example not found');
    }

    return await this.dataSource.transaction(async (manager) => {
        // 1) apaga TODOS los del mismo dueño
        const ownerExamples = await manager.find(Example, {
            where: { owner: { id: example.owner.id } },
        });
        ownerExamples.forEach((ownerExample) => (ownerExample.booleanField = false));
        await manager.save(ownerExamples);

        // 2) prende solo el elegido
        example.booleanField = true;
        return await manager.save(example);
    });
}
```

> 💡 Si tu entity tiene la FK también como columna (ej. `ownerId`, ver
> bloque 80), el paso 1 se puede hacer en una sola línea:
> `await manager.update(Example, { ownerId: example.ownerId }, { booleanField: false });`

**Controller:**

```typescript
@Patch(':id/principal')
@HttpCode(HttpStatus.OK)
setPrincipal(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.setPrincipal(id);
}
```

---

### 70. Cambiar el estado (confirmar, instalar…) validando el estado actual (`enum`)

> 🎯 **Úsalo en el examen cuando...:** El registro tiene un campo de estado con valores fijos (enum) y te piden un endpoint para avanzarlo, sin permitir repetir el paso. Frase típica: _"marcar la modificación como instalada"_, _"confirmar un pedido pendiente"_.
> 🧩 **Cómo se combina:** Es un `PATCH /:id/<acción>` sin body: buscás el registro, validás el estado actual (409 si ya está en el estado final) y le asignás el siguiente. Si al cambiar hay que completar otro campo (ej. la fecha), va justo antes del `save`.

_(Ejemplo real: una `Modification` pasa de `planned` a `installed` y, si
no tenía fecha de instalación, se completa con la de hoy)_

```typescript
// Example entity — el enum se declara en la entity y se reutiliza en el DTO
export enum ExampleStatus {
    Planned = 'planned',
    Installed = 'installed',
}

@Column({ type: 'enum', enum: ExampleStatus, default: ExampleStatus.Planned })
status: ExampleStatus;

@Column({ type: 'date', nullable: true })
dateField: string | null;

// service
async install(id: number) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException('Example not found');
    }
    if (example.status === ExampleStatus.Installed) {
        throw new ConflictException('This Example is already installed');
    }

    example.status = ExampleStatus.Installed;
    // si no tenía fecha, se completa con la de hoy (formato YYYY-MM-DD)
    if (!example.dateField) {
        example.dateField = new Date().toISOString().slice(0, 10);
    }
    return await this.exampleRepository.save(example);
}
```

**DTO (el estado inicial sí puede venir al crear):**

```typescript
@IsEnum(ExampleStatus, { message: 'El estado debe ser planned o installed' })
status: ExampleStatus;
```

**Controller:**

```typescript
@Patch(':id/install')
@HttpCode(HttpStatus.OK)
install(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.install(id);
}
```

---

### 71. Listar los de un registro filtrando por estado (ej. reservas activas / canceladas)

> 🎯 **Úsalo en el examen cuando...:** Te piden varias "vistas" del mismo listado que solo cambian en un filtro fijo. Frase típica: _"ver las modificaciones instaladas (CURRENT BUILD) y, por separado, las planeadas (PLANNED)"_.
> 🧩 **Cómo se combina:** Un solo método en el service que filtra por el id de la relación Y por un estado que recibe como parámetro. Cada endpoint del controller lo llama pasando un estado fijo distinto.

En vez de escribir `findInstalled()` y `findPlanned()` casi idénticos, un
solo método recibe el estado y cada endpoint le pasa el suyo. Se valida
primero que el relacionado exista: si no, devolverías `[]` y el cliente no
sabría si el id está mal o si simplemente no hay datos. _(Ejemplo real:
`GET /modifications/car/:carId/current` y `.../planned`)_

```typescript
async findByRelatedExampleAndStatus(relatedExampleId: number, status: ExampleStatus) {
    // findOne lanza 404 si no existe
    await this.relatedExampleService.findOne(relatedExampleId);

    return await this.exampleRepository.find({
        where: { relatedExample: { id: relatedExampleId }, status },
        order: { dateField: 'ASC', createdAt: 'ASC' }, // el 2º campo desempata
    });
}
```

**Controller:**

```typescript
// OJO: estas rutas fijas van ANTES de @Get(':id')
@Get('related-example/:relatedExampleId/current')
@HttpCode(HttpStatus.OK)
findCurrent(@Param('relatedExampleId', ParseIntPipe) relatedExampleId: number) {
    return this.exampleService.findByRelatedExampleAndStatus(relatedExampleId, ExampleStatus.Installed);
}

@Get('related-example/:relatedExampleId/planned')
@HttpCode(HttpStatus.OK)
findPlanned(@Param('relatedExampleId', ParseIntPipe) relatedExampleId: number) {
    return this.exampleService.findByRelatedExampleAndStatus(relatedExampleId, ExampleStatus.Planned);
}
```

> 💡 Si además piden un "historial" (todos, sin importar el estado), es el
> mismo `find` sin `status` en el `where`, con el mismo `order`.

---

### 72. Regla que depende de DOS campos (ej. tracción solo para carros) en create y update

> 🎯 **Úsalo en el examen cuando...:** Un campo solo es válido según el valor de otro. Frase típica: _"la tracción solo aplica para carros, no para motos"_ o _"si el pago es con tarjeta, las cuotas son obligatorias"_.
> 🧩 **Cómo se combina:** Pieza que va antes de crear/guardar (mismo lugar que cualquier regla). En el UPDATE hay que combinar lo que llega con lo que ya estaba guardado.

La trampa está en el `update`: el DTO es parcial. Si el cliente manda solo
`type: 'moto'` y el registro ya tenía `traction`, mirar solo el DTO no
detecta el problema. Hay que armar el valor FINAL: lo nuevo si vino, si no
lo que ya estaba. _(Ejemplo real: `Car.traction` solo para `type: carro`)_

```typescript
// create: alcanza con mirar el DTO
async create(createExampleDto: CreateExampleDto) {
    if (createExampleDto.type === ExampleType.B && createExampleDto.optionalField) {
        throw new BadRequestException('optionalField only applies to type A');
    }
    // ... resto del create
}

// update: valor final = lo que llega, o lo que ya estaba guardado
async update(id: number, updateExampleDto: UpdateExampleDto) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException('Example not found');
    }

    const type = updateExampleDto.type ?? example.type;
    // !== undefined (y no ??) para respetar si el cliente manda null a propósito para borrarlo
    const optionalField =
        updateExampleDto.optionalField !== undefined ? updateExampleDto.optionalField : example.optionalField;

    if (type === ExampleType.B && optionalField) {
        throw new BadRequestException('optionalField only applies to type A');
    }

    return await this.exampleRepository.save({ ...example, ...updateExampleDto });
}
```

**Controller:**

```typescript
// No cambia: la regla vive en el service.
@Patch(':id')
@HttpCode(HttpStatus.OK)
update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    return this.exampleService.update(id, updateExampleDto);
}
```

> 💡 Para el `create` también existe `@ValidateIf` en el DTO (ver
> `validaciones_dto.md`), pero en el `update` no conoce lo que ya está
> guardado — por eso la regla completa conviene en el service.

---

### 73. Filtros opcionales (AND) + buscador en varios campos (OR) en el mismo endpoint

> 🎯 **Úsalo en el examen cuando...:** Te piden filtros opcionales Y además un buscador de texto que busque en varios campos, todo en un solo endpoint. Frase típica: _"filtrar vehículos por tipo (carro/moto) y por categoría, con un buscador que encuentre por marca o modelo"_.
> 🧩 **Cómo se combina:** Primero armás el `where` con los filtros que vinieron. Si además vino texto, hacés el `find` con un ARRAY de `where` (eso es OR): cada elemento es una copia de los filtros más la búsqueda en UN campo distinto.

La trampa: si ponés el array OR sin repetir los filtros en cada rama,
`[{ field: ... }, { optionalField: ... }]` ignora los filtros en una de
las ramas y aparecen resultados que no cumplen el tipo. Con `...where` en
cada rama queda `(filtros AND field) OR (filtros AND optionalField)`.
_(Ejemplo real: `GET /car/filter?type=moto&text=yamaha`)_

```typescript
import { ILike } from 'typeorm';

async findWithFilters(filters: { type?: ExampleType; relatedExampleId?: number; text?: string }) {
    const where: any = {};

    if (filters.type) {
        where.type = filters.type;
    }
    if (filters.relatedExampleId) {
        where.relatedExample = { id: filters.relatedExampleId };
    }

    // el texto busca en field O en optionalField, respetando los filtros en ambas ramas
    if (filters.text) {
        return await this.exampleRepository.find({
            where: [
                { ...where, field: ILike(`%${filters.text}%`) },
                { ...where, optionalField: ILike(`%${filters.text}%`) },
            ],
        });
    }

    return await this.exampleRepository.find({ where });
}
```

> ⚠️ Si un filtro y el buscador usan la MISMA columna (ej. filtro `brand`
> y buscador que también mira `brand`), el `...where` de esa rama queda
> pisado por el `ILike` del texto. Usá columnas distintas o combiná ambas
> condiciones con `And(...)` de TypeORM.

**Controller:**

```typescript
// ej: /examples/filter?type=B&relatedExampleId=3&text=abc
@Get('filter')
@HttpCode(HttpStatus.OK)
findWithFilters(
    @Query('type') type?: ExampleType,
    @Query('relatedExampleId') relatedExampleId?: string,
    @Query('text') text?: string,
) {
    return this.exampleService.findWithFilters({
        type,
        relatedExampleId: relatedExampleId ? Number(relatedExampleId) : undefined,
        text,
    });
}
```

---

### 74. Crear un registro copiando datos de OTRA entidad (con estado por defecto)

> 🎯 **Úsalo en el examen cuando...:** El cliente no manda los datos: se toman de otra entidad que ya existe. Frase típica: _"agregar a mi build un producto del Shop sin digitar su información; queda como planned"_ o _"crear un OrderItem copiando el precio actual del Product"_.
> 🧩 **Cómo se combina:** Es un create con dos relaciones donde el DTO trae solo ids: los demás campos se COPIAN del relacionado que buscaste, y los valores fijos (ej. el estado) los pone el service.

¿Por qué copiar y no solo relacionar? Porque es una "foto" del momento: si
mañana el producto cambia de precio, el registro conserva el precio con el
que se agregó. Igual se guarda la relación para saber de dónde salió. Se
usa un DTO aparte, porque el `CreateExampleDto` normal exige campos que
acá no vienen. _(Ejemplo real: `POST /modifications/from-product`)_

```typescript
async createFromSecondRelatedExample(createExampleFromSecondRelatedExampleDto: CreateExampleFromSecondRelatedExampleDto) {
    const relatedExample = await this.relatedExampleService.findOne(createExampleFromSecondRelatedExampleDto.relatedExampleId);

    const secondRelatedExample = await this.secondRelatedExampleRepository.findOneBy({
        id: createExampleFromSecondRelatedExampleDto.secondRelatedExampleId,
    });
    if (!secondRelatedExample) {
        throw new NotFoundException('SecondRelatedExample not found');
    }

    const newExample = this.exampleRepository.create({
        textField: secondRelatedExample.textField, // se copia
        numericField: secondRelatedExample.numericField, // se copia ("foto" del precio)
        status: ExampleStatus.Planned, // valor fijo: NO viene del cliente
        relatedExample,
        secondRelatedExample, // se guarda también de dónde salió
    });
    return await this.exampleRepository.save(newExample);
}
```

**DTO (solo ids):**

```typescript
export class CreateExampleFromSecondRelatedExampleDto {
    @IsInt({ message: 'El id debe ser un número entero' })
    @IsPositive({ message: 'El id debe ser un número positivo' })
    relatedExampleId: number;

    @IsInt({ message: 'El id debe ser un número entero' })
    @IsPositive({ message: 'El id debe ser un número positivo' })
    secondRelatedExampleId: number;
}
```

**Controller:**

```typescript
@Post('from-second-related-example')
@HttpCode(HttpStatus.CREATED)
createFromSecondRelatedExample(
    @Body() createExampleFromSecondRelatedExampleDto: CreateExampleFromSecondRelatedExampleDto,
) {
    return this.exampleService.createFromSecondRelatedExample(createExampleFromSecondRelatedExampleDto);
}
```

---

### 75. `UpdateDto` que NO deja cambiar ciertos campos (`OmitType`)

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice que al editar no se puede cambiar el dueño o a qué registro pertenece. Frase típica: _"el propietario del vehículo no se puede modificar"_ o _"una foto no se puede mover a otro producto"_.
> 🧩 **Cómo se combina:** Reemplaza el `PartialType(CreateExampleDto)` del UpdateDto. No toca el service ni el controller.

Con el `PartialType` normal, el `PATCH` acepta `ownerId` y el bloque 11
reasignaría la relación. `OmitType` saca ese campo del DTO de update, y
como en `main.ts` está `forbidNonWhitelisted: true`, si el cliente lo manda
igual Nest responde 400 automáticamente (_"property ownerId should not
exist"_). _(Ejemplo real: `UpdateCarDto` sin `userId`)_

```typescript
import { OmitType, PartialType } from '@nestjs/mapped-types';

import { CreateExampleDto } from './create-example.dto';

// todos los campos opcionales, MENOS ownerId, que directamente no existe al editar
export class UpdateExampleDto extends PartialType(OmitType(CreateExampleDto, ['ownerId'] as const)) {}
```

> 💡 `as const` es obligatorio para que TypeScript sepa exactamente qué
> campo se quita. Lo contrario (quedarte SOLO con algunos campos) es
> `PickType(CreateExampleDto, ['field'] as const)`.

---

### 76. Ids tipo UUID en la ruta (`ParseUUIDPipe`)

> 🎯 **Úsalo en el examen cuando...:** El id de la entidad no es un número sino un UUID (típico en `User`). Frase típica: _"listar los vehículos de un usuario"_ con rutas como `/examples/user/3f2b...`.
> 🧩 **Cómo se combina:** Reemplaza `ParseIntPipe` dentro de `@Param(...)`. En el DTO el mismo id se valida con `@IsUUID`.

Si usás `ParseIntPipe` con un UUID, Nest responde 400 siempre. Y si no
ponés ningún pipe, un texto cualquiera llega a la BD y Postgres responde
500 (_"invalid input syntax for type uuid"_). `ParseUUIDPipe` lo corta
antes con un 400 claro. _(Ejemplo real: `GET /car/user/:userId`)_

```typescript
// Entity con id UUID
@PrimaryGeneratedColumn('uuid')
id: string;

// DTO: cuando el UUID viene en el body
@IsUUID('all', { message: 'El id del usuario debe ser un UUID válido' })
ownerId: string;

// service: el parámetro es string, no number
async findByOwner(ownerId: string) {
    return await this.exampleRepository.find({
        where: { owner: { id: ownerId } },
    });
}
```

**Controller:**

```typescript
import { ParseUUIDPipe } from '@nestjs/common';

// OJO: ruta fija, va ANTES de @Get(':id')
@Get('user/:ownerId')
@HttpCode(HttpStatus.OK)
findByOwner(@Param('ownerId', ParseUUIDPipe) ownerId: string) {
    return this.exampleService.findByOwner(ownerId);
}
```

---

### 77. Ordenar la lista de la relación que traés (`order` anidado)

> 🎯 **Úsalo en el examen cuando...:** Traés un registro con su lista relacionada (`OneToMany`) y te piden esa lista ordenada. Frase típica: _"mostrar el garage con sus vehículos, el principal primero"_.
> 🧩 **Cómo se combina:** Es una opción más dentro del `find`/`findOne` que ya trae la relación: en `order` anidás el nombre de la relación igual que en `relations`.

El `order` no solo ordena la tabla principal: con la misma forma anidada
que `relations` ordena los elementos de la relación. En un booleano,
`DESC` pone los `true` primero. _(Ejemplo real: `Garage` con sus `cars`,
`is_principal` primero)_

```typescript
async findByOwner(ownerId: number) {
    return await this.exampleRepository.findOne({
        where: { owner: { id: ownerId } },
        relations: { dependentExamples: true },
        order: { dependentExamples: { booleanField: 'DESC', createdAt: 'ASC' } },
    });
}
```

**Controller:**

```typescript
@Get('owner/:ownerId')
@HttpCode(HttpStatus.OK)
findByOwner(@Param('ownerId', ParseIntPipe) ownerId: number) {
    return this.exampleService.findByOwner(ownerId);
}
```

---

### 78. Borrado en cascada desde la entity (`onDelete: 'CASCADE'`)

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice que al borrar un registro se borre también lo que depende de él. Frase típica: _"al eliminar el vehículo se eliminan sus fotos y sus modificaciones"_.
> 🧩 **Cómo se combina:** Es lo contrario de "no dejar borrar si tiene dependientes": acá se borran junto con el padre. Se configura en la entity HIJA (`onDelete: 'CASCADE'`) y el `remove` del service queda como un delete simple.

El `onDelete` va en el `@ManyToOne` del HIJO (el que tiene la FK), no en
el `@OneToMany` del padre. Es lo mismo que ya usa `RolePermission` en este
proyecto. Con `synchronize: true`, TypeORM actualiza la FK al reiniciar.
_(Ejemplo real: `CarPhotos`, `Modifications` y `SavedCars` se borran al
borrar su `Car`)_

```typescript
// DependentExample entity (el HIJO)
@ManyToOne(() => Example, (example) => example.dependentExamples, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'example_id' })
example: Example;
```

**Service y controller:** los del **bloque 13**, sin cambios: el `delete`
del padre ya borra a los hijos porque la BD aplica la cascada.

> 💡 Se pueden combinar 78 y 14: cascada para los hijos "propios" (fotos,
> detalle) y `ConflictException` para dependientes que NO se deben borrar
> solos (ej. publicaciones o preguntas de otros usuarios). Si la FK es
> `nullable` y querés conservar al hijo sin padre, usá
> `onDelete: 'SET NULL'`.

---

### 79. Usar el service de OTRO módulo (`exports` + `imports`)

> 🎯 **Úsalo en el examen cuando...:** Tu service necesita usar el service de otra entidad (ej. `relatedExampleService.findOne(...)`), pero ese service vive en otro módulo, y al arrancar sale: _"Nest can't resolve dependencies of the ExampleService (?, RelatedExampleService)"_.
> 🧩 **Cómo se combina:** No toca el service ni el controller: se arregla en los `*.module.ts`. Es lo que hace el proyecto con `RoleModule` → `UserModule`.

Dos pasos: el módulo que PRESTA el service lo pone en `exports`, y el que
lo USA importa ese MÓDULO (no pone el service en sus `providers`, eso
crearía otra instancia sin su repositorio). _(Ejemplo real: `CarModule`
exporta `CarService` y lo usan `CarPhotosModule`, `SavedCarsModule` y
`ModificationsModule`)_

```typescript
// related-example.module.ts (el que PRESTA el service)
@Module({
    imports: [TypeOrmModule.forFeature([RelatedExample])],
    controllers: [RelatedExampleController],
    providers: [RelatedExampleService],
    exports: [RelatedExampleService], // 👈 sin esto nadie más puede inyectarlo
})
export class RelatedExampleModule {}

// example.module.ts (el que USA el service)
@Module({
    imports: [TypeOrmModule.forFeature([Example]), RelatedExampleModule], // 👈 se importa el MÓDULO
    controllers: [ExampleController],
    providers: [ExampleService],
})
export class ExampleModule {}
```

> 💡 Si el otro módulo NO tiene un service útil (ej. todavía está vacío),
> alcanza con agregar su entity al `forFeature([Example, RelatedExample])`
> e inyectar `@InjectRepository(RelatedExample)` directamente, como en el
> bloque 51. Evitá que A importe B y B importe A (dependencia circular).

---

### 80. Trampa: columna FK + relación con el mismo nombre (`insert: false` rompe los INSERT)

> 🎯 **Úsalo en el examen cuando...:** La entity tiene la FK como columna propia (ej. `user_id`) Y la relación con `@JoinColumn` al mismo nombre, y al crear sale un 500 _"null value in column user_id violates not-null constraint"_ aunque le pasaste la relación.
> 🧩 **Cómo se combina:** Se arregla en la entity; el service no cambia.

Con `insert: false, update: false` en la columna, TypeORM saca esa columna
del `INSERT` por completo, aunque la relación tenga valor. En el log se ve
así: `INSERT INTO "Garage"("created_at") VALUES (DEFAULT)` — el `user_id`
directamente no aparece. _(Ejemplo real: pasaba en TODAS las entities de
`backend-speak`)_

```typescript
// ❌ MAL: la FK nunca se guarda
@Column({ name: 'owner_id', type: 'uuid', insert: false, update: false })
ownerId: string;

@ManyToOne(() => User)
@JoinColumn({ name: 'owner_id' })
owner: User;

// ✅ BIEN: sin insert/update false (o directamente sin declarar la columna)
@Column({ name: 'owner_id', type: 'uuid' })
ownerId: string;

@ManyToOne(() => User)
@JoinColumn({ name: 'owner_id' })
owner: User;
```

> 💡 Tener la FK como columna tiene ventajas: la respuesta ya trae el id
> (`"ownerId": "..."`) y podés filtrar sin relación (`{ ownerId: x }`,
> como en la variante del bloque 69). Si no la necesitás, alcanza con la
> relación sola, como en las entities de este proyecto.

---

### 81. Trampa: ids `bigint` y columnas `numeric` que llegan como `string`

> 🎯 **Úsalo en el examen cuando...:** La entity usa `@PrimaryGeneratedColumn('increment', { type: 'bigint' })` o `@Column({ type: 'numeric' })` (precios) y TypeScript se queja en `findOneBy({ id })` o al guardar un número.
> 🧩 **Cómo se combina:** Pieza de conversión dentro del service; el controller sigue usando `ParseIntPipe` como siempre.

Postgres puede guardar en `bigint`/`numeric`/`decimal` valores que no
entran exactos en un `number` de JavaScript, así que el driver los
devuelve como `string` (por eso la respuesta trae `"id": "1"` con
comillas). Ojo: aunque la entity declare `price: number` con
`type: 'decimal'` (como en el ejemplo `Book` del curso), en ejecución
llega `"45000.00"`: usá `Number(...)` antes de sumar o comparar. El
controller entrega un `number`, entonces el service convierte. Si tu
entity usa el `@PrimaryGeneratedColumn()` normal (int), como en este
proyecto, nada de esto aplica. _(Ejemplo real: todos los ids y el `price`
de `backend-speak`)_

```typescript
// Example entity
@PrimaryGeneratedColumn('increment', { type: 'bigint' })
id: string;

@Column({ type: 'numeric', nullable: true })
numericField: string | null;

// service: el id llega como number (ParseIntPipe) → se convierte para buscar
async findOne(id: number) {
    const example = await this.exampleRepository.findOneBy({ id: String(id) });
    if (!example) {
        throw new NotFoundException(`Example with id ${id} not found`);
    }
    return example;
}

// el DTO valida un number (@IsNumber) y se convierte al crear
async create(createExampleDto: CreateExampleDto) {
    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        numericField: createExampleDto.numericField?.toString(),
    });
    return await this.exampleRepository.save(newExample);
}
```

**Controller:**

```typescript
// no cambia: sigue recibiendo un number
@Get(':id')
@HttpCode(HttpStatus.OK)
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.findOne(id);
}
```

---

## Bloques del parcial tipo Event / Reservation (82–92)

> Estos bloques completan lo que un parcial tipo Event/Reservation pide y
> que los bloques 48–53 no resolvían del todo (o resolvían con un error,
> como el conteo del bloque 53). Ojo con qué es `Example` en cada uno:
>
> - En **82–83**: `Example` = **Event** y `DependentExample` = **Reservation**.
> - En **84–91**: `Example` = **Reservation** y `RelatedExample` = **Event** (salvo donde el código diga otra cosa, como la primera parte del 89).
> - Campos: `capacity` / `availableSpots` = cupos del evento, `numericField` = cantidad de cupos de UNA reserva, `dateField` = fecha del evento, `booleanField` = `isActive` del evento, `status` = estado de la reserva (`ExampleStatus.Active` / `ExampleStatus.Cancelled`), `owner` = usuario dueño de la reserva.

### 82. Actualizar evento: fecha futura si se modifica + capacidad no menor a los cupos reservados

> 🎯 **Úsalo en el examen cuando...:** Te piden editar un recurso con capacidad/stock y dicen _"si se modifica la capacidad, no puede ser menor al número de cupos ya reservados"_ y/o _"si se modifica la fecha, debe seguir siendo futura"_.
> 🧩 **Cómo se combina:** Es un update que primero busca el registro. Entre ese buscar y el `save` van dos `if`: fecha futura (solo si la fecha vino en el DTO) y capacidad ≥ cupos reservados; si cambia la capacidad, recalculás los disponibles.

Los cupos reservados no se guardan en ninguna columna: se calculan como
`capacity - availableSpots`. Si la capacidad cambia, `availableSpots`
también tiene que cambiar (si no, quedaría desfasado). Fórmula:
`nuevos disponibles = nueva capacidad - reservados`. _(Ejemplo real:
`PATCH /events/:id`)_

```typescript
async update(id: number, updateExampleDto: UpdateExampleDto) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException('Event not found');
    }

    // fecha futura, pero SOLO si la fecha viene en el DTO
    if (updateExampleDto.dateField && new Date(updateExampleDto.dateField) <= new Date()) {
        throw new BadRequestException('The event date must be in the future');
    }

    // cupos ya reservados = capacidad actual - disponibles
    const reservedSpots = example.capacity - example.availableSpots;

    if (updateExampleDto.capacity !== undefined) {
        if (updateExampleDto.capacity < reservedSpots) {
            throw new BadRequestException(`Capacity cannot be less than the ${reservedSpots} spots already reserved`);
        }
        // se recalculan los disponibles con la nueva capacidad
        example.availableSpots = updateExampleDto.capacity - reservedSpots;
    }

    return await this.exampleRepository.save({ ...example, ...updateExampleDto });
}
```

**Controller:**

```typescript
@Patch(':id')
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('update_events')
update(@Param('id', ParseIntPipe) id: number, @Body() updateExampleDto: UpdateExampleDto) {
    return this.exampleService.update(id, updateExampleDto);
}
```

> 💡 `availableSpots` tampoco va en el `UpdateExampleDto`: si el
> `CreateExampleDto` no lo tiene (bloque 50), el `PartialType` tampoco.

---

### 83. Desactivar evento solo si no tiene reservas activas (sin toggle)

> 🎯 **Úsalo en el examen cuando...:** Te piden un endpoint para desactivar/cancelar un recurso con una condición. Frase típica: _"desactivar un evento solo si no tiene reservas activas"_.
> 🧩 **Cómo se combina:** Es un `PATCH /:id/deactivate` sin body: buscás el registro, 409 si ya estaba inactivo, contás los dependientes ACTIVOS (409 si hay alguno) y recién ahí ponés `false`.

¿Por qué no el bloque 42? Porque es un toggle: si llaman dos veces al
endpoint de desactivar, la segunda vez lo REACTIVA. Acá, si ya estaba
inactivo, se responde 409. Y del bloque 14 cambia el `where`: no cuentan
todas las reservas, solo las activas (las canceladas no impiden
desactivar). _(Ejemplo real: `PATCH /events/:id/deactivate`)_

```typescript
async deactivate(id: number) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException('Event not found');
    }
    if (!example.booleanField) {
        throw new ConflictException('This event is already inactive');
    }

    // contar solo los dependientes ACTIVOS (los cancelados no impiden)
    const activeDependents = await this.dependentExampleRepository.count({
        where: { example: { id }, status: DependentExampleStatus.Active },
    });
    if (activeDependents > 0) {
        throw new ConflictException('Cannot deactivate: the event has active reservations');
    }

    example.booleanField = false;
    await this.exampleRepository.save(example);
    return { message: 'Event deactivated' };
}
```

**Controller:**

```typescript
@Patch(':id/deactivate')
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('update_events')
deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.deactivate(id);
}
```

> 💡 Para contar dependientes necesitás su repositorio: agregá la entity
> al `forFeature([Example, DependentExample])` del módulo e inyectala con
> `@InjectRepository(DependentExample)`.

---

### 84. Límite por usuario SUMANDO cupos activos (ej. máximo 5 cupos por evento)

> 🎯 **Úsalo en el examen cuando...:** El tope es de CUPOS (cantidades) y no de registros. Frase típica: _"límite por usuario: máximo 5 cupos activos por evento"_ cuando cada reserva puede tener varios cupos.
> 🧩 **Cómo se combina:** Es un `if` que va en el `create` (y en el update si cambia la cantidad), después de validar los cupos disponibles y antes de guardar: sumás los cupos activos del usuario y comparás con el máximo.

⚠️ El bloque 53 usa `getCount()`, que cuenta RESERVAS, y después lo suma
con `numericField`, que son CUPOS. Si un usuario tiene 2 reservas de 3
cupos cada una (6 cupos), `getCount()` devuelve 2 y lo deja reservar
más. Hay que SUMAR la cantidad de cupos de sus reservas activas.
_(Ejemplo real: máximo 5 cupos activos por usuario en el mismo evento)_

```typescript
// opción 1 (la más simple): traer las activas y sumar con reduce
async sumActiveByOwnerAndRelated(ownerId: number, relatedExampleId: number): Promise<number> {
    const activeExamples = await this.exampleRepository.find({
        where: {
            owner: { id: ownerId },
            relatedExample: { id: relatedExampleId },
            status: ExampleStatus.Active,
        },
    });
    return activeExamples.reduce((total, activeExample) => total + activeExample.numericField, 0);
}

// opción 2: que sume la BD con QueryBuilder
async sumActiveByOwnerAndRelatedWithQuery(ownerId: number, relatedExampleId: number): Promise<number> {
    const result = await this.exampleRepository
        .createQueryBuilder('example')
        .innerJoin('example.owner', 'owner')
        .innerJoin('example.relatedExample', 'relatedExample')
        .select('COALESCE(SUM(example.numericField), 0)', 'total')
        .where('owner.id = :ownerId', { ownerId })
        .andWhere('relatedExample.id = :relatedExampleId', { relatedExampleId })
        .andWhere('example.status = :status', { status: ExampleStatus.Active })
        .getRawOne();
    return Number(result.total); // SUM llega como string desde Postgres
}

// dentro de create(), antes de guardar:
const activeSpots = await this.sumActiveByOwnerAndRelated(currentUser.id, createExampleDto.relatedExampleId);
if (activeSpots + createExampleDto.numericField > 5) {
    throw new BadRequestException(`You can only reserve ${5 - activeSpots} more spots for this event`);
}
```

> 💡 Si en tu parcial cada reserva es de 1 solo cupo (no hay campo de
> cantidad), el bloque 53 original sí sirve tal cual.

---

### 85. Crear reserva completa: evento existe, activo, no ocurrió, cupos, límite y descontar

> 🎯 **Úsalo en el examen cuando...:** Te piden crear un recurso que consume cupos de otro con varias reglas a la vez. Frase típica: _"el evento debe existir, estar activo, no haber ocurrido, ser dentro de los próximos 5 días, no exceder los cupos, máximo 5 cupos por usuario, y al crear se descuentan los cupos"_.
> 🧩 **Cómo se combina:** Ya viene armado de principio a fin: dentro de una transacción buscás el evento, validás estado, fechas, cupos y límite por usuario, y recién al final descontás cupos y guardás la reserva con el usuario del token. Adaptá los nombres y quitá las reglas que tu enunciado no pida.

Es el endpoint que más pesa en un parcial así. Fijate el orden: primero
todo lo que puede dar error, al final lo que modifica datos. Adentro de
la transacción se usa `manager` en vez del repositorio (si algo falla,
TypeORM revierte el descuento de cupos). _(Ejemplo real:
`POST /reservations`)_

```typescript
import { DataSource } from 'typeorm';

async create(createExampleDto: CreateExampleDto, currentUser: User) {
    // transacción: si algo falla, no se descuentan cupos ni se crea la reserva
    return await this.dataSource.transaction(async (manager) => {
        // 1) BUSCAR — el evento debe existir
        const relatedExample = await manager.findOneBy(RelatedExample, { id: createExampleDto.relatedExampleId });
        if (!relatedExample) {
            throw new NotFoundException('Event not found');
        }

        // 3) ESTADO — el evento debe estar activo
        if (!relatedExample.booleanField) {
            throw new BadRequestException('The event is not active');
        }

        // 3) ESTADO — no ocurrió y es dentro de los próximos 5 días
        const eventDate = new Date(relatedExample.dateField);
        const now = new Date();
        const limitDate = new Date();
        limitDate.setDate(now.getDate() + 5);

        if (eventDate <= now) {
            throw new BadRequestException('The event has already occurred');
        }
        if (eventDate > limitDate) {
            throw new BadRequestException('The event is not within the next 5 days');
        }

        // 4) REGLAS — hay cupos suficientes
        if (relatedExample.availableSpots < createExampleDto.numericField) {
            throw new BadRequestException('Not enough available spots for this event');
        }

        // 4) REGLAS — máximo 5 cupos activos del usuario en este evento (se SUMAN cupos, no reservas)
        const activeExamples = await manager.find(Example, {
            where: {
                owner: { id: currentUser.id },
                relatedExample: { id: relatedExample.id },
                status: ExampleStatus.Active,
            },
        });
        const activeSpots = activeExamples.reduce((total, activeExample) => total + activeExample.numericField, 0);
        if (activeSpots + createExampleDto.numericField > 5) {
            throw new BadRequestException(`You can only reserve ${5 - activeSpots} more spots for this event`);
        }

        // 5) MODIFICAR — descontar cupos
        relatedExample.availableSpots -= createExampleDto.numericField;
        await manager.save(relatedExample);

        // 5) MODIFICAR — el dueño sale del token; el estado lo pone el service
        const newExample = manager.create(Example, {
            ...createExampleDto,
            relatedExample,
            owner: currentUser,
            status: ExampleStatus.Active,
        });
        return await manager.save(newExample);
    });
}
```

**DTO (el usuario y el estado NO vienen en el body):**

```typescript
import { IsInt, IsPositive, Max, Min } from 'class-validator';

export class CreateExampleDto {
    @IsInt({ message: 'El id del evento debe ser un número entero' })
    @IsPositive({ message: 'El id del evento debe ser un número positivo' })
    relatedExampleId: number;

    @IsInt({ message: 'La cantidad de cupos debe ser un número entero' })
    @Min(1, { message: 'Debe reservar al menos 1 cupo' })
    @Max(5, { message: 'No puede reservar más de 5 cupos' })
    numericField: number;
}
```

**Controller:**

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('create_reservations')
create(@Body() createExampleDto: CreateExampleDto, @Req() req: AuthenticatedRequest) {
    return this.exampleService.create(createExampleDto, req.user);
}
```

---

### 86. Cancelar reserva completa: dueño, no cancelada, evento no ocurrido, liberar cupos y `CANCELLED`

> 🎯 **Úsalo en el examen cuando...:** Te piden cancelar con varias condiciones. Frase típica: _"la reserva debe existir, pertenecer al usuario autenticado, no estar cancelada, el evento no debe haber ocurrido; al cancelar se liberan los cupos y el estado pasa a CANCELLED"_.
> 🧩 **Cómo se combina:** Ya viene armado: dentro de una transacción buscás la reserva con su evento, validás que sea del usuario del token (403), que no esté cancelada (409) y que el evento no haya pasado (400); después devolvés los cupos, cambiás el estado y respondés el mensaje.

Diferencias con el `cancel` del bloque 52: acá se valida que sea del
usuario del token (403), que el evento no haya ocurrido, y se usa un
estado `enum` (`CANCELLED`) en vez de un booleano. _(Ejemplo real:
`PATCH /reservations/:id/cancel`)_

```typescript
async cancel(id: number, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        // 1) BUSCAR — la reserva debe existir
        const example = await manager.findOne(Example, {
            where: { id },
            relations: { owner: true, relatedExample: true },
        });
        if (!example) {
            throw new NotFoundException('Reservation not found');
        }

        // 2) PERMISOS — debe pertenecer al usuario autenticado
        if (example.owner.id !== currentUser.id) {
            throw new ForbiddenException('This reservation does not belong to you');
        }

        // 3) ESTADO — no se puede cancelar dos veces
        if (example.status === ExampleStatus.Cancelled) {
            throw new ConflictException('This reservation was already cancelled');
        }

        // 3) ESTADO — el evento no debe haber ocurrido
        if (new Date(example.relatedExample.dateField) <= new Date()) {
            throw new BadRequestException('Cannot cancel: the event has already occurred');
        }

        // 5) MODIFICAR — liberar cupos + cambiar estado
        example.relatedExample.availableSpots += example.numericField;
        await manager.save(example.relatedExample);

        example.status = ExampleStatus.Cancelled;
        await manager.save(example);

        // 6) RESPONDER — mensaje literal del enunciado
        return { message: 'Reservation cancelled...' };
    });
}
```

**Controller:**

```typescript
@Patch(':id/cancel')
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('cancel_reservations')
cancel(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.exampleService.cancel(id, req.user);
}
```

---

### 87. Actualizar reserva: cambiar la cantidad ajustando los cupos del evento

> 🎯 **Úsalo en el examen cuando...:** Te piden un `PATCH` de un recurso que consume cupos/stock y la cantidad puede cambiar. Frase típica: _"actualizar reserva"_ cuando la reserva tiene cantidad de cupos.
> 🧩 **Cómo se combina:** Es un update dentro de una transacción: buscás la reserva, validás dueño y estado, calculás la DIFERENCIA entre la cantidad nueva y la vieja, validás cupos y límite con esa diferencia, y ajustás los cupos del evento antes de guardar.

La clave es la DIFERENCIA: si la reserva tenía 2 cupos y ahora pide 4, se
descuentan solo 2 más; si baja a 1, se devuelve 1. Con `-=` y una
diferencia negativa, los cupos se suman solos. _(Ejemplo real:
`PATCH /reservations/:id`)_

```typescript
async update(id: number, updateExampleDto: UpdateExampleDto, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const example = await manager.findOne(Example, {
            where: { id },
            relations: { owner: true, relatedExample: true },
        });
        if (!example) {
            throw new NotFoundException('Reservation not found');
        }
        if (example.owner.id !== currentUser.id) {
            throw new ForbiddenException('This reservation does not belong to you');
        }
        if (example.status === ExampleStatus.Cancelled) {
            throw new ConflictException('A cancelled reservation cannot be updated');
        }

        if (updateExampleDto.numericField !== undefined) {
            // + pide más cupos / - devuelve cupos
            const difference = updateExampleDto.numericField - example.numericField;

            if (difference > example.relatedExample.availableSpots) {
                throw new BadRequestException('Not enough available spots for this event');
            }

            // límite: lo activo del usuario SIN esta reserva + la nueva cantidad
            const activeExamples = await manager.find(Example, {
                where: {
                    owner: { id: currentUser.id },
                    relatedExample: { id: example.relatedExample.id },
                    status: ExampleStatus.Active,
                },
            });
            const activeSpots = activeExamples.reduce((total, activeExample) => total + activeExample.numericField, 0);
            if (activeSpots - example.numericField + updateExampleDto.numericField > 5) {
                throw new BadRequestException('You cannot have more than 5 active spots for this event');
            }

            example.relatedExample.availableSpots -= difference;
            await manager.save(example.relatedExample);
            example.numericField = updateExampleDto.numericField;
        }

        return await manager.save(example);
    });
}
```

**Controller:**

```typescript
@Patch(':id')
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('update_reservations')
update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExampleDto: UpdateExampleDto,
    @Req() req: AuthenticatedRequest,
) {
    return this.exampleService.update(id, updateExampleDto, req.user);
}
```

> 💡 Cambiar la reserva a OTRO evento complica todo (devolver cupos a uno
> y descontar del otro). Si el enunciado no lo pide, sacá
> `relatedExampleId` del `UpdateExampleDto` con `OmitType` (bloque 75).

---

### 88. Filtrar entre dos fechas recibidas por query (validadas y con el día final incluido)

> 🎯 **Úsalo en el examen cuando...:** Te piden un `GET` filtrando entre dos fechas. Frase típica: _"GET de reservas filtrando entre dos fechas"_.
> 🧩 **Cómo se combina:** Es un `GET` con dos query params: primero validás las fechas (400 si faltan, son inválidas o el inicio es mayor al fin) y después hacés un `find` con `Between(inicio, fin)` sobre el campo de fecha (propio o de la relación).

El bloque 22 hace `new Date(start)` directo: si mandan `?start=hola`, eso
es `Invalid Date` y la consulta explota con 500. Además, `end=2026-10-05`
es el 5 de octubre a las 00:00, así que las reservas de ESE día quedarían
afuera. _(Ejemplo real: `GET /reservations/between-dates?start=...&end=...`)_

```typescript
import { Between } from 'typeorm';

async findBetweenDates(start: string, end: string) {
    if (!start || !end) {
        throw new BadRequestException('start and end query params are required');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    // fecha mal escrita → Invalid Date → sin esto termina en 500
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('start and end must be valid dates (YYYY-MM-DD)');
    }
    if (startDate > endDate) {
        throw new BadRequestException('start must be before end');
    }

    // si mandan solo el día (YYYY-MM-DD), se incluye ese día completo
    if (end.length === 10) {
        endDate.setUTCHours(23, 59, 59, 999);
    }

    return await this.exampleRepository.find({
        // por la fecha del EVENTO (campo de la relación)...
        where: { relatedExample: { dateField: Between(startDate, endDate) } },
        // ...o por la fecha en que se hizo la reserva: where: { createdAt: Between(startDate, endDate) }
        relations: { relatedExample: true },
        order: { relatedExample: { dateField: 'ASC' } },
    });
}
```

**Controller:**

```typescript
// ej: /api-test/reservations/between-dates?start=2026-10-01&end=2026-10-05
// OJO: ruta fija, va ANTES de @Get(':id')
@Get('between-dates')
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('read_reservations')
findBetweenDates(@Query('start') start: string, @Query('end') end: string) {
    return this.exampleService.findBetweenDates(start, end);
}
```

> 💡 Si piden "MIS reservas entre dos fechas", agregá el dueño al `where`
> (`owner: { id: req.user.id }`) y pasá `req.user` desde el controller
> (bloque 49).

---

### 89. Eliminar evento o reserva: validar que exista, sin 500 por FK y con mensaje propio

> 🎯 **Úsalo en el examen cuando...:** Te piden eliminar validando que exista y respondiendo un mensaje puntual. Frase típica: _"se debe validar la existencia del evento y responder con el mensaje: Este evento ha sido eliminado"_.
> 🧩 **Cómo se combina:** Es un delete que primero busca el registro (404 si no existe), después decide qué pasa con lo que depende de él (impedir con 409 o borrar en cascada), borra y responde un mensaje. Si es una reserva activa, antes devuelve sus cupos.

El bloque 13 devuelve `{ id }` o `null` (un 200 vacío si no existía): el
enunciado pide 404 + mensaje. Y si el evento tiene reservas, el `delete`
choca con la FK y da 500: hay que decidir si se impide (bloque 14) o se
borra en cascada (bloque 78). _(Ejemplo real: `DELETE /events/:id` y
`DELETE /reservations/:id`)_

```typescript
// Example = Event: validar existencia + no borrar si tiene reservas + mensaje
async remove(id: number) {
    const example = await this.exampleRepository.findOneBy({ id });
    if (!example) {
        throw new NotFoundException(`Event with id ${id} not found`);
    }

    const dependentCount = await this.dependentExampleRepository.count({
        where: { example: { id } },
    });
    if (dependentCount > 0) {
        throw new ConflictException('Cannot delete: the event has reservations');
    }

    await this.exampleRepository.delete(id);
    return { message: 'Este evento ha sido eliminado' }; // mensaje literal del enunciado
}

// Example = Reservation: si estaba activa, devolver sus cupos antes de borrar
async removeReservation(id: number) {
    return await this.dataSource.transaction(async (manager) => {
        const example = await manager.findOne(Example, {
            where: { id },
            relations: { relatedExample: true },
        });
        if (!example) {
            throw new NotFoundException(`Reservation with id ${id} not found`);
        }

        if (example.status === ExampleStatus.Active) {
            example.relatedExample.availableSpots += example.numericField;
            await manager.save(example.relatedExample);
        }

        await manager.delete(Example, id);
        return { message: 'Reservation deleted' };
    });
}
```

**Controller:**

```typescript
// sin @HttpCode(NO_CONTENT): con 204 el mensaje NO llega al cliente
@Delete(':id')
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('delete_events')
remove(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.remove(id);
}
```

---

### 90. Responder con un mensaje breve (`{ message, data }`) sin exponer datos sensibles

> 🎯 **Úsalo en el examen cuando...:** El enunciado dice _"debe responderse al usuario de manera adecuada, con un breve mensaje"_, o cuando devolvés un registro con su `owner` (usuario) incluido.
> 🧩 **Cómo se combina:** Solo cambia el `return` final de cualquier método: en vez de devolver la entidad sola, devolvés `{ message, data }` y sacás los datos sensibles del usuario.

Dos cosas: (1) devolver un mensaje corto junto con los datos, y (2) no
devolver el `passwordHash`: si hacés `relations: { owner: true }`, el
usuario completo viaja en la respuesta, contraseña hasheada incluida.
_(Ejemplo real: respuesta de crear un evento o una reserva)_

```typescript
async create(createExampleDto: CreateExampleDto, currentUser: User) {
    // ... validaciones y creación como en los otros bloques
    const savedExample = await this.exampleRepository.save(newExample);

    return {
        message: 'Reservation created successfully',
        data: {
            ...savedExample,
            // solo lo necesario del usuario: nunca passwordHash
            owner: { id: savedExample.owner.id, username: savedExample.owner.username },
        },
    };
}
```

Otras dos formas de sacar el `passwordHash` (la 1 es la que usa el curso):

```typescript
// 1) desestructurar: saca passwordHash y devuelve el resto
const { passwordHash, ...safeUser } = user;
return safeUser;

// 2) select: ni siquiera se trae de la BD (hay que listar TODO lo que querés recibir)
return await this.exampleRepository.find({
    relations: { owner: true },
    select: { id: true, field: true, owner: { id: true, username: true } },
});
```

> 💡 Mensajes típicos: `'Event created successfully'`, `'Event updated'`,
> `'Event deactivated'`, `'Reservation cancelled...'`. Si el enunciado da
> el texto, copialo EXACTO (mayúsculas, puntos y comillas incluidos).

---

### 91. Validar dueño o ADMIN en un método reutilizable (`findOwnedOrFail`)

> 🎯 **Úsalo en el examen cuando...:** Varios endpoints repiten _"debe existir y pertenecer al usuario"_ (ver, editar, cancelar, borrar) y querés escribirlo una sola vez. Suma en "organización y calidad del código".
> 🧩 **Cómo se combina:** Es un método `private` del service que hace "buscar + 404 + validar dueño/admin + 403". Los demás métodos lo llaman en su primera línea en vez de repetir esos `if`.

Recibe si el ADMIN también puede (ver: sí; cancelar: normalmente no) y,
opcionalmente, el `manager` de una transacción, para usarlo también
dentro de los bloques 86 y 87. _(Ejemplo real: `GET /reservations/:id`
es para ADMIN o dueño; `cancel` es solo para el dueño)_

```typescript
import { EntityManager } from 'typeorm';

// privado: lo usan findOne, update, cancel y remove
private async findOwnedOrFail(
    id: number,
    currentUser: User,
    allowAdmin: boolean,
    manager: EntityManager = this.exampleRepository.manager,
) {
    const example = await manager.findOne(Example, {
        where: { id },
        relations: { owner: true, relatedExample: true },
    });
    if (!example) {
        throw new NotFoundException(`Reservation with id ${id} not found`);
    }

    const isOwner = example.owner.id === currentUser.id;
    const isAdmin = allowAdmin && currentUser.role?.name === 'admin';
    if (!isOwner && !isAdmin) {
        throw new ForbiddenException('You do not have access to this reservation');
    }
    return example;
}

// GET /:id → ADMIN o dueño
findOne(id: number, currentUser: User) {
    return this.findOwnedOrFail(id, currentUser, true);
}

// dentro de la transacción de un cancel → solo el dueño
// const example = await this.findOwnedOrFail(id, currentUser, false, manager);
```

**Controller:**

```typescript
@Get(':id')
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('read_reservations')
findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.exampleService.findOne(id, req.user);
}
```

---

### 92. Trampa: fechas (`date` llega como string, `timestamp` como `Date`)

> 🎯 **Úsalo en el examen cuando...:** Comparás fechas (futura, ya ocurrió, dentro de N días) y el resultado no es el esperado, o TypeScript se queja de `string` vs `Date`.
> 🧩 **Cómo se combina:** Es una regla para cualquier `if` que compare fechas: antes de comparar, convertí SIEMPRE los dos lados con `new Date(...)`.

- Columna `type: 'date'` → TypeORM la devuelve como **string** `'2026-10-05'`.
- Columna `type: 'timestamp'` → la devuelve como objeto **`Date`**.
- En el DTO, `@IsDateString()` deja la fecha como **string**.

Comparar un string con un `Date` da resultados raros. Con `new Date(...)`
de los dos lados, la comparación siempre funciona.
_(Ejemplo real: `install_date` de `Modifications` es `date` y llega como
string)_

```typescript
// ✅ comparar: convertir SIEMPRE los dos lados
if (new Date(example.dateField) <= new Date()) {
    throw new BadRequestException('The date must be in the future');
}

// ✅ igualdad de fechas: comparar milisegundos (dos Date nunca son === entre sí)
if (new Date(a).getTime() === new Date(b).getTime()) {
    // ...
}

// ✅ "hoy" para guardar en una columna type: 'date'
example.dateField = new Date().toISOString().slice(0, 10); // '2026-10-05'

// ✅ validar una fecha que llega por query
if (isNaN(new Date(value).getTime())) {
    throw new BadRequestException('Invalid date');
}
```

> 💡 `new Date('2026-10-05')` es la medianoche en UTC. Si comparás contra
> "hoy" en hora local, un evento de hoy puede verse como "ya ocurrido".
> Para fechas con hora, guardá `timestamp` y mandá la hora en el body
> (`'2026-10-05T20:00:00'`).

---

## Bloques de funcionalidades frecuentes: social, carrito y compras (93–100)

> Salen de las historias de usuario de `backend-speak` (likes, seguir
> usuarios, comentarios con respuestas, carrito, compra, notificaciones)
> y son candidatos típicos para un parcial con otro dominio. Siguen los
> mismos placeholders; en el 97 se usan nombres reales porque intervienen
> 4 entidades.

### 93. Relación opcional (`nullable`): asociar, reasignar o desasociar

> 🎯 **Úsalo en el examen cuando...:** Un registro PUEDE (no debe) estar asociado a otro. Frase típica: _"el usuario puede asociar su publicación a uno de sus vehículos"_ o _"la pregunta puede vincularse a una modificación"_.
> 🧩 **Cómo se combina:** En el create buscás el relacionado SOLO si vino su id (si no vino, queda `null`). En el update distinguís tres casos: no vino (no tocar), vino `null` (desasociar) o vino un id (reasignar).

En el update hay 3 casos distintos según lo que llega: `undefined` (no
tocar), `null` (desasociar) o un número (reasignar). Si además el
relacionado tiene que ser del mismo usuario, se agrega el chequeo de
dueño. _(Ejemplo real: `Post.car` opcional; solo se puede asociar un
auto propio)_

```typescript
// Example entity
@ManyToOne(() => RelatedExample, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'related_example_id' })
relatedExample: RelatedExample | null;

// DTO
@IsOptional()
@IsInt({ message: 'El id debe ser un número entero' })
@IsPositive({ message: 'El id debe ser un número positivo' })
relatedExampleId?: number | null;

// service — create: solo se busca si vino el id
async create(createExampleDto: CreateExampleDto, currentUser: User) {
    let relatedExample: RelatedExample | null = null;

    if (createExampleDto.relatedExampleId) {
        relatedExample = await this.relatedExampleRepository.findOne({
            where: { id: createExampleDto.relatedExampleId },
            relations: { owner: true },
        });
        if (!relatedExample) {
            throw new NotFoundException('RelatedExample not found');
        }
        // pieza opcional: solo puede asociar algo SUYO
        if (relatedExample.owner.id !== currentUser.id) {
            throw new ForbiddenException('You can only link your own RelatedExample');
        }
    }

    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        relatedExample,
        owner: currentUser,
    });
    return await this.exampleRepository.save(newExample);
}

// service — update: undefined = no tocar · null = desasociar · número = reasignar
if (updateExampleDto.relatedExampleId !== undefined) {
    if (updateExampleDto.relatedExampleId === null) {
        example.relatedExample = null;
    } else {
        const relatedExample = await this.relatedExampleRepository.findOneBy({ id: updateExampleDto.relatedExampleId });
        if (!relatedExample) {
            throw new NotFoundException('RelatedExample not found');
        }
        example.relatedExample = relatedExample;
    }
}
```

**Controller:**

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('create_examples')
create(@Body() createExampleDto: CreateExampleDto, @Req() req: AuthenticatedRequest) {
    return this.exampleService.create(createExampleDto, req.user);
}
```

---

### 94. Dos relaciones a la MISMA entidad (seguir usuarios): no a sí mismo y sin duplicados

> 🎯 **Úsalo en el examen cuando...:** Una tabla une un usuario con OTRO usuario. Frase típica: _"el usuario puede seguir y dejar de seguir a otros usuarios; ver seguidores y seguidos"_.
> 🧩 **Cómo se combina:** Es una tabla intermedia con dos relaciones que apuntan a `User`: antes de crear validás que no sea él mismo (400), que el otro exista (404) y que no exista ya (409).

Como las dos relaciones son a `User`, cada una necesita su propio nombre
de columna (`follower_id` / `followed_id`). "Seguidores de X" filtra por
`followed`; "a quiénes sigue X" filtra por `follower`. _(Ejemplo real:
`Followers` de `backend-speak`)_

```typescript
// Example entity (ej. Follow)
@ManyToOne(() => User, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'follower_id' })
follower: User; // el que sigue

@ManyToOne(() => User, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'followed_id' })
followed: User; // el seguido

// service
async follow(followedId: number, currentUser: User) {
    if (followedId === currentUser.id) {
        throw new BadRequestException('You cannot follow yourself');
    }

    const followed = await this.userRepository.findOneBy({ id: followedId });
    if (!followed) {
        throw new NotFoundException('User not found');
    }

    const alreadyExists = await this.exampleRepository.findOne({
        where: { follower: { id: currentUser.id }, followed: { id: followedId } },
    });
    if (alreadyExists) {
        throw new ConflictException('You already follow this user');
    }

    const newExample = this.exampleRepository.create({ follower: currentUser, followed });
    return await this.exampleRepository.save(newExample);
}

// seguidores de un usuario (los que lo siguen)
findFollowers(userId: number) {
    return this.exampleRepository.find({
        where: { followed: { id: userId } },
        relations: { follower: true },
    });
}

// a quiénes sigue un usuario
findFollowing(userId: number) {
    return this.exampleRepository.find({
        where: { follower: { id: userId } },
        relations: { followed: true },
    });
}
```

**Controller:**

```typescript
@Post(':userId/follow')
@HttpCode(HttpStatus.CREATED)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('follow_users')
follow(@Param('userId', ParseIntPipe) userId: number, @Req() req: AuthenticatedRequest) {
    return this.exampleService.follow(userId, req.user);
}

@Get(':userId/followers')
@HttpCode(HttpStatus.OK)
findFollowers(@Param('userId', ParseIntPipe) userId: number) {
    return this.exampleService.findFollowers(userId);
}
```

---

### 95. Dar / quitar con el mismo endpoint (toggle de relación: like, guardar)

> 🎯 **Úsalo en el examen cuando...:** Un mismo botón agrega o quita. Frase típica: _"el usuario puede dar y quitar like; la cantidad de likes debe actualizarse"_ o _"guardar y quitar de guardados"_.
> 🧩 **Cómo se combina:** En un solo método buscás si ya existe la fila (usuario + recurso): si existe la borrás, si no la creás. Al final contás cuántas hay para devolver el total actualizado.

Diferencia con el bloque 42: allá se invierte un booleano de UNA fila;
acá se crea o se borra la FILA de la tabla intermedia. Si el enunciado
pide dos endpoints separados (`POST` dar like / `DELETE` quitar), usá el
bloque 4 y el 13 por separado. _(Ejemplo real: `Likes` y `SavedPost`)_

```typescript
async toggle(relatedExampleId: number, currentUser: User) {
    // findOne lanza 404 si no existe
    const relatedExample = await this.relatedExampleService.findOne(relatedExampleId);

    const existing = await this.exampleRepository.findOne({
        where: { owner: { id: currentUser.id }, relatedExample: { id: relatedExampleId } },
    });

    if (existing) {
        await this.exampleRepository.delete(existing.id); // ya tenía like → se quita
    } else {
        const newExample = this.exampleRepository.create({ owner: currentUser, relatedExample });
        await this.exampleRepository.save(newExample); // no tenía → se da
    }

    // cantidad actualizada
    const total = await this.exampleRepository.count({
        where: { relatedExample: { id: relatedExampleId } },
    });
    return { liked: !existing, total };
}
```

**Controller:**

```typescript
@Post('related-example/:relatedExampleId/toggle')
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('like_examples')
toggle(@Param('relatedExampleId', ParseIntPipe) relatedExampleId: number, @Req() req: AuthenticatedRequest) {
    return this.exampleService.toggle(relatedExampleId, req.user);
}
```

---

### 96. Si ya existe, sumar en vez de duplicar (agregar al carrito)

> 🎯 **Úsalo en el examen cuando...:** Agregar algo que ya está debe aumentar la cantidad, no crear otra fila. Frase típica: _"agregar un producto al carrito; si ya está, se suma la cantidad"_ o _"el carrito muestra los productos y el total"_.
> 🧩 **Cómo se combina:** Buscás si el usuario ya tiene ese producto: si existe le sumás la cantidad y guardás; si no, creás la fila. Para el total del carrito recorrés los items con `reduce`.

A diferencia del bloque 4, que responde 409 si ya existe, acá lo ya
existente se actualiza. _(Ejemplo real: `Cart` de `backend-speak`, donde
`Example` = item del carrito, `RelatedExample` = Product y `numericField`
= cantidad)_

```typescript
async addToCart(createExampleDto: CreateExampleDto, currentUser: User) {
    // findOne lanza 404 si el producto no existe
    const relatedExample = await this.relatedExampleService.findOne(createExampleDto.relatedExampleId);

    const existing = await this.exampleRepository.findOne({
        where: { owner: { id: currentUser.id }, relatedExample: { id: relatedExample.id } },
    });

    if (existing) {
        existing.numericField += createExampleDto.numericField;
        return await this.exampleRepository.save(existing);
    }

    const newExample = this.exampleRepository.create({
        numericField: createExampleDto.numericField,
        owner: currentUser,
        relatedExample,
    });
    return await this.exampleRepository.save(newExample);
}

// ver el carrito con el total (resumen antes de comprar)
async findMyCart(ownerId: number) {
    const items = await this.exampleRepository.find({
        where: { owner: { id: ownerId } },
        relations: { relatedExample: true },
    });
    // Number(...) porque un precio numeric llega como string
    const total = items.reduce((sum, item) => sum + Number(item.relatedExample.price) * item.numericField, 0);
    return { items, total };
}
```

**Controller:**

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('manage_cart')
addToCart(@Body() createExampleDto: CreateExampleDto, @Req() req: AuthenticatedRequest) {
    return this.exampleService.addToCart(createExampleDto, req.user);
}

// OJO: ruta fija, va ANTES de @Get(':id')
@Get('me')
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('manage_cart')
findMyCart(@Req() req: AuthenticatedRequest) {
    return this.exampleService.findMyCart(req.user.id);
}
```

---

### 97. Receta armada: comprar el carrito (pedido + items en una transacción)

> 🎯 **Úsalo en el examen cuando...:** Te piden "confirmar la compra": pasar lo del carrito a un pedido. Frase típica: _"el usuario confirma los productos de su carrito; la compra solo se completa después de la confirmación"_.
> 🧩 **Cómo se combina:** Ya viene armado: dentro de una transacción traés el carrito (400 si está vacío), calculás el total, creás el pedido, creás un item por producto copiando el precio del momento y al final vaciás el carrito.

Son 4 tablas (carrito, pedido, items del pedido, producto): si falla
cualquier paso, no puede quedar un pedido sin items o un carrito vaciado
sin pedido. Por eso todo va en UNA transacción. _(Ejemplo real: `Cart`,
`Orders`, `OrderItems` y `Product` de `backend-speak`; nombres reales
porque con placeholders no se entendería)_

```typescript
async checkout(currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const cartItems = await manager.find(Cart, {
            where: { user: { id: currentUser.id } },
            relations: { product: true },
        });
        if (cartItems.length === 0) {
            throw new BadRequestException('Your cart is empty');
        }

        // total calculado en el back (nunca confiar en un total que mande el cliente)
        const total = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

        const newOrder = await manager.save(manager.create(Order, { user: currentUser, total }));

        // cada item copia el precio del momento (si después cambia el producto, el pedido no cambia)
        const orderItems = cartItems.map((item) =>
            manager.create(OrderItem, {
                order: newOrder,
                product: item.product,
                quantity: item.quantity,
                unitPrice: item.product.price,
            }),
        );
        await manager.save(orderItems);

        // vaciar el carrito: delete acepta un array de ids
        await manager.delete(
            Cart,
            cartItems.map((item) => item.id),
        );

        return { message: 'Purchase completed', orderId: newOrder.id, total };
    });
}
```

**Controller:**

```typescript
@Post('checkout')
@HttpCode(HttpStatus.CREATED)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('create_orders')
checkout(@Req() req: AuthenticatedRequest) {
    return this.orderService.checkout(req.user);
}
```

> 💡 Si hay stock, se valida antes de crear el pedido (bloque 52 en cada
> item) y se descuenta dentro de la misma transacción.

---

### 98. Relación con la misma tabla (respuestas a comentarios: `parent` / `replies`)

> 🎯 **Úsalo en el examen cuando...:** Un registro puede responder a otro de su MISMA tabla. Frase típica: _"el usuario puede responder a un comentario; las respuestas aparecen relacionadas con el comentario"_.
> 🧩 **Cómo se combina:** La entity tiene una relación consigo misma (`parent` / `replies`). En el create, si viene `parentId` buscás al padre y validás que sea del mismo post. Para listar traés solo los que tienen `parent` nulo y cargás sus `replies`.

El comentario "raíz" tiene `parent = null`; una respuesta tiene `parent`
= el comentario al que responde. Una regla típica: la respuesta tiene que
ser del MISMO post que su padre. _(Ejemplo real: `Comments` de
`backend-speak`)_

```typescript
// Example entity (ej. Comment)
@ManyToOne(() => Example, (example) => example.replies, { nullable: true, onDelete: 'CASCADE' })
@JoinColumn({ name: 'parent_id' })
parent: Example | null;

@OneToMany(() => Example, (example) => example.parent)
replies: Example[];

// service
async create(createExampleDto: CreateExampleDto, currentUser: User) {
    const relatedExample = await this.relatedExampleService.findOne(createExampleDto.relatedExampleId); // el post

    let parent: Example | null = null;
    if (createExampleDto.parentId) {
        parent = await this.exampleRepository.findOne({
            where: { id: createExampleDto.parentId },
            relations: { relatedExample: true },
        });
        if (!parent) {
            throw new NotFoundException('Parent comment not found');
        }
        if (parent.relatedExample.id !== relatedExample.id) {
            throw new BadRequestException('The reply must belong to the same post');
        }
    }

    const newExample = this.exampleRepository.create({
        ...createExampleDto,
        relatedExample,
        parent,
        owner: currentUser,
    });
    return await this.exampleRepository.save(newExample);
}

// comentarios raíz de un post, cada uno con sus respuestas
findByRelatedExample(relatedExampleId: number) {
    return this.exampleRepository.find({
        where: { relatedExample: { id: relatedExampleId }, parent: IsNull() },
        relations: { owner: true, replies: { owner: true } },
        order: { createdAt: 'ASC' },
    });
}
```

**Controller:**

```typescript
@Get('related-example/:relatedExampleId')
@HttpCode(HttpStatus.OK)
findByRelatedExample(@Param('relatedExampleId', ParseIntPipe) relatedExampleId: number) {
    return this.exampleService.findByRelatedExample(relatedExampleId);
}
```

---

### 99. Efecto secundario: al crear un registro, crear otro automáticamente (notificación)

> 🎯 **Úsalo en el examen cuando...:** Crear algo debe disparar otro registro. Frase típica: _"el propietario recibe una notificación cuando alguien pregunta sobre su vehículo"_ o _"registrar en un historial cada reserva"_.
> 🧩 **Cómo se combina:** Es un create normal (buscás el relacionado, creás y guardás el registro), pero todo va dentro de `this.dataSource.transaction(...)` y, justo después de guardar el registro principal, hacés un segundo `manager.save(...)` con la notificación. Si falla cualquiera de los dos, no se guarda ninguno.

Si la notificación falla, la pregunta tampoco debería quedar guardada (o
al revés): por eso van juntas. Regla común: no notificarte a vos mismo.
_(Ejemplo real: SUP-35 de `backend-speak`, pregunta → notificación al
dueño del vehículo)_

```typescript
async create(createExampleDto: CreateExampleDto, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const relatedExample = await manager.findOne(RelatedExample, {
            where: { id: createExampleDto.relatedExampleId },
            relations: { owner: true },
        });
        if (!relatedExample) {
            throw new NotFoundException('RelatedExample not found');
        }

        const savedExample = await manager.save(
            manager.create(Example, { ...createExampleDto, relatedExample, owner: currentUser }),
        );

        // efecto secundario: avisarle al dueño del relacionado (si no es él mismo)
        if (relatedExample.owner.id !== currentUser.id) {
            await manager.save(
                manager.create(Notification, {
                    user: relatedExample.owner,
                    message: `${currentUser.username} asked a question about your vehicle`,
                }),
            );
        }

        return savedExample;
    });
}
```

**Controller:**

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Permissions('create_questions')
create(@Body() createExampleDto: CreateExampleDto, @Req() req: AuthenticatedRequest) {
    return this.exampleService.create(createExampleDto, req.user);
}
```

---

### 100. Campo calculado en la respuesta (`map`): cupos reservados, etiqueta OWNER

> 🎯 **Úsalo en el examen cuando...:** Te piden mostrar un dato que NO es una columna, sino que se calcula. Frase típica: _"mostrar cuántos cupos están reservados"_ o _"las respuestas del propietario muestran la etiqueta OWNER"_.
> 🧩 **Cómo se combina:** Después del `find`/`findOne` y antes del `return`, recorrés los resultados con `.map(...)` y a cada uno le agregás el campo calculado. No toca la BD ni la entity.

No hace falta una columna nueva para algo que se deduce de otras: se
calcula al responder. _(Ejemplo real: `reservedSpots` de un Event;
etiqueta OWNER de SUP-34 en `backend-speak`)_

```typescript
// Example = Event: cupos reservados calculados
async findAll() {
    const examples = await this.exampleRepository.find();
    return examples.map((example) => ({
        ...example,
        reservedSpots: example.capacity - example.availableSpots, // no existe en la BD
    }));
}

// etiqueta OWNER: la respuesta es del dueño del recurso sobre el que se preguntó
// (Example = Question, RelatedExample = Car, DependentExample = Answer)
async findDependentsWithOwnerTag(id: number) {
    const example = await this.exampleRepository.findOne({
        where: { id },
        relations: { relatedExample: { owner: true }, dependentExamples: { owner: true } },
    });
    if (!example) {
        throw new NotFoundException('Question not found');
    }

    return example.dependentExamples.map((dependentExample) => ({
        ...dependentExample,
        isOwner: dependentExample.owner.id === example.relatedExample.owner.id,
    }));
}
```

**Controller:**

```typescript
@Get(':id/answers')
@HttpCode(HttpStatus.OK)
findDependentsWithOwnerTag(@Param('id', ParseIntPipe) id: number) {
    return this.exampleService.findDependentsWithOwnerTag(id);
}
```

---

## Bloques del curso (Docukelo): seguridad, pipes y testing (101–105)

> Salen de la documentación oficial del curso (Docukelo, semanas 5 a 8)
> y cubren lo que ahí aparece y el recetario no tenía: guards a nivel de
> controller, las dos causas más comunes de 401/403/500 con JWT, los
> pipes integrados de Nest y cómo testear un service.

### 101. Guards UNA vez sobre la clase + `@Permissions` en cada método

> 🎯 **Úsalo en el examen cuando...:** TODOS los endpoints de un controller van protegidos (típico: _"para todos los recursos, deben estar limitados según los permisos del usuario"_) y no querés repetir `@UseGuards(...)` en cada método.
> 🧩 **Cómo se combina:** Movés el `@UseGuards(AuthGuard('jwt'), PermissionsGuard)` de cada método a encima de la clase del controller; en cada método dejás solo su `@Permissions('...')`. El service no cambia.

Así lo hace el curso: `@UseGuards` sobre la clase aplica a todos los
endpoints, y el orden sigue siendo el mismo (primero `AuthGuard('jwt')`,
que carga `req.user`; después `PermissionsGuard`, que lo lee). Menos
líneas y ningún endpoint queda desprotegido por olvido. _(Ejemplo real:
`UsersController` del curso)_

```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions/permissions.guard';

@Controller('api-test/examples')
@UseGuards(AuthGuard('jwt'), PermissionsGuard) // 👈 una sola vez: aplica a TODOS los endpoints
export class ExampleController {
    constructor(private readonly exampleService: ExampleService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permissions('examples:create') // 👈 en cada método, solo el permiso
    create(@Body() createExampleDto: CreateExampleDto) {
        return this.exampleService.create(createExampleDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @Permissions('examples:read')
    findAll() {
        return this.exampleService.findAll();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions('examples:read')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.exampleService.findOne(id);
    }
}
```

- Un método SIN `@Permissions` igual pide token (lo exige `AuthGuard`), pero el `PermissionsGuard` lo deja pasar. Si un endpoint tiene que ser PÚBLICO (sin token), no pongas los guards en la clase: ponelos método por método (bloque 48) o usá `@Public()` (bloque 58).
- `@Permissions('a', 'b')` exige los DOS (`every`). Si alcanza con uno, bloque 61.
- **Nombres de permisos:** el curso usa `recurso:acción` (`users:read`) y el seed del repaso `acción_recurso` (`create_routine`). No inventes: copiá los nombres EXACTOS del `insert.sql` del parcial. Un permiso que no existe en la BD da 403 para todos.
- Los paths de `Permissions` y `PermissionsGuard` dependen de dónde estén en el proyecto que te den: buscalos antes de importar.

---

### 102. Trampa: el `JwtStrategy` no carga los permisos del usuario (403 o 500 en todo)

> 🎯 **Úsalo en el examen cuando...:** El login funciona pero TODOS los endpoints protegidos responden 403 (aunque el usuario tenga el permiso) o 500.
> 🧩 **Cómo se combina:** Se arregla en el `UsersService` que usa el `JwtStrategy`; los controllers y services del parcial no cambian.

El `PermissionsGuard` arma la lista con
`user.role?.rolePermissions?.map((rp) => rp.permission.name)`. Ese `user`
es lo que devuelve `JwtStrategy.validate()`. Si se buscó SIN las
relaciones, `rolePermissions` es `undefined`: la lista queda vacía (403
para todos) o revienta si no hay `?.` (500). El curso lo marca como la
causa más frecuente de 500 en esta parte. _(Ejemplo real: semana 7 del
curso, "Cuidado con Relaciones Nulas en TypeORM")_

```typescript
// users.service.ts — lo usa JwtStrategy.validate(payload) (y el login, en findByEmail)
async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
        where: { id },
        relations: {
            role: {
                rolePermissions: {
                    permission: true,
                },
            },
        },
        // equivalente en el curso: relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission']
    });
}

// jwt.strategy.ts
async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
        throw new UnauthorizedException('The token does not belong to an active user');
    }
    return user; // 👈 esto es lo que queda en req.user
}
```

> 💡 `req.user` trae el usuario COMPLETO, con `passwordHash`: nunca lo
> devuelvas directo en una respuesta (bloque 90). Si los ids de usuario
> son UUID, en `JwtPayload` va `sub: string` en vez de `number`.

---

### 103. Trampa: la clave del token del login no coincide con Postman (401 en todo)

> 🎯 **Úsalo en el examen cuando...:** Te dan una colección de Postman, el login responde 200, pero todos los endpoints protegidos dan 401 _"Unauthorized"_.
> 🧩 **Cómo se combina:** No toca tu código de negocio: es revisar que el `return` del login y el script de la colección usen el MISMO nombre.

En el propio curso pasa: `AuthService.login` devuelve `access_token`, pero
el script de Postman lee `responseData.accessToken`. Si no coinciden,
Postman guarda `undefined` en `{{jwt_token}}` y cada petición protegida
viaja sin token válido. _(Ejemplo real: semana 7 vs semana 8 del curso)_

```typescript
// auth.service.ts
return {
    access_token: this.jwtService.sign(payload), // 👈 este nombre...
    token_type: 'Bearer',
};
```

```javascript
// Postman → petición de login → pestaña Tests (Post-response)
const responseData = pm.response.json();
pm.environment.set('jwt_token', responseData.access_token); // 👈 ...tiene que ser el mismo acá
```

Y en cada petición protegida: pestaña **Authorization** → tipo **Bearer
Token** → `{{jwt_token}}`.

**Diagnóstico rápido por código de error:**

| Respuesta                | Qué falla                                        | Dónde mirar            |
| ------------------------ | ------------------------------------------------ | ---------------------- |
| 401 en todo              | El token no llega, expiró o la clave no coincide | Este bloque (103)      |
| 403 teniendo permiso     | Relaciones del usuario o nombre del permiso      | Bloques 102 y 101      |
| 403 esperado             | Correcto: autenticado pero sin permiso           | Bloque 33 (401 vs 403) |
| 500 en todo lo protegido | `rolePermissions` sin cargar                     | Bloque 102             |

> 💡 El payload del JWT NO está cifrado (es Base64): cualquiera lo lee.
> Nunca pongas contraseñas ni datos sensibles adentro; alcanza con `sub`,
> `email` y `permissions`.

---

### 104. Pipes integrados de Nest para params y query (valor por defecto, enum, booleano, lista)

> 🎯 **Úsalo en el examen cuando...:** Un parámetro de la URL no es un simple número: es opcional con valor por defecto, un enum, un booleano, un decimal o una lista de ids.
> 🧩 **Cómo se combina:** Cada pipe va como segundo argumento de `@Query(...)` o `@Param(...)` en el controller, en lugar de `ParseIntPipe` o de convertir a mano con `Number(...)`, `=== 'true'` o `split(',')`. El service no cambia.

Todos vienen de `@nestjs/common` y responden 400 solos si el valor es
inválido, así el service recibe el dato ya convertido y validado.
_(Ejemplo real: `CatsController` de la semana 6 del curso)_

```typescript
import {
    DefaultValuePipe,
    ParseArrayPipe,
    ParseBoolPipe,
    ParseEnumPipe,
    ParseFloatPipe,
    ParseIntPipe,
    ParseUUIDPipe,
} from '@nestjs/common';

// paginación opcional: si no mandan page/limit, usa 1 y 10 (DefaultValuePipe va ANTES de ParseIntPipe)
@Get('paginated')
@HttpCode(HttpStatus.OK)
findPaginated(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
) {
    return this.exampleService.findPaginated(page, limit);
}

// enum en la ruta: 400 si no es un valor del enum
@Get('status/:status')
@HttpCode(HttpStatus.OK)
findByStatus(@Param('status', new ParseEnumPipe(ExampleStatus)) status: ExampleStatus) {
    return this.exampleService.findByStatus(status);
}

// booleano en query: "true" / "false" → boolean (en vez de comparar === 'true' a mano)
@Get('active')
@HttpCode(HttpStatus.OK)
findByActive(@Query('active', ParseBoolPipe) active: boolean) {
    return this.exampleService.findByActive(active);
}

// decimal en query: "19.99" → 19.99
@Get('price/up-to')
@HttpCode(HttpStatus.OK)
findUpTo(@Query('max', ParseFloatPipe) max: number) {
    return this.exampleService.findLessThanOrEqual(max);
}

// lista separada por comas → number[] (en vez de hacer split(',') a mano)
@Get('by-ids')
@HttpCode(HttpStatus.OK)
findByIds(@Query('ids', new ParseArrayPipe({ items: Number, separator: ',' })) ids: number[]) {
    return this.exampleService.findByIds(ids);
}

// UUID de una versión puntual
@Get('by-uuid/:uuid')
@HttpCode(HttpStatus.OK)
findByUuid(@Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string) {
    return this.exampleService.findByUuid(uuid);
}
```

> 💡 Para leer una cabecera: `@Headers('authorization') authHeader: string`.
> Recordá que todas estas rutas fijas van ANTES de `@Get(':id')`.

---

### 105. Test unitario de un service con el repositorio mockeado

> 🎯 **Úsalo en el examen cuando...:** Te piden pruebas unitarias de un service, o el `.spec.ts` que genera `nest g resource` falla con _"Nest can't resolve dependencies of the ExampleService"_.
> 🧩 **Cómo se combina:** Va en `example.service.spec.ts`, al lado del service. Cada dependencia del constructor necesita un `provide` falso en el módulo de test.

El test no se conecta a la BD: el repositorio se reemplaza por un objeto
con `jest.fn()` y vos decidís qué devuelve cada método. Se prueba el
caso exitoso y el de error (que NO se guarde nada). Este test usa el
`create` del bloque 2. _(Ejemplo real: `users.service.spec.ts` de la
semana 6 del curso)_

```typescript
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

const mockExampleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
};
const mockRelatedExampleService = { findOne: jest.fn() };

describe('ExampleService', () => {
    let service: ExampleService;

    beforeEach(async () => {
        jest.clearAllMocks(); // limpia las llamadas entre un test y otro

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExampleService,
                // una entrada por CADA dependencia del constructor
                { provide: getRepositoryToken(Example), useValue: mockExampleRepository },
                { provide: RelatedExampleService, useValue: mockRelatedExampleService },
                // si el service usa transacciones: { provide: DataSource, useValue: { transaction: jest.fn() } }
            ],
        }).compile();

        service = module.get<ExampleService>(ExampleService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('crea el Example cuando el RelatedExample existe', async () => {
        const createExampleDto = { field: 'abc', relatedExampleId: 1 };
        const relatedExample = { id: 1 };
        const newExample = { id: 10, ...createExampleDto, relatedExample };

        mockRelatedExampleService.findOne.mockResolvedValue(relatedExample);
        mockExampleRepository.create.mockReturnValue(newExample);
        mockExampleRepository.save.mockResolvedValue(newExample);

        const result = await service.create(createExampleDto as CreateExampleDto);

        expect(mockExampleRepository.create).toHaveBeenCalledWith({ ...createExampleDto, relatedExample });
        expect(result).toEqual(newExample);
    });

    it('lanza NotFoundException y NO guarda si el RelatedExample no existe', async () => {
        mockRelatedExampleService.findOne.mockResolvedValue(null);

        await expect(service.create({ field: 'abc', relatedExampleId: 99 } as CreateExampleDto)).rejects.toThrow(
            NotFoundException,
        );
        expect(mockExampleRepository.save).not.toHaveBeenCalled();
    });
});
```

**Test del controller** (solo se mockea el service):

```typescript
const module: TestingModule = await Test.createTestingModule({
    controllers: [ExampleController],
    providers: [{ provide: ExampleService, useValue: { create: jest.fn(), findAll: jest.fn() } }],
}).compile();
```

> 💡 Comandos: `npm run test` (todo), `npm test example.service.spec.ts`
> (un archivo), `npm run test:cov` (cobertura). En un test unitario del
> controller los guards no se ejecutan; en un test e2e (app completa con
> `supertest`) se pueden anular con
> `.overrideGuard(AuthGuard('jwt')).useValue({ canActivate: () => true })`.

---

## Tabla resumen — ¿qué bloque uso según lo que me piden?

Para no tener que escanear una lista de 105 filas, está agrupada por tipo de problema. Buscá primero la categoría que se parece a lo que te piden, y ahí el bloque puntual.

> 🧭 Si ya sabés QUÉ bloques necesitás pero no cómo juntarlos, volvé a la guía "Cómo combinar los bloques" del principio (orden de las piezas + ejemplo del pre-parcial armado).

### 🧱 A. CRUD básico (crear, leer, actualizar, eliminar)

| El problema pide...                                             | Bloque                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Crear entidad simple (sin relación)                             | [#1](#1-crear-un-registro-simple-sin-relaciones)                                            |
| Crear entidad que depende de OTRA (1 relación)                  | [#2](#2-crear-un-registro-que-pertenece-a-otra-entidad-buscar-el-relacionado-por-id--404)   |
| Crear tabla intermedia (2 relaciones)                           | [#3](#3-crear-un-registro-que-une-dos-entidades-tabla-intermedia-inscripción-rol-permiso)   |
| Evitar asociación duplicada                                     | [#4](#4-crear-sin-repetir-la-misma-combinación-ej-no-inscribirse-dos-veces-al-mismo-curso)  |
| Buscar uno por id                                               | [#7](#7-buscar-uno-por-id)                                                                  |
| Actualizar campos simples                                       | [#10](#10-actualizar-campos-simples-sin-tocar-relaciones)                                   |
| Actualizar cambiando 1 relación                                 | [#11](#11-actualizar-cambiando-a-qué-registro-pertenece-reasignar-una-relación)             |
| Actualizar cambiando 2 relaciones                               | [#12](#12-actualizar-reasignando-dos-relaciones-tabla-intermedia)                           |
| Eliminar simple                                                 | [#13](#13-eliminar-por-id-simple-cualquier-entidad)                                         |
| Eliminar con validación de dependencias                         | [#14](#14-eliminar-solo-si-no-tiene-registros-asociados-ej-evento-con-reservas--409)        |
| Evitar valores duplicados en un campo único al crear            | [#17](#17-verificar-si-ya-existe-antes-de-crear-evitar-duplicados-por-campo-único)          |
| Evitar valores duplicados en un campo único al ACTUALIZAR       | [#67](#67-validar-un-campo-único-también-al-actualizar-no-solo-al-crear)                    |
| Crear el relacionado automáticamente si no existe               | [#68](#68-buscar-o-crear-el-relacionado-si-no-existe-se-crea-solo)                          |
| Crear copiando datos de otra entidad                            | [#74](#74-crear-un-registro-copiando-datos-de-otra-entidad-con-estado-por-defecto)          |
| Que el update NO deje cambiar ciertos campos                    | [#75](#75-updatedto-que-no-deja-cambiar-ciertos-campos-omittype)                            |
| Eliminar en cascada (borrar hijos junto con el padre)           | [#78](#78-borrado-en-cascada-desde-la-entity-ondelete-cascade)                              |
| Eliminar validando existencia y respondiendo un mensaje         | [#89](#89-eliminar-evento-o-reserva-validar-que-exista-sin-500-por-fk-y-con-mensaje-propio) |
| Si ya existe, sumar en vez de duplicar (carrito)                | [#96](#96-si-ya-existe-sumar-en-vez-de-duplicar-agregar-al-carrito)                         |
| Al crear un registro, crear otro automáticamente (notificación) | [#99](#99-efecto-secundario-al-crear-un-registro-crear-otro-automáticamente-notificación)   |

### 🔗 B. Relaciones especiales (`OneToOne` / `ManyToMany`)

| El problema pide...                                    | Bloque                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Relación uno a uno (`@OneToOne`)                       | [#20](#20-relación-onetoone-uno-a-uno)                                                      |
| Relación muchos a muchos directa (`@ManyToMany`)       | [#21](#21-relación-manytomany-directa-sin-service-de-tabla-intermedia)                      |
| Quitar un elemento de una `ManyToMany`                 | [#40](#40-quitar-un-elemento-de-una-relación-manytomany)                                    |
| Reemplazar todos los relacionados de una `ManyToMany`  | [#41](#41-reemplazar-todos-los-relacionados-de-una-manytomany-de-una-sola-vez)              |
| Relación opcional (`nullable`): asociar / desasociar   | [#93](#93-relación-opcional-nullable-asociar-reasignar-o-desasociar)                        |
| Dos relaciones a la MISMA entidad (seguir usuarios)    | [#94](#94-dos-relaciones-a-la-misma-entidad-seguir-usuarios-no-a-sí-mismo-y-sin-duplicados) |
| Relación con la misma tabla (respuestas a comentarios) | [#98](#98-relación-con-la-misma-tabla-respuestas-a-comentarios-parent--replies)             |

### 🔍 C. Búsquedas y filtros

| El problema pide...                                        | Bloque                                                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Listar todo con su relación                                | [#5](#5-buscar-todos-trayendo-la-relación-join)                                               |
| Listar con relación anidada (2 niveles)                    | [#6](#6-buscar-todos-trayendo-dos-niveles-de-relación-anidados)                               |
| Filtrar por campo de la relación                           | [#8](#8-buscar-filtrando-por-un-campo-de-la-relación-no-propio)                               |
| Búsqueda parcial de texto (`Like`)                         | [#9](#9-buscar-por-texto-parcial-like--contiene)                                              |
| Contar filtrando por relación                              | [#16](#16-contar-filtrando-por-relación)                                                      |
| Filtrar por mayor/menor que, o rango de fechas             | [#22](#22-filtrar-con-operadores-de-comparación-morethan-lessthan-between)                    |
| Filtrar por una lista de ids (`In`)                        | [#23](#23-filtrar-por-una-lista-de-ids-in)                                                    |
| Buscar texto ignorando mayúsculas/minúsculas (`ILike`)     | [#28](#28-buscar-por-texto-parcial-ignorando-mayúsculas-y-minúsculas-ilike)                   |
| Filtrar por mayor o igual que (`MoreThanOrEqual`)          | [#29](#29-filtrar-por-valores-mayores-o-iguales-morethanorequal)                              |
| Filtrar por menor o igual que (`LessThanOrEqual`)          | [#30](#30-filtrar-por-valores-menores-o-iguales-lessthanorequal)                              |
| Buscar valores NULL (`IsNull`)                             | [#31](#31-buscar-registros-donde-un-campo-sea-null-isnull)                                    |
| Negar una condición (`Not`)                                | [#32](#32-negar-una-condición-not)                                                            |
| Buscar texto que EMPIECE con algo (`StartsWith`)           | [#34](#34-buscar-registros-cuyo-campo-empiece-con-un-texto-startswith)                        |
| Buscar por id de una relación `ManyToOne`                  | [#35](#35-buscar-por-id-de-una-relación-manytoone-variante-rápida-del-bloque-8)               |
| Buscar por id de una relación `ManyToMany`                 | [#36](#36-buscar-por-id-de-una-relación-manytomany-con-querybuilder)                          |
| Combinar varios filtros opcionales en un solo endpoint     | [#37](#37-combinar-varios-filtros-opcionales-en-un-solo-endpoint)                             |
| Ordenar dinámicamente por query param                      | [#38](#38-ordenar-resultados-dinámicamente-orderby-desde-query-params)                        |
| Buscar con OR entre varios campos                          | [#39](#39-buscar-con-or-entre-varios-campos)                                                  |
| Listar por relación + estado (varios endpoints, un método) | [#71](#71-listar-los-de-un-registro-filtrando-por-estado-ej-reservas-activas--canceladas)     |
| Filtros opcionales + buscador OR en el mismo endpoint      | [#73](#73-filtros-opcionales-and--buscador-en-varios-campos-or-en-el-mismo-endpoint)          |
| Ordenar la lista de la relación que traés                  | [#77](#77-ordenar-la-lista-de-la-relación-que-traés-order-anidado)                            |
| Filtrar entre dos fechas del query, validadas              | [#88](#88-filtrar-entre-dos-fechas-recibidas-por-query-validadas-y-con-el-día-final-incluido) |

### 📊 D. Consultas avanzadas, conteos y paginación

| El problema pide...                                       | Bloque                                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Contar todos                                              | [#15](#15-contar-todos-los-registros)                                                              |
| Traer los últimos N                                       | [#18](#18-traer-los-n-más-recientes)                                                               |
| Paginación                                                | [#19](#19-paginar-resultados-con-total)                                                            |
| Consulta compleja / agregaciones (QueryBuilder)           | [#24](#24-consulta-con-querybuilder-cuando-find-no-alcanza)                                        |
| Varias operaciones que deben ocurrir juntas (transacción) | [#25](#25-transacción-varias-operaciones-que-deben-ir-juntas-ej-descontar-cupos--crear-la-reserva) |
| Campo calculado en la respuesta (cupos reservados, OWNER) | [#100](#100-campo-calculado-en-la-respuesta-map-cupos-reservados-etiqueta-owner)                   |

### 🔄 E. Cambios de estado puntuales

| El problema pide...                                                     | Bloque                                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Activar/desactivar un campo booleano (toggle)                           | [#42](#42-activardesactivar-un-campo-booleano-toggle-sin-tocar-el-resto)        |
| Soft delete (no borrar físicamente)                                     | [#65](#65-soft-delete-no-borrar-físicamente-solo-marcar)                        |
| Solo uno marcado a la vez (principal / predeterminado)                  | [#69](#69-solo-uno-marcado-a-la-vez-principal--predeterminado--activo)          |
| Cambiar un estado `enum` con transición validada                        | [#70](#70-cambiar-el-estado-confirmar-instalar-validando-el-estado-actual-enum) |
| Desactivar de una sola vía (no toggle) si no tiene dependientes activos | [#83](#83-desactivar-evento-solo-si-no-tiene-reservas-activas-sin-toggle)       |
| Dar / quitar con el mismo endpoint (like, guardar)                      | [#95](#95-dar--quitar-con-el-mismo-endpoint-toggle-de-relación-like-guardar)    |

### ⚠️ F. Validación de entrada, errores y respuestas HTTP

| El problema pide...                                                 | Bloque                                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Que los errores devuelvan el código HTTP correcto                   | [#26](#26-lanzar-errores-con-excepciones-de-nest-404-409-400-en-vez-de-throw-new-error)          |
| Validar el formato de los datos que llegan (DTO)                    | [#27](#27-validaciones-en-el-dto-con-class-validator)                                            |
| Manejar excepciones HTTP estándar (tabla de códigos)                | [#33](#33-excepciones-http-estándar-en-nestjs)                                                   |
| Forzar el código HTTP de respuesta (`@HttpCode`)                    | [#43](#43-httpcode-explícito-en-cada-endpoint)                                                   |
| Controller defensivo con try/catch (combinable con 43)              | [#44](#44-controller-con-trycatch-para-nunca-responder-un-500-sin-mensaje)                       |
| Pipe personalizado para validar id positivo                         | [#45](#45-pipe-personalizado-positiveintpipe-en-vez-de-parseintpipe)                             |
| Excepción personalizada con el formato del proyecto                 | [#54](#54-excepción-personalizada-siguiendo-el-estilo-del-proyecto-no-notfoundexception-a-secas) |
| Validar ids UUID en la ruta (`ParseUUIDPipe`)                       | [#76](#76-ids-tipo-uuid-en-la-ruta-parseuuidpipe)                                                |
| Responder con un mensaje breve sin exponer datos sensibles          | [#90](#90-responder-con-un-mensaje-breve--message-data--sin-exponer-datos-sensibles)             |
| Pipes integrados: valor por defecto, enum, booleano, decimal, lista | [#104](#104-pipes-integrados-de-nest-para-params-y-query-valor-por-defecto-enum-booleano-lista)  |

### 🔐 G. Autenticación y guards base

| El problema pide...                                               | Bloque                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Hashear contraseña antes de guardar (`bcrypt`)                    | [#46](#46-hashear-la-contraseña-antes-de-guardar-típico-en-authuser)         |
| Proteger endpoint con JWT + permisos (`@Permissions`)             | [#48](#48-proteger-un-endpoint-con-autenticación-jwt--autorización-permisos) |
| Leer el usuario autenticado (`AuthenticatedRequest` / `req.user`) | [#49](#49-tipar-y-usar-el-usuario-autenticado-authenticatedrequest)          |
| Prefijo de ruta obligatorio por controlador                       | [#56](#56-prefijo-de-ruta-obligatorio-por-controlador-api-test)              |
| Decorador `@CurrentUser()` para no repetir `@Req()`               | [#57](#57-currentuser--decorador-propio-en-vez-de-tipar-req-a-mano)          |
| Decorador `@Public()` para excluir un endpoint de un guard global | [#58](#58-public--excluir-un-endpoint-de-un-guard-global)                    |
| Guards una sola vez sobre la clase + `@Permissions` por método    | [#101](#101-guards-una-vez-sobre-la-clase--permissions-en-cada-método)       |

### 🛂 H. Autorización avanzada (permisos, roles, ownership)

| El problema pide...                                           | Bloque                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Proteger una ruta según el rol del usuario (Guard + `@Roles`) | [#47](#47-guard--decorador-roles-para-proteger-rutas-según-el-rol-del-usuario)       |
| Autorización mixta: ADMIN o dueño del recurso                 | [#55](#55-ver-un-registro-solo-si-es-admin-o-el-dueño-403-si-no)                     |
| Guard de permisos con lógica OR (al menos uno)                | [#61](#61-guard-de-permisos-con-lógica-or-variante-del-permissionsguard-que-usa-and) |
| Guard de "solo dueño" sin pasar por permisos                  | [#62](#62-guard-de-solo-dueño-sin-pasar-por-permisos-ownership-puro)                 |
| Buscar + validar dueño (o admin) en un método reutilizable    | [#91](#91-validar-dueño-o-admin-en-un-método-reutilizable-findownedorfail)           |

### 📏 I. Reglas de negocio (fechas, cupos, límites)

| El problema pide...                                           | Bloque                                                                                              |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Validar que una fecha sea futura                              | [#50](#50-crear-con-fecha-futura-e-inicializar-availablespots-con-capacity)                         |
| Validar que algo ocurra dentro de una ventana de N días       | [#51](#51-validar-que-el-evento-no-haya-ocurrido-y-sea-dentro-de-los-próximos-n-días)               |
| Descontar/reponer cupos con validación de capacidad           | [#52](#52-descontar-cupos-al-reservar-y-devolverlos-al-cancelar-no-exceder-availablespots)          |
| Limitar cantidad de recursos activos por usuario              | [#53](#53-límite-por-usuario-contando-reservas-activas-si-cada-reserva-es-de-1-cupo)                |
| Validador personalizado `@IsFutureDate`                       | [#63](#63-validador-personalizado-reutilizable-isfuturedate)                                        |
| Validador personalizado `@Match` (confirmar contraseña)       | [#64](#64-validador-match-confirmar-contraseña)                                                     |
| Regla que depende de DOS campos (create y update)             | [#72](#72-regla-que-depende-de-dos-campos-ej-tracción-solo-para-carros-en-create-y-update)          |
| Update con capacidad ≥ reservados (recalcular cupos)          | [#82](#82-actualizar-evento-fecha-futura-si-se-modifica--capacidad-no-menor-a-los-cupos-reservados) |
| Límite por usuario SUMANDO cantidades (no contando filas)     | [#84](#84-límite-por-usuario-sumando-cupos-activos-ej-máximo-5-cupos-por-evento)                    |
| Update que cambia una cantidad (ajustar cupos por diferencia) | [#87](#87-actualizar-reserva-cambiar-la-cantidad-ajustando-los-cupos-del-evento)                    |

### 👤 J. Flujos de usuario y cuenta

| El problema pide...                             | Bloque                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| Registro público de usuario con rol por defecto | [#59](#59-registro-público-de-usuario-rol-por-defecto)                   |
| Cambiar contraseña validando la actual          | [#60](#60-cambiar-contraseña-validar-la-actual-antes-de-setear-la-nueva) |
| Auditoría: guardar quién creó un registro       | [#66](#66-auditoría-automática-guardar-quién-creó-un-registro)           |

### 🧩 K. Módulos, entities y trampas de TypeORM

| El problema pide...                                                     | Bloque                                                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Usar el service de otro módulo (`exports` / `imports`)                  | [#79](#79-usar-el-service-de-otro-módulo-exports--imports)                               |
| La FK no se guarda al crear (columna FK + relación con el mismo nombre) | [#80](#80-trampa-columna-fk--relación-con-el-mismo-nombre-insert-false-rompe-los-insert) |
| Ids `bigint` / columnas `numeric` que llegan como `string`              | [#81](#81-trampa-ids-bigint-y-columnas-numeric-que-llegan-como-string)                   |
| Comparar fechas (`date` string vs `timestamp` Date)                     | [#92](#92-trampa-fechas-date-llega-como-string-timestamp-como-date)                      |
| 403 o 500 en todo lo protegido (`JwtStrategy` sin relaciones)           | [#102](#102-trampa-el-jwtstrategy-no-carga-los-permisos-del-usuario-403-o-500-en-todo)   |
| 401 en todo lo protegido (clave del token vs Postman)                   | [#103](#103-trampa-la-clave-del-token-del-login-no-coincide-con-postman-401-en-todo)     |

### 🧪 L. Recetas armadas (flujos completos, ya combinados)

| El problema pide...                                                                       | Bloque                                                                                               |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Crear una reserva con todas sus reglas (existe, activo, fechas, cupos, límite, descontar) | [#85](#85-crear-reserva-completa-evento-existe-activo-no-ocurrió-cupos-límite-y-descontar)           |
| Cancelar una reserva con todas sus reglas (dueño, estado, fecha, liberar cupos)           | [#86](#86-cancelar-reserva-completa-dueño-no-cancelada-evento-no-ocurrido-liberar-cupos-y-cancelled) |
| Comprar el carrito (pedido + items + vaciar carrito)                                      | [#97](#97-receta-armada-comprar-el-carrito-pedido--items-en-una-transacción)                         |

### 🔬 M. Testing

| El problema pide...                                                 | Bloque                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Test unitario de un service (repositorio mockeado) y del controller | [#105](#105-test-unitario-de-un-service-con-el-repositorio-mockeado) |
