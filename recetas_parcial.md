# Recetas de parcial — endpoints ya armados (NestJS + TypeORM)

> **Para qué es este archivo:** `metodos_nestjs.md` es el catálogo de
> PIEZAS (un `if`, un filtro, un decorador). Este archivo es el MOLDE:
> endpoints completos, ya combinados y en el orden correcto, listos para
> copiar y renombrar. En el parcial abrí este primero; andá al otro solo
> cuando necesites una pieza puntual.

## 🧭 Cómo usarlo (3 pasos)

1. **Leé el enunciado endpoint por endpoint** y buscá cada uno en el
   [índice](#-índice-si-el-enunciado-dice--usá) por la frase que más se
   parece.
2. **Copiá la receta** y renombrá con el [diccionario](#-diccionario-de-nombres)
   (`Resource` → tu entidad principal, `Booking` → la que la consume).
3. **Aplicá las variantes:** borrá las reglas que tu enunciado NO pide y
   agregá las que sí (cada receta trae su lista de "si piden X → hacé Y").

El orden de las validaciones dentro de cualquier método es SIEMPRE el
mismo: **buscar (404) → dueño (403) → estado (400/409) → reglas (400/409)
→ guardar (transacción si tocás 2 tablas) → responder**.

---

## 📖 Diccionario de nombres

**La idea:** las recetas no pueden usar "Event" o "Book" porque no se sabe
qué entidades te van a dar en el parcial. Por eso usan dos nombres
genéricos que vos cambiás por los tuyos:

- **`Resource`** = la entidad que **TIENE los cupos o el stock** (un evento con 50 cupos, un libro con 3 copias, un curso con 30 sillas).
- **`Booking`** = la entidad que **CREA el usuario y GASTA esos cupos** (una reserva, un préstamo, una inscripción).

Para saber cuál es cuál en tu parcial, preguntate:

1. _¿Cuál de mis entidades tiene la capacidad / el stock?_ → esa es tu `Resource`.
2. _¿Cuál crea el usuario y le descuenta cupos a la otra?_ → esa es tu `Booking`.

| Si tu parcial es de... | `Resource` es...               | `Booking` es...              |
| ---------------------- | ------------------------------ | ---------------------------- |
| Eventos                | `Event` (tiene `capacity`)     | `Reservation` (reserva)      |
| Biblioteca             | `Book` (tiene `totalCopies`)   | `Loan` (préstamo)            |
| Cursos                 | `Course` (tiene `maxStudents`) | `Enrollment` (inscripción)   |
| Vuelos                 | `Flight` (tiene `seats`)       | `Ticket` (pasaje)            |
| Restaurante            | `Table` (tiene `chairs`)       | `TableReservation` (reserva) |

Y los CAMPOS se emparejan igual, mirando las entities que te dieron:

| En las recetas                   | Qué es                                                        | Evento / Reserva   | Biblioteca        | Curso / Inscripción   |
| -------------------------------- | ------------------------------------------------------------- | ------------------ | ----------------- | --------------------- |
| `Resource`                       | La entidad principal, la que tiene los cupos o el stock       | `Event`            | `Book`            | `Course`              |
| `Booking`                        | Lo que un usuario crea sobre un `Resource` y le consume cupos | `Reservation`      | `Loan`            | `Enrollment`          |
| `User`                           | El usuario autenticado (sale del token, nunca del body)       | `User`             | `User`            | `User`                |
| `capacity`                       | Total de cupos del recurso                                    | `capacity`         | `totalCopies`     | `maxStudents`         |
| `availableSpots`                 | Cupos que quedan (lo calcula el service, NO viene en el body) | `availableSpots`   | `availableCopies` | `availableSeats`      |
| `date`                           | Fecha del recurso                                             | `date`             | —                 | `startDate`           |
| `isActive`                       | Si el recurso está activo                                     | `isActive`         | `isActive`        | `isOpen`              |
| `quantity`                       | Cupos que consume UN booking                                  | `quantity`         | `quantity`        | — (1 por inscripción) |
| `BookingStatus.Active/Cancelled` | Estado del booking                                            | `ACTIVE/CANCELLED` | `ACTIVE/RETURNED` | `ACTIVE/WITHDRAWN`    |

### Ejemplo: el mismo código antes y después de traducir

**Así está en la receta:**

```typescript
const resource = await manager.findOneBy(Resource, { id: createBookingDto.resourceId });
if (!resource) {
    throw new NotFoundException('Resource not found');
}
if (resource.availableSpots < createBookingDto.quantity) {
    throw new BadRequestException('Not enough available spots');
}
resource.availableSpots -= createBookingDto.quantity;
```

**Así queda para una biblioteca** (`Book` tiene `availableCopies`;
`Loan` tiene `quantity`):

```typescript
const book = await manager.findOneBy(Book, { id: createLoanDto.bookId });
if (!book) {
    throw new NotFoundException('Book not found');
}
if (book.availableCopies < createLoanDto.quantity) {
    throw new BadRequestException('Not enough available copies');
}
book.availableCopies -= createLoanDto.quantity;
```

La lógica es IDÉNTICA: solo cambiaron los nombres.

### Cómo reemplazar sin romper nada

Con "buscar y reemplazar" del editor, **respetando mayúsculas** y en este
orden (primero los nombres largos, para que no se pisen):

| #   | Buscar           | Reemplazar por (biblioteca)                                                  |
| --- | ---------------- | ---------------------------------------------------------------------------- |
| 1   | `BookingStatus`  | `LoanStatus`                                                                 |
| 2   | `Booking`        | `Loan`                                                                       |
| 3   | `booking`        | `loan` (cubre `bookings` → `loans` y `bookingRepository` → `loanRepository`) |
| 4   | `Resource`       | `Book`                                                                       |
| 5   | `resource`       | `book` (cubre `resourceId` → `bookId` y `resources` → `books`)               |
| 6   | `availableSpots` | `availableCopies`                                                            |
| 7   | `capacity`       | `totalCopies`                                                                |
| 8   | `Cancelled`      | `Returned` (si el estado se llama distinto)                                  |

Después revisá los mensajes en inglés (`'Resource not found'` →
`'Book not found'`) y los nombres de permisos (`'create_resources'` → los
del `insert.sql`).

> 💡 **Si tu entidad NO tiene un campo** que usa la receta (ej. la
> biblioteca no tiene `date`), borrá las líneas que lo usan: esa regla no
> aplica a tu parcial.

> En `metodos_nestjs.md` estos mismos roles se llaman `Example` /
> `RelatedExample`. Acá se usan nombres con significado para que se lean
> más fácil.

---

## 🔎 Índice: "si el enunciado dice…" → usá

| El enunciado dice...                                                                  | Receta                                                                                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "crear X"; "la fecha debe ser futura"; "inicializar availableSpots con capacity"      | [R1](#r1-crear-el-recurso)                                                                                         |
| "el usuario autenticado se inscribe / registra / comenta" (sin cupos); "solo una vez" | [R2](#r2-crear-algo-del-usuario-del-token-sin-cupos)                                                               |
| "obtener X" con paginación, filtros o buscador                                        | [R3](#r3-listar-con-paginación-filtros-y-buscador)                                                                 |
| "obtener mis X a través del token"                                                    | [R4](#r4-mis-bookings-del-token)                                                                                   |
| "obtener X por id" (cualquiera) / "solo ADMIN o propietario"                          | [Molde: `findOne`](#5-service-del-booking)                                                                         |
| "actualizar X"; "la fecha debe seguir siendo futura"; "capacidad ≥ reservados"        | [R5](#r5-actualizar-el-recurso)                                                                                    |
| "crear reserva": existe, activo, fechas, cupos, límite por usuario, descontar         | [V1 → bloque 85](#v1-crear-un-booking-que-consume-cupos)                                                           |
| "cancelar / devolver": pertenece al usuario, no cancelada, no ocurrió, liberar cupos  | [V2 → bloque 86](#v2-cancelar--devolver-un-booking)                                                                |
| "actualizar reserva" (cambia la cantidad)                                             | [V3 → bloque 87](#v3-actualizar-la-cantidad-de-un-booking)                                                         |
| "filtrar entre dos fechas"                                                            | [V4 → bloque 88](#v4-filtrar-entre-dos-fechas)                                                                     |
| "eliminar X"; "validar existencia"; "responder con el mensaje: ..."                   | [V5 → bloque 89](#v5-eliminar-con-mensaje)                                                                         |
| "desactivar / cancelar X solo si no tiene reservas activas"                           | [V6 → bloque 83](#v6-desactivar-el-recurso)                                                                        |
| "cambiar el estado de X a ..." (confirmar, completar, instalar)                       | [bloque 70](metodos_nestjs.md#70-cambiar-un-estado-enum-con-transición-validada-planned--installed)                |
| "solo uno puede ser principal / predeterminado a la vez"                              | [bloque 69](metodos_nestjs.md#69-solo-uno-marcado-a-la-vez-principal--predeterminado--activo)                      |
| "dar y quitar like" / "guardar y quitar de guardados"                                 | [bloque 95](metodos_nestjs.md#95-dar--quitar-con-el-mismo-endpoint-toggle-de-relación-like-guardar)                |
| "seguir / dejar de seguir a un usuario"                                               | [bloque 94](metodos_nestjs.md#94-dos-relaciones-a-la-misma-entidad-seguir-usuarios-no-a-sí-mismo-y-sin-duplicados) |
| "agregar al carrito (si ya está, se suma)"                                            | [bloque 96](metodos_nestjs.md#96-si-ya-existe-sumar-en-vez-de-duplicar-agregar-al-carrito)                         |
| "comprar / confirmar el carrito"                                                      | [bloque 97](metodos_nestjs.md#97-receta-armada-comprar-el-carrito-pedido--items-en-una-transacción)                |
| "responder a un comentario"                                                           | [bloque 98](metodos_nestjs.md#98-relación-con-la-misma-tabla-respuestas-a-comentarios-parent--replies)             |
| "notificar al dueño cuando..."                                                        | [bloque 99](metodos_nestjs.md#99-efecto-secundario-al-crear-un-registro-crear-otro-automáticamente-notificación)   |
| "asociar opcionalmente a..."                                                          | [bloque 93](metodos_nestjs.md#93-relación-opcional-nullable-asociar-reasignar-o-desasociar)                        |
| "mostrar cuántos cupos reservados" (dato calculado)                                   | [bloque 100](metodos_nestjs.md#100-campo-calculado-en-la-respuesta-map-cupos-reservados-etiqueta-owner)            |

---

## 🧱 Molde común (se escribe una sola vez)

Esto es lo que TODO parcial de este tipo necesita, ya armado. Las
recetas de abajo solo agregan o cambian métodos del service.

### 1. Entities de referencia

En el parcial te dan las entities: usá SUS nombres de campos. Estas son
solo para que el código de las recetas tenga sentido.

```typescript
// resource.entity.ts
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Booking } from './booking.entity';

@Entity('resources')
export class Resource {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 110 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'timestamp' })
    date: Date;

    @Column()
    capacity: number;

    @Column({ name: 'available_spots' })
    availableSpots: number;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @OneToMany(() => Booking, (booking) => booking.resource)
    bookings: Booking[];
}
```

```typescript
// booking.entity.ts
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { User } from '../../auth/entities/user.entity';
import { Resource } from './resource.entity';

export enum BookingStatus {
    Active = 'ACTIVE',
    Cancelled = 'CANCELLED',
}

@Entity('bookings')
export class Booking {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    quantity: number;

    @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.Active })
    status: BookingStatus;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Resource, (resource) => resource.bookings, { nullable: false })
    @JoinColumn({ name: 'resource_id' })
    resource: Resource;
}
```

### 2. DTOs

```typescript
// create-resource.dto.ts
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateResourceDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    @MaxLength(110, { message: 'El nombre debe tener menos de 111 caracteres' }) // "menos de 111" = máximo 110
    name: string;

    @IsOptional()
    @IsString({ message: 'La descripción debe ser texto' })
    description?: string;

    @IsDateString({}, { message: 'La fecha debe tener formato ISO (ej. 2026-10-05T20:00:00)' })
    date: string;

    @IsInt({ message: 'La capacidad debe ser un número entero' })
    @Min(1, { message: 'La capacidad mínima es 1' })
    capacity: number;

    // availableSpots NO va: lo calcula el service
}

// update-resource.dto.ts
import { PartialType } from '@nestjs/mapped-types';

export class UpdateResourceDto extends PartialType(CreateResourceDto) {}
```

```typescript
// create-booking.dto.ts
import { IsInt, IsPositive, Max, Min } from 'class-validator';

export class CreateBookingDto {
    @IsInt({ message: 'El id del recurso debe ser un número entero' })
    @IsPositive({ message: 'El id del recurso debe ser positivo' })
    resourceId: number;

    @IsInt({ message: 'La cantidad debe ser un número entero' })
    @Min(1, { message: 'Debe reservar al menos 1 cupo' })
    @Max(5, { message: 'No puede reservar más de 5 cupos' })
    quantity: number;

    // user y status NO van: salen del token y del service
}

// update-booking.dto.ts — el recurso de un booking no se cambia al editar
import { OmitType, PartialType } from '@nestjs/mapped-types';

export class UpdateBookingDto extends PartialType(OmitType(CreateBookingDto, ['resourceId'] as const)) {}
```

### 3. `AuthenticatedRequest` y módulos

```typescript
// authenticated-request.interface.ts
import { Request } from 'express';

import { User } from '../../auth/entities/user.entity';

export interface AuthenticatedRequest extends Request {
    user: User; // lo carga AuthGuard('jwt') con lo que devuelve JwtStrategy.validate()
}
```

> ⚠️ **Trampa de compilación:** con el `tsconfig` del curso
> (`isolatedModules` + `emitDecoratorMetadata`), si esta interfaz está en
> OTRO archivo y la usás en `@Req() req: AuthenticatedRequest`, el
> proyecto no compila (_error TS1272: A type referenced in a decorated
> signature must be imported with 'import type'_). Importala así:
>
> ```typescript
> import type { AuthenticatedRequest } from './authenticated-request.interface';
> ```
>
> (O declarala en el mismo archivo del controller, como en el bloque 49.)

```typescript
// resource.module.ts
@Module({
    imports: [TypeOrmModule.forFeature([Resource, Booking])], // Booking: para contar reservas del recurso
    controllers: [ResourceController],
    providers: [ResourceService],
    exports: [ResourceService],
})
export class ResourceModule {}

// booking.module.ts
@Module({
    imports: [TypeOrmModule.forFeature([Booking, Resource])], // Resource: se usa dentro de las transacciones
    controllers: [BookingController],
    providers: [BookingService],
})
export class BookingModule {}
```

### 4. Service del recurso

```typescript
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';

@Injectable()
export class ResourceService {
    constructor(
        @InjectRepository(Resource)
        private readonly resourceRepository: Repository<Resource>,
        @InjectRepository(Booking)
        private readonly bookingRepository: Repository<Booking>,
        private readonly dataSource: DataSource,
    ) {}

    // lo reutilizan update, deactivate y remove: si no existe, 404
    async findOne(id: number) {
        const resource = await this.resourceRepository.findOneBy({ id });
        if (!resource) {
            throw new NotFoundException(`Resource with id ${id} not found`);
        }
        return resource;
    }

    // create  → R1 · findAll → R3 · update → R5 · deactivate → V6 · remove → V5
}
```

### 5. Service del booking

```typescript
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, Repository } from 'typeorm';

@Injectable()
export class BookingService {
    constructor(
        @InjectRepository(Booking)
        private readonly bookingRepository: Repository<Booking>,
        private readonly dataSource: DataSource,
    ) {}

    // GET /bookings (normalmente con permiso de admin): nunca devuelvas el passwordHash
    findAll() {
        return this.bookingRepository.find({
            relations: { resource: true, user: true },
            select: {
                id: true,
                quantity: true,
                status: true,
                createdAt: true,
                resource: { id: true, name: true, date: true },
                user: { id: true, username: true },
            },
        });
    }

    // GET /bookings/:id → "solo ADMIN o propietario"
    findOne(id: number, currentUser: User) {
        return this.findOwnedOrFail(id, currentUser, true);
    }

    // buscar + 404 + dueño (o admin) + 403, en un solo lugar.
    // allowAdmin: true para VER; false para cancelar/editar ("debe pertenecer al usuario autenticado")
    // manager: pasalo cuando lo llames desde adentro de una transacción
    private async findOwnedOrFail(
        id: number,
        currentUser: User,
        allowAdmin: boolean,
        manager: EntityManager = this.bookingRepository.manager,
    ) {
        const booking = await manager.findOne(Booking, {
            where: { id },
            relations: { user: true, resource: true },
        });
        if (!booking) {
            throw new NotFoundException(`Booking with id ${id} not found`);
        }

        const isOwner = booking.user.id === currentUser.id;
        const isAdmin = allowAdmin && currentUser.role?.name === 'admin';
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException('You do not have access to this booking');
        }
        return booking;
    }

    // create → V1 · findMine → R4 · findBetweenDates → V4 · update → V3 · cancel → V2 · remove → V5
}
```

> ⚠️ `currentUser.role?.name` solo existe si el `JwtStrategy` carga el
> rol del usuario (ver [bloque 102](metodos_nestjs.md#102-trampa-el-jwtstrategy-no-carga-los-permisos-del-usuario-403-o-500-en-todo)). Mirá
> también cómo se llama el rol admin en el `insert.sql` (`'admin'`,
> `'ADMIN'`...).

### 6. Controllers completos (con el orden de rutas correcto)

```typescript
import {
    Body,
    Controller,
    DefaultValuePipe,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions/permissions.guard';

@Controller('api-test/resources') // prefijo que pida el enunciado
@UseGuards(AuthGuard('jwt'), PermissionsGuard) // una vez: protege TODOS los endpoints
export class ResourceController {
    constructor(private readonly resourceService: ResourceService) {}

    @Post()
    @Permissions('create_resources') // 👈 nombres EXACTOS del insert.sql
    create(@Body() createResourceDto: CreateResourceDto) {
        return this.resourceService.create(createResourceDto);
    }

    @Get()
    @Permissions('read_resources')
    findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('search') search?: string,
        @Query('isActive') isActive?: string,
    ) {
        return this.resourceService.findAll({
            page,
            limit,
            search,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
        });
    }

    @Get(':id')
    @Permissions('read_resources')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.resourceService.findOne(id);
    }

    @Patch(':id/deactivate') // rutas con acción: pueden ir antes o después de ':id' (tienen otro largo)
    @Permissions('update_resources')
    deactivate(@Param('id', ParseIntPipe) id: number) {
        return this.resourceService.deactivate(id);
    }

    @Patch(':id')
    @Permissions('update_resources')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateResourceDto: UpdateResourceDto) {
        return this.resourceService.update(id, updateResourceDto);
    }

    @Delete(':id')
    @Permissions('delete_resources')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.resourceService.remove(id);
    }
}
```

```typescript
import { Req } from '@nestjs/common'; // (además de los imports del controller de arriba)

import type { AuthenticatedRequest } from './authenticated-request.interface'; // 👈 "import type", si no, no compila

@Controller('api-test/bookings')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class BookingController {
    constructor(private readonly bookingService: BookingService) {}

    @Post()
    @Permissions('create_bookings')
    create(@Body() createBookingDto: CreateBookingDto, @Req() req: AuthenticatedRequest) {
        return this.bookingService.create(createBookingDto, req.user);
    }

    @Get()
    @Permissions('read_bookings')
    findAll() {
        return this.bookingService.findAll();
    }

    // ⚠️ rutas FIJAS antes de ':id' (si no, Nest toma "me" como si fuera un id)
    @Get('me') // o 'user', como diga el enunciado
    @Permissions('read_own_bookings')
    findMine(@Req() req: AuthenticatedRequest, @Query('status') status?: BookingStatus) {
        return this.bookingService.findMine(req.user, status);
    }

    @Get('between-dates')
    @Permissions('read_bookings')
    findBetweenDates(@Query('start') start: string, @Query('end') end: string) {
        return this.bookingService.findBetweenDates(start, end);
    }

    @Get(':id')
    @Permissions('read_bookings')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
        return this.bookingService.findOne(id, req.user);
    }

    @Patch(':id/cancel')
    @Permissions('cancel_bookings')
    cancel(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
        return this.bookingService.cancel(id, req.user);
    }

    @Patch(':id')
    @Permissions('update_bookings')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateBookingDto: UpdateBookingDto,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.bookingService.update(id, updateBookingDto, req.user);
    }

    @Delete(':id')
    @Permissions('delete_bookings')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.bookingService.remove(id);
    }
}
```

> Si un endpoint tiene que ser público (sin token), sacá el `@UseGuards`
> de la clase y ponelo método por método.

---

## 🍳 Recetas completas

### R1. Crear el recurso

**Frases que la activan:** _"crear X"_, _"la fecha debe ser futura"_,
_"inicializar availableSpots con capacity; la solicitud no debe incluir
availableSpots"_, _"no puede haber dos X con el mismo nombre"_.

```typescript
async create(createResourceDto: CreateResourceDto) {
    // regla: la fecha debe ser futura
    if (new Date(createResourceDto.date) <= new Date()) {
        throw new BadRequestException('The date must be in the future');
    }

    // regla (borrala si no la piden): nombre único
    const alreadyExists = await this.resourceRepository.existsBy({ name: createResourceDto.name });
    if (alreadyExists) {
        throw new ConflictException('A resource with that name already exists');
    }

    const newResource = this.resourceRepository.create({
        ...createResourceDto,
        date: new Date(createResourceDto.date),
        availableSpots: createResourceDto.capacity, // calculado: NO viene en el body
    });
    const savedResource = await this.resourceRepository.save(newResource);

    return { message: 'Resource created successfully', data: savedResource };
}
```

**Variantes:**

- _"debe realizarse dentro de los próximos N días"_ → después del `if` de fecha futura:
    ```typescript
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + N);
    if (new Date(createResourceDto.date) > limitDate) {
        throw new BadRequestException(`The date must be within the next ${N} days`);
    }
    ```
- _"pertenece a una categoría"_ → buscar la categoría (404 si no existe) antes de crear y agregar `category` en el `create({ ... })`.
- _"el creador es el usuario autenticado"_ → recibir `currentUser` desde el controller (`req.user`) y agregar `createdBy: currentUser`.
- _"nombre único sin importar mayúsculas"_ → `existsBy({ name: ILike(createResourceDto.name) })`.
- _"responder el recurso creado"_ (sin mensaje) → `return savedResource;`.

---

### R2. Crear algo del usuario del token (sin cupos)

**Frases que la activan:** _"el usuario autenticado puede inscribirse /
registrarse / calificar"_, _"un usuario no puede inscribirse dos veces"_,
_"el recurso debe estar activo"_.

```typescript
// BookingService — acá el Booking no consume cupos (ej. inscripción libre)
async createWithoutSpots(resourceId: number, currentUser: User) {
    const resource = await this.dataSource.getRepository(Resource).findOneBy({ id: resourceId });
    if (!resource) {
        throw new NotFoundException('Resource not found');
    }
    if (!resource.isActive) {
        throw new BadRequestException('The resource is not active');
    }

    // un usuario no puede tener dos activos sobre el mismo recurso
    const alreadyExists = await this.bookingRepository.findOne({
        where: {
            user: { id: currentUser.id },
            resource: { id: resource.id },
            status: BookingStatus.Active,
        },
    });
    if (alreadyExists) {
        throw new ConflictException('You are already registered in this resource');
    }

    const newBooking = this.bookingRepository.create({
        quantity: 1,
        status: BookingStatus.Active,
        resource,
        user: currentUser,
    });
    return await this.bookingRepository.save(newBooking);
}
```

**Variantes:**

- _"si tiene cupos"_ → no uses esta: usá [V1](#v1-crear-un-booking-que-consume-cupos).
- _"no puede inscribirse nunca dos veces"_ (ni aunque haya cancelado) → sacá `status` del `where`.
- _"solo si la fecha no pasó"_ → agregá `if (new Date(resource.date) <= new Date())` → 400, después del `if` de activo.

---

### R3. Listar con paginación, filtros y buscador

**Frases que la activan:** _"obtener X"_, _"paginado"_, _"filtrar por
activo / categoría"_, _"buscar por nombre o descripción"_.

```typescript
async findAll(filters: { page: number; limit: number; search?: string; isActive?: boolean }) {
    const where: any = {};

    // cada filtro se agrega SOLO si vino
    if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
    }

    const [items, total] = await this.resourceRepository.findAndCount({
        // con buscador: array de where = OR (cada rama repite los filtros)
        where: filters.search
            ? [
                  { ...where, name: ILike(`%${filters.search}%`) },
                  { ...where, description: ILike(`%${filters.search}%`) },
              ]
            : where,
        order: { date: 'ASC' },
        take: filters.limit,
        skip: (filters.page - 1) * filters.limit,
    });

    return { items, total, page: filters.page, limit: filters.limit };
}
```

El controller ya está en el [molde](#6-controllers-completos-con-el-orden-de-rutas-correcto).

**Variantes:**

- _"sin paginación"_ → `find({ where, order })` y sacá `page`/`limit` del controller.
- _"solo los que todavía no ocurrieron"_ → `where.date = MoreThan(new Date());` (importar `MoreThan`).
- _"filtrar por categoría"_ → `if (filters.categoryId) where.category = { id: filters.categoryId };`.
- _"ordenar por lo que elija el cliente"_ → `order: { [sortBy]: order }` con `@Query('sortBy')` y `@Query('order')`.
- _"mostrar cupos reservados"_ → al final, `items.map((resource) => ({ ...resource, reservedSpots: resource.capacity - resource.availableSpots }))`.

---

### R4. Mis bookings (del token)

**Frases que la activan:** _"obtener mis reservas a través del token
JWT"_, _"retorna únicamente las del usuario autenticado"_.

```typescript
async findMine(currentUser: User, status?: BookingStatus) {
    const where: any = { user: { id: currentUser.id } }; // el filtro sale del TOKEN, no de un parámetro

    if (status) {
        where.status = status;
    }

    return await this.bookingRepository.find({
        where,
        relations: { resource: true },
        order: { createdAt: 'DESC' },
    });
}
```

**Variantes:**

- _"solo las activas"_ → fijá `status: BookingStatus.Active` en el `where` y sacá el parámetro.
- _"mis reservas entre dos fechas"_ → combinalo con [V4](#v4-filtrar-entre-dos-fechas) agregando `user: { id: currentUser.id }` al `where`.

---

### R5. Actualizar el recurso

**Frases que la activan:** _"actualizar la información de X"_, _"si se
modifica la fecha, debe seguir siendo futura"_, _"si se modifica la
capacidad, no puede ser menor al número de cupos ya reservados"_.

```typescript
async update(id: number, updateResourceDto: UpdateResourceDto) {
    const resource = await this.findOne(id); // 404 si no existe

    // regla: fecha futura, SOLO si la fecha vino en el body
    if (updateResourceDto.date && new Date(updateResourceDto.date) <= new Date()) {
        throw new BadRequestException('The date must be in the future');
    }

    // regla (borrala si no la piden): nombre único, solo si cambió
    if (updateResourceDto.name && updateResourceDto.name !== resource.name) {
        const alreadyExists = await this.resourceRepository.existsBy({ name: updateResourceDto.name });
        if (alreadyExists) {
            throw new ConflictException('A resource with that name already exists');
        }
    }

    // regla: capacidad ≥ reservados, y se recalculan los disponibles
    if (updateResourceDto.capacity !== undefined) {
        const reservedSpots = resource.capacity - resource.availableSpots;
        if (updateResourceDto.capacity < reservedSpots) {
            throw new BadRequestException(`Capacity cannot be less than the ${reservedSpots} spots already reserved`);
        }
        resource.availableSpots = updateResourceDto.capacity - reservedSpots;
    }

    const updatedResource = await this.resourceRepository.save({
        ...resource,
        ...updateResourceDto,
        date: updateResourceDto.date ? new Date(updateResourceDto.date) : resource.date,
    });
    return { message: 'Resource updated successfully', data: updatedResource };
}
```

**Variantes:**

- _"no se puede editar un recurso inactivo"_ → después del `findOne`: `if (!resource.isActive)` → 400.
- _"no se puede editar si ya ocurrió"_ → `if (new Date(resource.date) <= new Date())` → 400.
- _"no se puede cambiar X"_ → sacalo del `UpdateResourceDto` con `OmitType` (ver el `UpdateBookingDto` del molde).

---

## 🔧 Variantes de las recetas que ya están armadas en `metodos_nestjs.md`

Estas recetas están completas en el otro archivo (no se copian acá para
no repetir). Abajo está **cómo adaptarlas** cuando tu enunciado pide algo
un poco distinto.

### V1. Crear un booking que consume cupos

📄 Código completo: [bloque 85](metodos_nestjs.md#85-receta-armada-crear-una-reserva-completa-orden-de-validaciones--transacción) (allá `Example`
= `Booking`, `RelatedExample` = `Resource`, `numericField` = `quantity`,
`booleanField` = `isActive`, `dateField` = `date`, `owner` = `user`).

- _"no hay ventana de días"_ → borrá el `limitDate` y el `if (eventDate > limitDate)`.
- _"cada reserva es de 1 cupo"_ (no hay `quantity`) → sacá `quantity` del DTO, descontá `1`, y el límite por usuario es contar filas: `const activeCount = await manager.count(Booking, { where: { user: { id: currentUser.id }, resource: { id: resource.id }, status: BookingStatus.Active } });`.
- _"el límite es de reservas, no de cupos"_ → igual que el punto anterior (`count` en vez de sumar `quantity`).
- _"no puede reservar dos veces el mismo recurso"_ → antes de guardar: `findOne` de un booking activo del usuario en ese recurso → 409.
- _"solo se puede reservar hasta X horas antes"_ → `if (eventDate.getTime() - Date.now() < X * 60 * 60 * 1000)` → 400.

### V2. Cancelar / devolver un booking

📄 Código completo: [bloque 86](metodos_nestjs.md#86-receta-armada-cancelar-una-reserva-completa-dueño--estado--fecha--liberar-cupos).

- _"el ADMIN también puede cancelar"_ → reemplazá el `findOne` + el `if` de dueño por `await this.findOwnedOrFail(id, currentUser, true, manager)` (del molde).
- _"devolver"_ (préstamo) → estado `RETURNED` en vez de `CANCELLED`, y el mensaje que pida el enunciado (ej. _"Loan returned..."_).
- _"no se puede cancelar con menos de 24 h de anticipación"_ → `if (new Date(booking.resource.date).getTime() - Date.now() < 24 * 60 * 60 * 1000)` → 400.
- _"en vez de estado hay un booleano `isActive`"_ → `if (!booking.isActive)` → 409 y `booking.isActive = false`.

### V3. Actualizar la cantidad de un booking

📄 Código completo: [bloque 87](metodos_nestjs.md#87-actualizar-la-cantidad-de-una-reserva-ajustar-cupos-por-la-diferencia).

- _"no se puede modificar si el evento ya ocurrió"_ → después del `if` de cancelada: `if (new Date(booking.resource.date) <= new Date())` → 400.
- _"el ADMIN también puede editar"_ → `findOwnedOrFail(id, currentUser, true, manager)` en vez del `findOne` + `if` de dueño.

### V4. Filtrar entre dos fechas

📄 Código completo: [bloque 88](metodos_nestjs.md#88-filtrar-entre-dos-fechas-recibidas-por-query-validadas-y-con-el-día-final-incluido).

- _"por la fecha en que se hizo la reserva"_ → `where: { createdAt: Between(startDate, endDate) }`.
- _"por la fecha del evento"_ → `where: { resource: { date: Between(startDate, endDate) } }`.
- _"solo las mías"_ → agregá `user: { id: currentUser.id }` al `where` y pasá `req.user` desde el controller.

### V5. Eliminar con mensaje

📄 Código completo: [bloque 89](metodos_nestjs.md#89-eliminar-validando-existencia-y-respondiendo-un-mensaje-propio) (tiene las dos
versiones: recurso y booking).

- _"al eliminar el recurso se eliminan sus reservas"_ → en vez del `if` que cuenta reservas (409), poné `onDelete: 'CASCADE'` en el `@ManyToOne` de `Booking.resource` ([bloque 78](metodos_nestjs.md#78-borrado-en-cascada-desde-la-entity-ondelete-cascade)).
- _"no se borra de verdad, se marca como eliminado"_ → `softDelete` ([bloque 65](metodos_nestjs.md#65-soft-delete-no-borrar-físicamente-solo-marcar)).
- _"responder 204 sin body"_ → no devuelvas nada y agregá `@HttpCode(HttpStatus.NO_CONTENT)` en el controller.

### V6. Desactivar el recurso

📄 Código completo: [bloque 83](metodos_nestjs.md#83-desactivar-de-una-sola-vía-sin-toggle-validando-que-no-tenga-dependientes-activos).

- _"también se puede reactivar"_ → otro endpoint `PATCH /:id/activate` igual pero al revés (409 si ya estaba activo, sin contar reservas).
- _"al desactivar se cancelan sus reservas activas"_ → en vez del 409, dentro de una transacción cancelá las activas y liberá sus cupos:
    ```typescript
    async deactivate(id: number) {
        return await this.dataSource.transaction(async (manager) => {
            const resource = await manager.findOneBy(Resource, { id });
            if (!resource) {
                throw new NotFoundException(`Resource with id ${id} not found`);
            }
            if (!resource.isActive) {
                throw new ConflictException('This resource is already inactive');
            }

            const activeBookings = await manager.find(Booking, {
                where: { resource: { id }, status: BookingStatus.Active },
            });
            activeBookings.forEach((booking) => (booking.status = BookingStatus.Cancelled));
            await manager.save(activeBookings);

            resource.availableSpots = resource.capacity; // se liberan todos los cupos
            resource.isActive = false;
            await manager.save(resource);

            return { message: 'Resource deactivated', cancelledBookings: activeBookings.length };
        });
    }
    ```

---

## ✅ Antes de entregar

Usá el checklist de la guía 🧭 de `metodos_nestjs.md`. Lo mínimo:

- [ ] Prefijo (`api-test`) en TODOS los controllers y guards + `@Permissions` con los nombres del `insert.sql`.
- [ ] Rutas fijas (`me`, `user`, `between-dates`) ANTES de `@Get(':id')`.
- [ ] Mensajes literales del enunciado copiados EXACTOS.
- [ ] Ningún 500: todo `if` lanza una excepción de Nest y lo que toca 2 tablas va en transacción.
- [ ] Si todo da 401/403: [bloque 103](metodos_nestjs.md#103-trampa-la-clave-del-token-del-login-no-coincide-con-postman-401-en-todo) (clave del token) y [bloque 102](metodos_nestjs.md#102-trampa-el-jwtstrategy-no-carga-los-permisos-del-usuario-403-o-500-en-todo) (relaciones del `JwtStrategy`).
