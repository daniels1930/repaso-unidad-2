# Pre-parcial resuelto + variantes (abrí esto primero)

> El código de cada sección es **el pre-parcial Eventos / Reservas resuelto y probado**.
> Debajo de cada uno: **variantes con el nombre de la frase del parcial** y el
> **código completo** (clic en ▶ para abrirlo). Las líneas que cambian dicen `// 🔄 CAMBIO`.
> Si no está aquí → `ruta_parcial.md` (buscador) → `metodos_nestjs.md`.

## Traducción de nombres

Si el parcial es de otro tema, cambiá solo los nombres; la lógica es la misma.

| Pre-parcial                         | Puede llamarse…                                     |
| ----------------------------------- | --------------------------------------------------- |
| `Event` (el padre, tiene cupos)     | `Course`, `Product`, `Flight`, `Room`, `Book`       |
| `Reservation` (el hijo, gasta cupo) | `Enrollment`, `Order`, `Ticket`, `Booking`, `Loan`  |
| `availableSpots` / `capacity`       | `stock`, `seats`, `availableCopies` / `maxStudents` |
| `quantity`                          | `amount`, `seats`, `units`                          |
| `ReservationStatus.ACTIVE`          | `CONFIRMED`, `PENDING`, `BORROWED`                  |
| `isActive`                          | `isAvailable`, `isPublished`, `isOpen`              |
| `user` (dueño)                      | `owner`, `student`, `customer`, `createdBy`         |

## Índice

1. [Guards y permisos](#1-guards-y-permisos)
2. [Usuario del token (`req.user`)](#2-usuario-del-token-requser)
3. [Crear evento](#3-crear-evento)
4. [Actualizar evento](#4-actualizar-evento)
5. [Desactivar evento](#5-desactivar-evento)
6. [Eliminar evento](#6-eliminar-evento)
7. [Crear reserva](#7-crear-reserva)
8. [Cancelar reserva](#8-cancelar-reserva)
9. [Mis reservas (`GET /user`)](#9-mis-reservas-get-user)
10. [Ver una (ADMIN o dueño)](#10-ver-una-admin-o-dueño)
11. [Actualizar reserva](#11-actualizar-reserva)
12. [Eliminar reserva + tabla de errores](#12-eliminar-reserva--tabla-de-errores)
13. [❌ Errores que ya cometí (no repetir)](#-errores-que-ya-cometí-no-repetir)

---

## 1. Guards y permisos

**📌 Pre-parcial:** _"limitados según los permisos del usuario… `@UseGuards(AuthGuard('jwt'), PermissionsGuard)`"_

**Controller:**

```typescript
@Controller('reservations')
@UseGuards(AuthGuard('jwt'), PermissionsGuard) // protege TODOS los métodos
export class ReservationController {
    constructor(private readonly reservationService: ReservationService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard('jwt'), PermissionsGuard) // repetido: no falla, por si se te olvida en la clase
    @Permissions('read_reservations') // nombre EXACTO del seed (singular/plural importa)
    findAll() {
        return this.reservationService.findAll();
    }
}
```

- `@Permissions(...)` en **cada** método. Sin él → cualquiera con token entra.
- 🧪 Sin token → **401** · Ana en algo de admin → **403**.

### 🔄 Si el parcial lo cambia

| #   | Si el parcial dice…                                      | Qué cambia                                                           |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| 1.1 | «este endpoint es público» / «no requiere autenticación» | Guards en cada método (no en la clase); al público no le pongas nada |
| 1.2 | «requiere los permisos X y Y»                            | Varios nombres en `@Permissions` (tu guard exige TODOS)              |
| 1.3 | «con cualquiera de los permisos X o Y»                   | Guard nuevo igual al tuyo pero con `some` en vez de `every`          |
| 1.4 | «solo el rol ADMIN puede…» (roles, no permisos)          | Decorador `@Roles` + `RolesGuard` que compara `user.role.name`       |
| 1.5 | «solo usuarios autenticados» (cualquier rol)             | Quitá el `@Permissions` (tu guard deja pasar si no hay)              |

<details>
<summary><b>1.1 «este endpoint es público» / «no requiere autenticación»</b></summary>

**Controller:**

```typescript
@Controller('events')
// 🔄 CAMBIO: SIN @UseGuards en la clase (si no, protege también al público)
export class EventController {
    constructor(private readonly eventService: EventService) {}

    // 🔄 CAMBIO: público → sin guards ni @Permissions
    @Get()
    @HttpCode(HttpStatus.OK)
    findAll() {
        return this.eventService.findAll();
    }

    // los demás: guards en CADA método
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('create_event')
    create(@Body() createEventDto: CreateEventDto) {
        return this.eventService.create(createEventDto);
    }
}
```

</details>

<details>
<summary><b>1.2 «requiere los permisos X y Y»</b></summary>

**Controller:**

```typescript
@Patch(':id/deactivate')
@HttpCode(HttpStatus.OK)
@Permissions('update_event', 'deactivate_event') // 🔄 CAMBIO: necesita LOS DOS (AND)
deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.deactivate(id);
}
```

</details>

<details>
<summary><b>1.3 «con cualquiera de los permisos X o Y»</b></summary>

**Guard (`permissions-any.guard.ts`):**

```typescript
@Injectable()
export class PermissionsAnyGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, context.getHandler());
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }
        const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
        if (!user) {
            throw new UnauthorizedException('Usuario no autenticado en la solicitud');
        }
        const userPermissions = user.role?.rolePermissions?.map((rp) => rp.permission.name) ?? [];
        // 🔄 CAMBIO: some = con UNO alcanza (every = todos)
        const hasAny = requiredPermissions.some((permission) => userPermissions.includes(permission));
        if (!hasAny) {
            throw new ForbiddenException('Acceso denegado: No cuentas con los permisos suficientes para esta acción');
        }
        return true;
    }
}
```

**Controller:**

```typescript
@Get()
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), PermissionsAnyGuard) // 🔄 CAMBIO: el guard OR
@Permissions('read_reservations', 'read_own_reservations') // con UNO alcanza
findAll() {
    return this.reservationService.findAll();
}
```

</details>

<details>
<summary><b>1.4 «solo el rol ADMIN puede…» (roles, no permisos)</b></summary>

**Decorador y guard (`roles.decorator.ts`, `roles.guard.ts`):**

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }
        const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
        // 🔄 CAMBIO: compara el NOMBRE del rol (no permisos)
        if (!user || !requiredRoles.includes(user.role.name)) {
            throw new ForbiddenException('Solo el administrador puede hacer esto');
        }
        return true;
    }
}
```

**Controller:**

```typescript
@Delete(':id')
@HttpCode(HttpStatus.OK)
@UseGuards(AuthGuard('jwt'), RolesGuard) // 🔄 CAMBIO: RolesGuard
@Roles('admin') // nombre del rol en el seed
remove(@Param('id', ParseIntPipe) id: number) {
    return this.reservationService.remove(id);
}
```

</details>

<details>
<summary><b>1.5 «solo usuarios autenticados» (cualquier rol)</b></summary>

**Controller:**

```typescript
@Get()
@HttpCode(HttpStatus.OK)
// 🔄 CAMBIO: sin @Permissions → entra cualquiera CON token (los guards de la clase piden el token)
findAll() {
    return this.eventService.findAll();
}
```

</details>

---

## 2. Usuario del token (`req.user`)

**📌 Pre-parcial:** _"`req.user` es inyectado por `AuthGuard('jwt')`"_

```typescript
interface AuthenticatedRequest extends Request {
    user?: User; // así la da el profe
}

@Post()
@Permissions('create_reservation')
create(@Body() createReservationDto: CreateReservationDto, @Req() req: AuthenticatedRequest) {
    return this.reservationService.create(createReservationDto, req.user!); // ! porque user?
}
```

**¿Cuándo va `req.user`?** Solo si la regla depende de **quién** pregunta:

| Frase                                       | Endpoints del pre-parcial               |
| ------------------------------------------- | --------------------------------------- |
| "a nombre del usuario" / "el creador es…"   | `POST /reservations`                    |
| "mis…" / "solo las del usuario autenticado" | `GET /reservations/user`                |
| "ADMIN o propietario" / "debe pertenecer…"  | `GET /:id`, `PATCH /:id`, `/:id/cancel` |

- Interfaz en otro archivo → `import type { AuthenticatedRequest } from ...` (TS1272).
- Todas las variantes por método HTTP → bloque **49.4** de `metodos_nestjs.md`.

---

## 3. Crear evento

**📌 Pre-parcial:** _"La fecha del evento debe ser futura" + "Inicializar `availableSpots` con el valor de `capacity`"_

**Service:**

```typescript
async create(createEventDto: CreateEventDto): Promise<Event> {
    // "fecha futura" → 400
    if (new Date(createEventDto.date) <= new Date()) {
        throw new BadRequestException('La fecha debe ser futura');
    }
    const newEvent = this.eventRepository.create({
        ...createEventDto, // copia todo el body
        availableSpots: createEventDto.capacity, // no viene en el body
    });
    return await this.eventRepository.save(newEvent);
}
```

- 🧪 Admin con fecha pasada → **400** · Ana crea → **403**.

### 🔄 Si el parcial lo cambia

| #   | Si el parcial dice…                                  | Qué cambia                                                                 |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| 3.1 | «con al menos 3 días de anticipación»                | Fecha mínima = hoy + N días                                                |
| 3.2 | «la fecha debe estar dentro de los próximos 30 días» | Futura + fecha máxima = hoy + N días                                       |
| 3.3 | «no pueden existir dos eventos con el mismo nombre»  | `existsBy({ name })` antes de crear → 409                                  |
| 3.4 | «el evento queda a nombre del usuario que lo crea»   | Relación `createdBy` en la entity + `req.user!` + `createdBy: currentUser` |

<details>
<summary><b>3.1 «con al menos 3 días de anticipación»</b></summary>

**Service:**

```typescript
async create(createEventDto: CreateEventDto): Promise<Event> {
    // 🔄 CAMBIO: "al menos 3 días de anticipación" → mínimo = hoy + 3
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    if (new Date(createEventDto.date) < minDate) {
        throw new BadRequestException('El evento debe crearse con al menos 3 días de anticipación');
    }
    const newEvent = this.eventRepository.create({
        ...createEventDto, // copia todo el body
        availableSpots: createEventDto.capacity, // no viene en el body
    });
    return await this.eventRepository.save(newEvent);
}
```

</details>

<details>
<summary><b>3.2 «la fecha debe estar dentro de los próximos 30 días»</b></summary>

**Service:**

```typescript
async create(createEventDto: CreateEventDto): Promise<Event> {
    const date = new Date(createEventDto.date);
    if (date <= new Date()) {
        throw new BadRequestException('La fecha debe ser futura');
    }
    // 🔄 CAMBIO: "dentro de los próximos 30 días" → máximo = hoy + 30
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    if (date > maxDate) {
        throw new BadRequestException('La fecha debe estar dentro de los próximos 30 días');
    }
    const newEvent = this.eventRepository.create({
        ...createEventDto, // copia todo el body
        availableSpots: createEventDto.capacity, // no viene en el body
    });
    return await this.eventRepository.save(newEvent);
}
```

</details>

<details>
<summary><b>3.3 «no pueden existir dos eventos con el mismo nombre»</b></summary>

**Service:**

```typescript
async create(createEventDto: CreateEventDto): Promise<Event> {
    if (new Date(createEventDto.date) <= new Date()) {
        throw new BadRequestException('La fecha debe ser futura');
    }
    // 🔄 CAMBIO: "nombre único" → si ya existe, 409
    const exists = await this.eventRepository.existsBy({ name: createEventDto.name });
    if (exists) {
        throw new ConflictException('Ya existe un evento con ese nombre');
    }
    const newEvent = this.eventRepository.create({
        ...createEventDto, // copia todo el body
        availableSpots: createEventDto.capacity, // no viene en el body
    });
    return await this.eventRepository.save(newEvent);
}
```

</details>

<details>
<summary><b>3.4 «el evento queda a nombre del usuario que lo crea»</b></summary>

**Entity (`event.entity.ts`) — agregar:**

```typescript
// 🔄 CAMBIO: relación al creador (synchronize: true crea la columna sola)
@ManyToOne(() => User, { nullable: false })
@JoinColumn({ name: 'created_by' })
createdBy: User;
```

**Controller:**

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@Permissions('create_event')
create(@Body() createEventDto: CreateEventDto, @Req() req: AuthenticatedRequest) {
    return this.eventService.create(createEventDto, req.user!); // 🔄 CAMBIO: pasa el usuario
}
```

**Service:**

```typescript
async create(createEventDto: CreateEventDto, currentUser: User): Promise<Event> {
    if (new Date(createEventDto.date) <= new Date()) {
        throw new BadRequestException('La fecha debe ser futura');
    }
    const newEvent = this.eventRepository.create({
        ...createEventDto,
        availableSpots: createEventDto.capacity,
        createdBy: currentUser, // 🔄 CAMBIO: el creador sale del token
    });
    return await this.eventRepository.save(newEvent);
}
```

</details>

---

## 4. Actualizar evento

**📌 Pre-parcial:** _"Si se modifica la fecha, debe seguir siendo futura" + "Si se modifica la capacidad, no puede ser menor al número de cupos ya reservados"_

**Service:**

```typescript
async update(id: number, updateEventDto: UpdateEventDto) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException('Evento no encontrado');
    }
    // "si se modifica la fecha" → && = solo si vino
    if (updateEventDto.date && new Date(updateEventDto.date) <= new Date()) {
        throw new BadRequestException('La fecha debe ser futura');
    }
    // cupos ya reservados = capacidad actual - disponibles
    const reservedSpots = event.capacity - event.availableSpots;
    if (updateEventDto.capacity !== undefined) {
        if (updateEventDto.capacity < reservedSpots) {
            throw new BadRequestException(
                `La capacidad no puede ser inferior a los ${reservedSpots} lugares ya reservados`,
            );
        }
        // se recalculan los disponibles con la nueva capacidad
        event.availableSpots = updateEventDto.capacity - reservedSpots;
    }
    return await this.eventRepository.save({ ...event, ...updateEventDto }); // viejo + nuevo
}
```

### 🔄 Si el parcial lo cambia

| #   | Si el parcial dice…                                        | Qué cambia                                                     |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| 4.1 | «no se puede modificar un evento inactivo»                 | Después del 404: `if (!event.isActive)` → 400                  |
| 4.2 | «no se puede modificar un evento que ya ocurrió»           | Después del 404: fecha del evento <= ahora → 400               |
| 4.3 | «no se puede cambiar la fecha si el evento tiene reservas» | `if (dto.date && reservedSpots > 0)` → 409                     |
| 4.4 | «la capacidad no se puede modificar» (un campo bloqueado)  | DTO con `OmitType` + quitar el bloque de ese campo del service |

<details>
<summary><b>4.1 «no se puede modificar un evento inactivo»</b></summary>

**Service:**

```typescript
async update(id: number, updateEventDto: UpdateEventDto) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException('Evento no encontrado');
    }
    // 🔄 CAMBIO: "no se puede modificar un evento inactivo"
    if (!event.isActive) {
        throw new BadRequestException('No se puede modificar un evento inactivo');
    }
    // "si se modifica la fecha" → && = solo si vino
    if (updateEventDto.date && new Date(updateEventDto.date) <= new Date()) {
        throw new BadRequestException('La fecha debe ser futura');
    }
    // cupos ya reservados = capacidad actual - disponibles
    const reservedSpots = event.capacity - event.availableSpots;
    if (updateEventDto.capacity !== undefined) {
        if (updateEventDto.capacity < reservedSpots) {
            throw new BadRequestException(
                `La capacidad no puede ser inferior a los ${reservedSpots} lugares ya reservados`,
            );
        }
        // se recalculan los disponibles con la nueva capacidad
        event.availableSpots = updateEventDto.capacity - reservedSpots;
    }
    return await this.eventRepository.save({ ...event, ...updateEventDto }); // viejo + nuevo
}
```

</details>

<details>
<summary><b>4.2 «no se puede modificar un evento que ya ocurrió»</b></summary>

**Service:**

```typescript
async update(id: number, updateEventDto: UpdateEventDto) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException('Evento no encontrado');
    }
    // 🔄 CAMBIO: "no se puede modificar si ya ocurrió"
    if (new Date(event.date) <= new Date()) {
        throw new BadRequestException('No se puede modificar un evento que ya ocurrió');
    }
    // "si se modifica la fecha" → && = solo si vino
    if (updateEventDto.date && new Date(updateEventDto.date) <= new Date()) {
        throw new BadRequestException('La fecha debe ser futura');
    }
    // cupos ya reservados = capacidad actual - disponibles
    const reservedSpots = event.capacity - event.availableSpots;
    if (updateEventDto.capacity !== undefined) {
        if (updateEventDto.capacity < reservedSpots) {
            throw new BadRequestException(
                `La capacidad no puede ser inferior a los ${reservedSpots} lugares ya reservados`,
            );
        }
        // se recalculan los disponibles con la nueva capacidad
        event.availableSpots = updateEventDto.capacity - reservedSpots;
    }
    return await this.eventRepository.save({ ...event, ...updateEventDto }); // viejo + nuevo
}
```

</details>

<details>
<summary><b>4.3 «no se puede cambiar la fecha si el evento tiene reservas»</b></summary>

**Service:**

```typescript
async update(id: number, updateEventDto: UpdateEventDto) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException('Evento no encontrado');
    }
    if (updateEventDto.date && new Date(updateEventDto.date) <= new Date()) {
        throw new BadRequestException('La fecha debe ser futura');
    }
    const reservedSpots = event.capacity - event.availableSpots;
    // 🔄 CAMBIO: "no cambiar la fecha si tiene reservas" (reservedSpots > 0 = hay activas)
    if (updateEventDto.date && reservedSpots > 0) {
        throw new ConflictException('No se puede cambiar la fecha: el evento tiene reservas');
    }
    if (updateEventDto.capacity !== undefined) {
        if (updateEventDto.capacity < reservedSpots) {
            throw new BadRequestException(
                `La capacidad no puede ser inferior a los ${reservedSpots} lugares ya reservados`,
            );
        }
        event.availableSpots = updateEventDto.capacity - reservedSpots;
    }
    return await this.eventRepository.save({ ...event, ...updateEventDto });
}
```

</details>

<details>
<summary><b>4.4 «la capacidad no se puede modificar» (un campo bloqueado)</b></summary>

**DTO (`update-event.dto.ts`):**

```typescript
// 🔄 CAMBIO: OmitType quita "capacity" → si lo mandan, 400 (forbidNonWhitelisted)
export class UpdateEventDto extends PartialType(OmitType(CreateEventDto, ['capacity'] as const)) {}
```

**Service:**

```typescript
async update(id: number, updateEventDto: UpdateEventDto) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException('Evento no encontrado');
    }
    if (updateEventDto.date && new Date(updateEventDto.date) <= new Date()) {
        throw new BadRequestException('La fecha debe ser futura');
    }
    // 🔄 CAMBIO: sin el bloque de capacity (ya no puede venir)
    return await this.eventRepository.save({ ...event, ...updateEventDto });
}
```

</details>

---

## 5. Desactivar evento

**📌 Pre-parcial:** _"Solo se permite si el evento no tiene reservas activas"_

**Controller:**

```typescript
@Patch(':id/deactivate')
@HttpCode(HttpStatus.OK)
@Permissions('deactivate_event') // permiso propio en el seed
deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.deactivate(id);
}
```

**Service:**

```typescript
async deactivate(id: number) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException('Evento no encontrado');
    }
    if (!event.isActive) {
        throw new ConflictException('Este evento ya esta desactivado'); // ya estaba → 409
    }
    // "sin reservas activas" → count() de las ACTIVAS
    const activeDependents = await this.reservationRepository.count({
        where: { event: { id }, status: ReservationStatus.ACTIVE },
    });
    if (activeDependents > 0) {
        throw new ConflictException('No se puede desactivar: el evento tiene reservas activas.');
    }
    event.isActive = false;
    await this.eventRepository.save(event);
    return { message: 'Evento desactivado' };
}
```

- 🧪 Evento 1 (tiene activas) → **409** · desactivar dos veces → **409**.

### 🔄 Si el parcial lo cambia

| #   | Si el parcial dice…                                   | Qué cambia                                                      |
| --- | ----------------------------------------------------- | --------------------------------------------------------------- |
| 5.1 | «activar evento»                                      | Al revés: `if (event.isActive)` → 409 y `isActive = true`       |
| 5.2 | «activar o desactivar con el mismo endpoint» (toggle) | Sin el `if` de "ya estaba": `isActive = !isActive`              |
| 5.3 | «al desactivar un evento se cancelan sus reservas»    | En vez del 409: cancelar todas las activas y devolver los cupos |

<details>
<summary><b>5.1 «activar evento»</b></summary>

**Controller:**

```typescript
@Patch(':id/activate') // 🔄 CAMBIO: ruta nueva
@HttpCode(HttpStatus.OK)
@Permissions('update_event')
activate(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.activate(id);
}
```

**Service:**

```typescript
async activate(id: number) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException('Evento no encontrado');
    }
    // 🔄 CAMBIO: ya activo → 409
    if (event.isActive) {
        throw new ConflictException('Este evento ya está activo');
    }
    event.isActive = true; // 🔄 CAMBIO
    await this.eventRepository.save(event);
    return { message: 'Evento activado' };
}
```

</details>

<details>
<summary><b>5.2 «activar o desactivar con el mismo endpoint» (toggle)</b></summary>

**Service:**

```typescript
async deactivate(id: number) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException('Evento no encontrado');
    }
    // al DESactivar sigue la regla de reservas activas
    if (event.isActive) {
        const activeDependents = await this.reservationRepository.count({
            where: { event: { id }, status: ReservationStatus.ACTIVE },
        });
        if (activeDependents > 0) {
            throw new ConflictException('No se puede desactivar: el evento tiene reservas activas.');
        }
    }
    event.isActive = !event.isActive; // 🔄 CAMBIO: invierte (true↔false)
    await this.eventRepository.save(event);
    return { message: event.isActive ? 'Evento activado' : 'Evento desactivado' };
}
```

</details>

<details>
<summary><b>5.3 «al desactivar un evento se cancelan sus reservas»</b></summary>

**Service:**

```typescript
async deactivate(id: number) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException('Evento no encontrado');
    }
    if (!event.isActive) {
        throw new ConflictException('Este evento ya esta desactivado');
    }
    // 🔄 CAMBIO: en vez de 409 → cancelar todas las activas
    const activeReservations = await this.reservationRepository.find({
        where: { event: { id }, status: ReservationStatus.ACTIVE },
    });
    activeReservations.forEach((reservation) => (reservation.status = ReservationStatus.CANCELLED));
    await this.reservationRepository.save(activeReservations); // save de una lista = guarda todas
    event.availableSpots = event.capacity; // 🔄 CAMBIO: todos los cupos vuelven
    event.isActive = false;
    await this.eventRepository.save(event);
    return { message: `Evento desactivado y ${activeReservations.length} reservas canceladas` };
}
```

</details>

---

## 6. Eliminar evento

**📌 Pre-parcial:** _"Se debe validar la existencia del evento" (+ sin 500 por FK)_

**Service:**

```typescript
async remove(id: number) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }
    // cuenta TODAS (activas y canceladas): con hijos, el DELETE da 500 por FK
    const dependentCount = await this.reservationRepository.count({
        where: { event: { id } },
    });
    if (dependentCount > 0) {
        throw new ConflictException('No se puede eliminar: el evento tiene reservas.');
    }
    await this.eventRepository.delete(id);
    return { message: 'Este evento ha sido eliminado' };
}
```

- Este `count` es para borrar al **PADRE**. Para borrar al **HIJO** (reserva) no va → sección 12.

### 🔄 Si el parcial lo cambia

| #   | Si el parcial dice…                                               | Qué cambia                                                     |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| 6.1 | «no se puede eliminar si tiene reservas activas»                  | Contar solo ACTIVAS y borrar antes las canceladas              |
| 6.2 | «al eliminar un evento se eliminan sus reservas»                  | `onDelete: 'CASCADE'` en la reserva + `delete` sin contar      |
| 6.3 | «no borrar el evento, solo marcarlo como eliminado» (soft delete) | `@DeleteDateColumn` + `softDelete(id)`; `find()` ya no lo trae |

<details>
<summary><b>6.1 «no se puede eliminar si tiene reservas activas»</b></summary>

**Service:**

```typescript
async remove(id: number) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }
    // 🔄 CAMBIO: solo las ACTIVAS impiden
    const activeCount = await this.reservationRepository.count({
        where: { event: { id }, status: ReservationStatus.ACTIVE },
    });
    if (activeCount > 0) {
        throw new ConflictException('No se puede eliminar: el evento tiene reservas activas.');
    }
    // 🔄 CAMBIO: las canceladas se borran primero (si no, FK → 500)
    const cancelled = await this.reservationRepository.find({ where: { event: { id } } });
    await this.reservationRepository.remove(cancelled);
    await this.eventRepository.delete(id);
    return { message: 'Este evento ha sido eliminado' };
}
```

</details>

<details>
<summary><b>6.2 «al eliminar un evento se eliminan sus reservas»</b></summary>

**Entity (`reservation.entity.ts`) — cambiar la relación:**

```typescript
// 🔄 CAMBIO: onDelete CASCADE → al borrar el evento, Postgres borra sus reservas
@ManyToOne(() => Event, (event) => event.reservations, { nullable: false, onDelete: 'CASCADE' })
@JoinColumn({ name: 'event_id' })
event: Event;
```

**Service:**

```typescript
async remove(id: number) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }
    // 🔄 CAMBIO: sin count → la BD borra las reservas sola
    await this.eventRepository.delete(id);
    return { message: 'Evento y sus reservas eliminados' };
}
```

</details>

<details>
<summary><b>6.3 «no borrar el evento, solo marcarlo como eliminado» (soft delete)</b></summary>

**Entity (`event.entity.ts`) — agregar:**

```typescript
// 🔄 CAMBIO: fecha de borrado (null = no borrado). synchronize crea la columna
@DeleteDateColumn({ name: 'deleted_at' })
deletedAt: Date;
```

**Service:**

```typescript
async remove(id: number) {
    const event = await this.eventRepository.findOneBy({ id });
    if (!event) {
        throw new NotFoundException(`Evento con id ${id} no encontrado`);
    }
    // 🔄 CAMBIO: softDelete pone deleted_at = ahora (la fila sigue en la tabla)
    await this.eventRepository.softDelete(id);
    return { message: 'Este evento ha sido eliminado' };
}
```

</details>

---

## 7. Crear reserva

**📌 Pre-parcial:** _"El evento debe existir / estar activo / no haber ocurrido · no exceder `availableSpots` · máximo 5 cupos activos por evento · descontar cupos"_

**Controller:**

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@Permissions('create_reservation')
create(@Body() createReservationDto: CreateReservationDto, @Req() req: AuthenticatedRequest) {
    return this.reservationService.create(createReservationDto, req.user!);
}
```

**Service:**

```typescript
async create(createReservationDto: CreateReservationDto, currentUser: User) {
    // transacción: si algo falla, no se guarda nada. Adentro usar manager
    return await this.dataSource.transaction(async (manager) => {
        const event = await manager.findOneBy(Event, { id: createReservationDto.eventId });
        if (!event) {
            throw new NotFoundException('No se encuentra el evento que buscas'); // "debe existir"
        }
        if (!event.isActive) {
            throw new BadRequestException('El evento no está activo'); // "debe estar activo"
        }
        if (new Date(event.date) <= new Date()) {
            throw new BadRequestException('El evento ya ocurrió'); // "no debe haber ocurrido"
        }
        if (event.availableSpots < createReservationDto.quantity) {
            throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
        }
        // "máximo 5 por usuario" → SUMAR quantity de sus activas en este evento
        const activeReservations = await manager.find(Reservation, {
            where: {
                user: { id: currentUser.id },
                event: { id: event.id },
                status: ReservationStatus.ACTIVE,
            },
        });
        const activeSpots = activeReservations.reduce((total, reservation) => total + reservation.quantity, 0);
        if (activeSpots + createReservationDto.quantity > 5) {
            throw new BadRequestException(
                `Solo puedes reservar ${5 - activeSpots} cupos más para este evento (máximo 5 por usuario)`,
            );
        }

        event.availableSpots -= createReservationDto.quantity; // "descontar cupos"
        await manager.save(event); // se guarda el EVENTO

        const newReservation = manager.create(Reservation, {
            quantity: createReservationDto.quantity,
            event, // objeto, no id
            user: currentUser, // del token
            status: ReservationStatus.ACTIVE,
        });
        return await manager.save(newReservation);
    });
}
```

- 🧪 Ana, evento 1, 3 cupos → **400** (ya tiene 3) · evento 4 → **400** (ya ocurrió) · evento 999 → **404**.

### 🔄 Si el parcial lo cambia

| #   | Si el parcial dice…                                           | Qué cambia                                          |
| --- | ------------------------------------------------------------- | --------------------------------------------------- |
| 7.1 | «máximo 3 reservas activas por usuario» (reservas, no cupos)  | `find` + `reduce` → `count()` y `>= 3`              |
| 7.2 | «máximo 5 cupos activos en total» (sumando todos los eventos) | Quitar `event: { id }` del `where`                  |
| 7.3 | «el administrador no tiene límite de cupos»                   | Envolver el límite en `if (!isAdmin)`               |
| 7.4 | «un usuario no puede reservar dos veces el mismo evento»      | `count` de sus activas en el evento > 0 → 409       |
| 7.5 | «máximo 5 cupos por reserva»                                  | `@Max(5)` en el DTO (el service no cambia)          |
| 7.6 | «cada reserva corresponde a un solo cupo» (sin cantidad)      | DTO sin `quantity`; usar `1` y contar reservas      |
| 7.7 | «solo se puede reservar para eventos de los próximos 7 días»  | Además de "no ocurrió": fecha del evento <= hoy + 7 |

<details>
<summary><b>7.1 «máximo 3 reservas activas por usuario» (reservas, no cupos)</b></summary>

**Service:**

```typescript
async create(createReservationDto: CreateReservationDto, currentUser: User) {
    // transacción: si algo falla, no se guarda nada. Adentro usar manager
    return await this.dataSource.transaction(async (manager) => {
        const event = await manager.findOneBy(Event, { id: createReservationDto.eventId });
        if (!event) {
            throw new NotFoundException('No se encuentra el evento que buscas'); // "debe existir"
        }
        if (!event.isActive) {
            throw new BadRequestException('El evento no está activo'); // "debe estar activo"
        }
        if (new Date(event.date) <= new Date()) {
            throw new BadRequestException('El evento ya ocurrió'); // "no debe haber ocurrido"
        }
        if (event.availableSpots < createReservationDto.quantity) {
            throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
        }
        // 🔄 CAMBIO: "máximo 3 RESERVAS" → contar filas (count), no sumar cupos
        const activeCount = await manager.count(Reservation, {
            where: {
                user: { id: currentUser.id },
                event: { id: event.id },
                status: ReservationStatus.ACTIVE,
            },
        });
        if (activeCount >= 3) {
            throw new BadRequestException('Ya tienes el máximo de 3 reservas activas en este evento');
        }

        event.availableSpots -= createReservationDto.quantity; // "descontar cupos"
        await manager.save(event); // se guarda el EVENTO

        const newReservation = manager.create(Reservation, {
            quantity: createReservationDto.quantity,
            event, // objeto, no id
            user: currentUser, // del token
            status: ReservationStatus.ACTIVE,
        });
        return await manager.save(newReservation);
    });
}
```

</details>

<details>
<summary><b>7.2 «máximo 5 cupos activos en total» (sumando todos los eventos)</b></summary>

**Service:**

```typescript
async create(createReservationDto: CreateReservationDto, currentUser: User) {
    // transacción: si algo falla, no se guarda nada. Adentro usar manager
    return await this.dataSource.transaction(async (manager) => {
        const event = await manager.findOneBy(Event, { id: createReservationDto.eventId });
        if (!event) {
            throw new NotFoundException('No se encuentra el evento que buscas'); // "debe existir"
        }
        if (!event.isActive) {
            throw new BadRequestException('El evento no está activo'); // "debe estar activo"
        }
        if (new Date(event.date) <= new Date()) {
            throw new BadRequestException('El evento ya ocurrió'); // "no debe haber ocurrido"
        }
        if (event.availableSpots < createReservationDto.quantity) {
            throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
        }
        // 🔄 CAMBIO: "en total" → sin filtrar por evento
        const activeReservations = await manager.find(Reservation, {
            where: {
                user: { id: currentUser.id },
                status: ReservationStatus.ACTIVE,
            },
        });
        const activeSpots = activeReservations.reduce((total, reservation) => total + reservation.quantity, 0);
        if (activeSpots + createReservationDto.quantity > 5) {
            throw new BadRequestException(`Solo puedes reservar ${5 - activeSpots} cupos más (máximo 5 en total)`);
        }

        event.availableSpots -= createReservationDto.quantity; // "descontar cupos"
        await manager.save(event); // se guarda el EVENTO

        const newReservation = manager.create(Reservation, {
            quantity: createReservationDto.quantity,
            event, // objeto, no id
            user: currentUser, // del token
            status: ReservationStatus.ACTIVE,
        });
        return await manager.save(newReservation);
    });
}
```

</details>

<details>
<summary><b>7.3 «el administrador no tiene límite de cupos»</b></summary>

**Service:**

```typescript
async create(createReservationDto: CreateReservationDto, currentUser: User) {
    // transacción: si algo falla, no se guarda nada. Adentro usar manager
    return await this.dataSource.transaction(async (manager) => {
        const event = await manager.findOneBy(Event, { id: createReservationDto.eventId });
        if (!event) {
            throw new NotFoundException('No se encuentra el evento que buscas'); // "debe existir"
        }
        if (!event.isActive) {
            throw new BadRequestException('El evento no está activo'); // "debe estar activo"
        }
        if (new Date(event.date) <= new Date()) {
            throw new BadRequestException('El evento ya ocurrió'); // "no debe haber ocurrido"
        }
        if (event.availableSpots < createReservationDto.quantity) {
            throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
        }
        // 🔄 CAMBIO: el límite solo aplica si NO es admin
        const isAdmin = currentUser.role?.name === 'admin';
        if (!isAdmin) {
            const activeReservations = await manager.find(Reservation, {
                where: {
                    user: { id: currentUser.id },
                    event: { id: event.id },
                    status: ReservationStatus.ACTIVE,
                },
            });
            const activeSpots = activeReservations.reduce((total, reservation) => total + reservation.quantity, 0);
            if (activeSpots + createReservationDto.quantity > 5) {
                throw new BadRequestException(
                    `Solo puedes reservar ${5 - activeSpots} cupos más para este evento (máximo 5 por usuario)`,
                );
            }
        }

        event.availableSpots -= createReservationDto.quantity; // "descontar cupos"
        await manager.save(event); // se guarda el EVENTO

        const newReservation = manager.create(Reservation, {
            quantity: createReservationDto.quantity,
            event, // objeto, no id
            user: currentUser, // del token
            status: ReservationStatus.ACTIVE,
        });
        return await manager.save(newReservation);
    });
}
```

</details>

<details>
<summary><b>7.4 «un usuario no puede reservar dos veces el mismo evento»</b></summary>

**Service:**

```typescript
async create(createReservationDto: CreateReservationDto, currentUser: User) {
    // transacción: si algo falla, no se guarda nada. Adentro usar manager
    return await this.dataSource.transaction(async (manager) => {
        const event = await manager.findOneBy(Event, { id: createReservationDto.eventId });
        if (!event) {
            throw new NotFoundException('No se encuentra el evento que buscas'); // "debe existir"
        }
        if (!event.isActive) {
            throw new BadRequestException('El evento no está activo'); // "debe estar activo"
        }
        if (new Date(event.date) <= new Date()) {
            throw new BadRequestException('El evento ya ocurrió'); // "no debe haber ocurrido"
        }
        if (event.availableSpots < createReservationDto.quantity) {
            throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
        }
        // 🔄 CAMBIO: "no dos veces" → si ya tiene una ACTIVA en este evento, 409
        const alreadyReserved = await manager.count(Reservation, {
            where: {
                user: { id: currentUser.id },
                event: { id: event.id },
                status: ReservationStatus.ACTIVE,
            },
        });
        if (alreadyReserved > 0) {
            throw new ConflictException('Ya tienes una reserva activa para este evento');
        }

        event.availableSpots -= createReservationDto.quantity; // "descontar cupos"
        await manager.save(event); // se guarda el EVENTO

        const newReservation = manager.create(Reservation, {
            quantity: createReservationDto.quantity,
            event, // objeto, no id
            user: currentUser, // del token
            status: ReservationStatus.ACTIVE,
        });
        return await manager.save(newReservation);
    });
}
```

</details>

<details>
<summary><b>7.5 «máximo 5 cupos por reserva»</b></summary>

**DTO (`create-reservation.dto.ts`):**

```typescript
export class CreateReservationDto {
    @IsNotEmpty({ message: 'El ID del evento es obligatorio' })
    @IsInt({ message: 'El ID del evento debe ser un número entero' })
    @IsPositive({ message: 'El ID del evento debe ser un número positivo' })
    eventId: number;

    @IsInt({ message: 'La cantidad debe ser un numero entero' })
    @IsNotEmpty({ message: 'La cantidad de la reserva es obligatoria' })
    @IsPositive({ message: 'La cantidad de la reserva debe ser un número positivo' })
    @Max(5, { message: 'Máximo 5 cupos por reserva' }) // 🔄 CAMBIO
    quantity: number;
}
```

</details>

<details>
<summary><b>7.6 «cada reserva corresponde a un solo cupo» (sin cantidad)</b></summary>

**DTO (`create-reservation.dto.ts`):**

```typescript
export class CreateReservationDto {
    @IsNotEmpty({ message: 'El ID del evento es obligatorio' })
    @IsInt({ message: 'El ID del evento debe ser un número entero' })
    @IsPositive({ message: 'El ID del evento debe ser un número positivo' })
    eventId: number;
    // 🔄 CAMBIO: sin quantity
}
```

**Service:**

```typescript
async create(createReservationDto: CreateReservationDto, currentUser: User) {
    // transacción: si algo falla, no se guarda nada. Adentro usar manager
    return await this.dataSource.transaction(async (manager) => {
        const event = await manager.findOneBy(Event, { id: createReservationDto.eventId });
        if (!event) {
            throw new NotFoundException('No se encuentra el evento que buscas'); // "debe existir"
        }
        if (!event.isActive) {
            throw new BadRequestException('El evento no está activo'); // "debe estar activo"
        }
        if (new Date(event.date) <= new Date()) {
            throw new BadRequestException('El evento ya ocurrió'); // "no debe haber ocurrido"
        }
        if (event.availableSpots < 1) {
            throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
        }
        // 🔄 CAMBIO: 1 cupo por reserva → "máximo 5" = contar reservas
        const activeCount = await manager.count(Reservation, {
            where: {
                user: { id: currentUser.id },
                event: { id: event.id },
                status: ReservationStatus.ACTIVE,
            },
        });
        if (activeCount >= 5) {
            throw new BadRequestException('Ya tienes el máximo de 5 reservas en este evento');
        }

        event.availableSpots -= 1; // "descontar cupos"
        await manager.save(event); // se guarda el EVENTO

        const newReservation = manager.create(Reservation, {
            quantity: 1, // 🔄 CAMBIO: siempre 1
            event, // objeto, no id
            user: currentUser, // del token
            status: ReservationStatus.ACTIVE,
        });
        return await manager.save(newReservation);
    });
}
```

</details>

<details>
<summary><b>7.7 «solo se puede reservar para eventos de los próximos 7 días»</b></summary>

**Service:**

```typescript
async create(createReservationDto: CreateReservationDto, currentUser: User) {
    // transacción: si algo falla, no se guarda nada. Adentro usar manager
    return await this.dataSource.transaction(async (manager) => {
        const event = await manager.findOneBy(Event, { id: createReservationDto.eventId });
        if (!event) {
            throw new NotFoundException('No se encuentra el evento que buscas'); // "debe existir"
        }
        if (!event.isActive) {
            throw new BadRequestException('El evento no está activo'); // "debe estar activo"
        }
        const eventDate = new Date(event.date);
        if (eventDate <= new Date()) {
            throw new BadRequestException('El evento ya ocurrió');
        }
        // 🔄 CAMBIO: "próximos 7 días" → máximo = hoy + 7
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);
        if (eventDate > maxDate) {
            throw new BadRequestException('Solo puedes reservar eventos de los próximos 7 días');
        }
        if (event.availableSpots < createReservationDto.quantity) {
            throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
        }
        // "máximo 5 por usuario" → SUMAR quantity de sus activas en este evento
        const activeReservations = await manager.find(Reservation, {
            where: {
                user: { id: currentUser.id },
                event: { id: event.id },
                status: ReservationStatus.ACTIVE,
            },
        });
        const activeSpots = activeReservations.reduce((total, reservation) => total + reservation.quantity, 0);
        if (activeSpots + createReservationDto.quantity > 5) {
            throw new BadRequestException(
                `Solo puedes reservar ${5 - activeSpots} cupos más para este evento (máximo 5 por usuario)`,
            );
        }

        event.availableSpots -= createReservationDto.quantity; // "descontar cupos"
        await manager.save(event); // se guarda el EVENTO

        const newReservation = manager.create(Reservation, {
            quantity: createReservationDto.quantity,
            event, // objeto, no id
            user: currentUser, // del token
            status: ReservationStatus.ACTIVE,
        });
        return await manager.save(newReservation);
    });
}
```

</details>

---

## 8. Cancelar reserva

**📌 Pre-parcial:** _"Debe existir · pertenecer al usuario autenticado · no cancelada antes · el evento no ocurrió · liberar cupos y `CANCELLED`"_

**Controller:**

```typescript
@Patch(':id/cancel')
@HttpCode(HttpStatus.OK)
@Permissions('cancel_reservation')
cancel(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.reservationService.cancel(id, req.user!);
}
```

**Service:**

```typescript
async cancel(id: number, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { user: true, event: true }, // sin esto .user / .event = undefined → 500
        });
        if (!reservation) {
            throw new NotFoundException('Reserva no encontrada');
        }
        if (reservation.user.id !== currentUser.id) {
            throw new ForbiddenException('Esta reserva no te pertenece'); // "debe pertenecer al usuario"
        }
        if (reservation.status === ReservationStatus.CANCELLED) {
            throw new ConflictException('Esta reserva ya fue cancelada'); // "ya cancelada" → 409
        }
        if (new Date(reservation.event.date) <= new Date()) {
            throw new BadRequestException('No se puede cancelar: el evento ya ocurrió');
        }
        reservation.event.availableSpots += reservation.quantity; // "liberar cupos" (+=)
        await manager.save(reservation.event);
        reservation.status = ReservationStatus.CANCELLED; // no se borra, cambia estado
        await manager.save(reservation);
        return { message: 'Reserva cancelada correctamente' };
    });
}
```

- 🧪 Carlos cancela la 1 (de Ana) → **403** · cancelar dos veces → **409** · reserva 4 (evento pasado) → **400**.

### 🔄 Si el parcial lo cambia

| #   | Si el parcial dice…                                         | Qué cambia                                                |
| --- | ----------------------------------------------------------- | --------------------------------------------------------- |
| 8.1 | «el administrador también puede cancelar cualquier reserva» | `if (!isAdmin && !isOwner)` → 403                         |
| 8.2 | «solo se puede cancelar hasta 24 horas antes del evento»    | Límite = fecha del evento − N horas; ahora > límite → 400 |
| 8.3 | «al cancelar, la reserva se elimina»                        | En vez de `status = CANCELLED`: `manager.delete`          |
| 8.4 | «registrar la fecha de cancelación»                         | Columna `cancelledAt` (nullable) + `= new Date()`         |

<details>
<summary><b>8.1 «el administrador también puede cancelar cualquier reserva»</b></summary>

**Service:**

```typescript
async cancel(id: number, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { user: true, event: true }, // sin esto .user / .event = undefined → 500
        });
        if (!reservation) {
            throw new NotFoundException('Reserva no encontrada');
        }
        // 🔄 CAMBIO: ADMIN o dueño
        const isAdmin = currentUser.role?.name === 'admin';
        const isOwner = reservation.user.id === currentUser.id;
        if (!isAdmin && !isOwner) {
            throw new ForbiddenException('Esta reserva no te pertenece');
        }
        if (reservation.status === ReservationStatus.CANCELLED) {
            throw new ConflictException('Esta reserva ya fue cancelada'); // "ya cancelada" → 409
        }
        if (new Date(reservation.event.date) <= new Date()) {
            throw new BadRequestException('No se puede cancelar: el evento ya ocurrió');
        }
        reservation.event.availableSpots += reservation.quantity; // "liberar cupos" (+=)
        await manager.save(reservation.event);
        reservation.status = ReservationStatus.CANCELLED; // no se borra, cambia estado
        await manager.save(reservation);
        return { message: 'Reserva cancelada correctamente' };
    });
}
```

</details>

<details>
<summary><b>8.2 «solo se puede cancelar hasta 24 horas antes del evento»</b></summary>

**Service:**

```typescript
async cancel(id: number, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { user: true, event: true }, // sin esto .user / .event = undefined → 500
        });
        if (!reservation) {
            throw new NotFoundException('Reserva no encontrada');
        }
        if (reservation.user.id !== currentUser.id) {
            throw new ForbiddenException('Esta reserva no te pertenece'); // "debe pertenecer al usuario"
        }
        if (reservation.status === ReservationStatus.CANCELLED) {
            throw new ConflictException('Esta reserva ya fue cancelada'); // "ya cancelada" → 409
        }
        if (new Date(reservation.event.date) <= new Date()) {
            throw new BadRequestException('No se puede cancelar: el evento ya ocurrió');
        }
        // 🔄 CAMBIO: "hasta 24 horas antes" → límite = fecha del evento - 24 h
        const limit = new Date(reservation.event.date);
        limit.setHours(limit.getHours() - 24);
        if (new Date() > limit) {
            throw new BadRequestException('Solo puedes cancelar hasta 24 horas antes del evento');
        }
        reservation.event.availableSpots += reservation.quantity; // "liberar cupos" (+=)
        await manager.save(reservation.event);
        reservation.status = ReservationStatus.CANCELLED; // no se borra, cambia estado
        await manager.save(reservation);
        return { message: 'Reserva cancelada correctamente' };
    });
}
```

</details>

<details>
<summary><b>8.3 «al cancelar, la reserva se elimina»</b></summary>

**Service:**

```typescript
async cancel(id: number, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { user: true, event: true }, // sin esto .user / .event = undefined → 500
        });
        if (!reservation) {
            throw new NotFoundException('Reserva no encontrada');
        }
        if (reservation.user.id !== currentUser.id) {
            throw new ForbiddenException('Esta reserva no te pertenece'); // "debe pertenecer al usuario"
        }
        if (reservation.status === ReservationStatus.CANCELLED) {
            throw new ConflictException('Esta reserva ya fue cancelada'); // "ya cancelada" → 409
        }
        if (new Date(reservation.event.date) <= new Date()) {
            throw new BadRequestException('No se puede cancelar: el evento ya ocurrió');
        }
        reservation.event.availableSpots += reservation.quantity;
        await manager.save(reservation.event);
        // 🔄 CAMBIO: se borra la fila (no se marca)
        await manager.delete(Reservation, id);
        return { message: 'Reserva cancelada y eliminada' };
    });
}
```

</details>

<details>
<summary><b>8.4 «registrar la fecha de cancelación»</b></summary>

**Entity (`reservation.entity.ts`) — agregar:**

```typescript
// 🔄 CAMBIO: null mientras no se cancele
@Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
cancelledAt: Date;
```

**Service:**

```typescript
async cancel(id: number, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { user: true, event: true }, // sin esto .user / .event = undefined → 500
        });
        if (!reservation) {
            throw new NotFoundException('Reserva no encontrada');
        }
        if (reservation.user.id !== currentUser.id) {
            throw new ForbiddenException('Esta reserva no te pertenece'); // "debe pertenecer al usuario"
        }
        if (reservation.status === ReservationStatus.CANCELLED) {
            throw new ConflictException('Esta reserva ya fue cancelada'); // "ya cancelada" → 409
        }
        if (new Date(reservation.event.date) <= new Date()) {
            throw new BadRequestException('No se puede cancelar: el evento ya ocurrió');
        }
        reservation.event.availableSpots += reservation.quantity;
        await manager.save(reservation.event);
        reservation.status = ReservationStatus.CANCELLED;
        reservation.cancelledAt = new Date(); // 🔄 CAMBIO: fecha de cancelación
        await manager.save(reservation);
        return { message: 'Reserva cancelada correctamente' };
    });
}
```

</details>

---

## 9. Mis reservas (`GET /user`)

**📌 Pre-parcial:** _"`GET /reservations/user`: retorna únicamente las reservas del usuario autenticado"_

**Controller:**

```typescript
// ⚠️ @Get('user') va ANTES de @Get(':id') (si no → 400 "numeric string is expected")
@Get('user')
@HttpCode(HttpStatus.OK)
@Permissions('read_own_reservations')
findMine(@Req() req: AuthenticatedRequest) {
    return this.reservationService.findMine(req.user!);
}
```

**Service:**

```typescript
async findMine(currentUser: User) {
    return await this.reservationRepository.find({
        where: { user: { id: currentUser.id } }, // filtro por relación
        relations: { event: true }, // ver de qué evento es
    });
}
```

- 🧪 Ana → solo las suyas (1, 4, 5).

### 🔄 Si el parcial lo cambia

| #   | Si el parcial dice…                                            | Qué cambia                                                     |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| 9.1 | «permitir filtrar mis reservas por estado» (`?status=ACTIVE`)  | `@Query('status')` + `...(status && { status })` en el `where` |
| 9.2 | «mostrar solo mis reservas activas»                            | `status: ReservationStatus.ACTIVE` en el `where`               |
| 9.3 | «mostrar solo reservas de eventos que no han ocurrido»         | `event: { date: MoreThan(new Date()) }` (import de `typeorm`)  |
| 9.4 | «ordenadas de la más reciente a la más antigua»                | `order: { createdAt: 'DESC' }`                                 |
| 9.5 | «el administrador puede ver las reservas de cualquier usuario» | `GET /user/:userId` con `@Param` (antes de `:id`)              |

<details>
<summary><b>9.1 «permitir filtrar mis reservas por estado» (`?status=ACTIVE`)</b></summary>

**Controller:**

```typescript
@Get('user')
@HttpCode(HttpStatus.OK)
@Permissions('read_own_reservations')
findMine(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: ReservationStatus, // 🔄 CAMBIO: ?status=ACTIVE (opcional)
) {
    return this.reservationService.findMine(req.user!, status);
}
```

**Service:**

```typescript
async findMine(currentUser: User, status?: ReservationStatus) {
    return await this.reservationRepository.find({
        where: {
            user: { id: currentUser.id },
            ...(status && { status }), // 🔄 CAMBIO: solo filtra si vino
        },
        relations: { event: true },
    });
}
```

</details>

<details>
<summary><b>9.2 «mostrar solo mis reservas activas»</b></summary>

**Service:**

```typescript
async findMine(currentUser: User) {
    return await this.reservationRepository.find({
        where: {
            user: { id: currentUser.id },
            status: ReservationStatus.ACTIVE, // 🔄 CAMBIO
        },
        relations: { event: true },
    });
}
```

</details>

<details>
<summary><b>9.3 «mostrar solo reservas de eventos que no han ocurrido»</b></summary>

**Service:**

```typescript
// import { MoreThan } from 'typeorm';
async findMine(currentUser: User) {
    return await this.reservationRepository.find({
        where: {
            user: { id: currentUser.id },
            event: { date: MoreThan(new Date()) }, // 🔄 CAMBIO: fecha del evento > ahora
        },
        relations: { event: true },
    });
}
```

</details>

<details>
<summary><b>9.4 «ordenadas de la más reciente a la más antigua»</b></summary>

**Service:**

```typescript
async findMine(currentUser: User) {
    return await this.reservationRepository.find({
        where: { user: { id: currentUser.id } },
        relations: { event: true },
        order: { createdAt: 'DESC' }, // 🔄 CAMBIO: DESC = recientes primero
    });
}
```

</details>

<details>
<summary><b>9.5 «el administrador puede ver las reservas de cualquier usuario»</b></summary>

**Controller:**

```typescript
// 🔄 CAMBIO: ruta con el id del usuario (también ANTES de @Get(':id'))
@Get('user/:userId')
@HttpCode(HttpStatus.OK)
@Permissions('read_reservations') // solo admin
findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.reservationService.findByUser(userId);
}
```

**Service:**

```typescript
async findByUser(userId: number) {
    return await this.reservationRepository.find({
        where: { user: { id: userId } }, // 🔄 CAMBIO: el id viene de la URL, no del token
        relations: { event: true },
    });
}
```

</details>

---

## 10. Ver una (ADMIN o dueño)

**📌 Pre-parcial:** _"`GET /reservations/:id`: recurso para ADMIN o propietario de la reserva"_

**Controller:**

```typescript
@Get(':id')
@HttpCode(HttpStatus.OK)
@Permissions('read_reservation')
findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.reservationService.findOne(id, req.user!); // necesita saber quién pregunta
}
```

**Service:**

```typescript
async findOne(id: number, currentUser: User) {
    const reservation = await this.reservationRepository.findOne({
        where: { id },
        relations: { user: true, event: true }, // user → para saber el dueño
    });
    if (!reservation) {
        throw new NotFoundException(`Reserva con id ${id} no encontrada`);
    }
    const isAdmin = currentUser.role?.name === 'admin'; // nombre del rol en el seed
    const isOwner = reservation.user.id === currentUser.id;
    if (!isAdmin && !isOwner) {
        throw new ForbiddenException('No tienes acceso a esta reserva'); // ninguno → 403
    }
    return reservation;
}
```

- 🧪 Carlos ve la 1 → **403** · Ana ve la 1 → **200** · admin → **200** · 999 → **404**.

### 🔄 Si el parcial lo cambia

| #    | Si el parcial dice…                                        | Qué cambia                                       |
| ---- | ---------------------------------------------------------- | ------------------------------------------------ |
| 10.1 | «solo el dueño puede ver su reserva»                       | Quitar `isAdmin`: `if (!isOwner)`                |
| 10.2 | «solo el administrador puede consultar una reserva por id» | Sin `req.user`: el permiso de admin alcanza      |
| 10.3 | «no exponer información sensible del usuario» (contraseña) | Devolver solo `id`, `username`, `email` del user |

<details>
<summary><b>10.1 «solo el dueño puede ver su reserva»</b></summary>

**Service:**

```typescript
async findOne(id: number, currentUser: User) {
    const reservation = await this.reservationRepository.findOne({
        where: { id },
        relations: { user: true, event: true }, // user → para saber el dueño
    });
    if (!reservation) {
        throw new NotFoundException(`Reserva con id ${id} no encontrada`);
    }
    // 🔄 CAMBIO: sin admin → solo el dueño
    if (reservation.user.id !== currentUser.id) {
        throw new ForbiddenException('No tienes acceso a esta reserva');
    }
    return reservation;
}
```

</details>

<details>
<summary><b>10.2 «solo el administrador puede consultar una reserva por id»</b></summary>

**Controller:**

```typescript
@Get(':id')
@HttpCode(HttpStatus.OK)
@Permissions('read_reservations') // 🔄 CAMBIO: permiso que solo tiene admin
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reservationService.findOne(id); // 🔄 CAMBIO: sin req.user
}
```

**Service:**

```typescript
async findOne(id: number) {
    const reservation = await this.reservationRepository.findOne({
        where: { id },
        relations: { user: true, event: true },
    });
    if (!reservation) {
        throw new NotFoundException(`Reserva con id ${id} no encontrada`);
    }
    return reservation; // 🔄 CAMBIO: sin if de dueño
}
```

</details>

<details>
<summary><b>10.3 «no exponer información sensible del usuario» (contraseña)</b></summary>

**Service:**

```typescript
async findOne(id: number, currentUser: User) {
    const reservation = await this.reservationRepository.findOne({
        where: { id },
        relations: { user: true, event: true }, // user → para saber el dueño
    });
    if (!reservation) {
        throw new NotFoundException(`Reserva con id ${id} no encontrada`);
    }
    const isAdmin = currentUser.role?.name === 'admin';
    const isOwner = reservation.user.id === currentUser.id;
    if (!isAdmin && !isOwner) {
        throw new ForbiddenException('No tienes acceso a esta reserva');
    }
    // 🔄 CAMBIO: armar el user sin passwordHash
    const { id: userId, username, email } = reservation.user;
    return { ...reservation, user: { id: userId, username, email } };
}
```

</details>

---

## 11. Actualizar reserva

**📌 Pre-parcial:** _`PATCH /reservations/:id` con `{ "quantity" }`_

**DTO (`update-reservation.dto.ts`):**

```typescript
// SOLO quantity (PartialType dejaba cambiar eventId)
export class UpdateReservationDto extends PickType(CreateReservationDto, ['quantity'] as const) {}
```

**Controller:**

```typescript
@Patch(':id')
@HttpCode(HttpStatus.OK)
@Permissions('update_reservation')
update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReservationDto: UpdateReservationDto,
    @Req() req: AuthenticatedRequest,
) {
    return this.reservationService.update(id, updateReservationDto, req.user!);
}
```

**Service:**

```typescript
async update(id: number, updateReservationDto: UpdateReservationDto, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { user: true, event: true },
        });
        if (!reservation) {
            throw new NotFoundException('Reserva no encontrada');
        }
        const isAdmin = currentUser.role?.name === 'admin';
        if (!isAdmin && reservation.user.id !== currentUser.id) {
            throw new ForbiddenException('Esta reserva no te pertenece'); // ADMIN o dueño
        }
        if (reservation.status === ReservationStatus.CANCELLED) {
            throw new ConflictException('No se puede modificar una reserva cancelada');
        }
        const event = reservation.event;
        if (new Date(event.date) <= new Date()) {
            throw new BadRequestException('No se puede modificar: el evento ya ocurrió');
        }
        // diferencia: + pide más cupos, − devuelve cupos
        const difference = updateReservationDto.quantity - reservation.quantity;
        if (difference > event.availableSpots) {
            throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
        }
        // máximo 5: sus otras activas (SIN esta) + la nueva cantidad
        const activeReservations = await manager.find(Reservation, {
            where: {
                user: { id: reservation.user.id },
                event: { id: event.id },
                status: ReservationStatus.ACTIVE,
            },
        });
        const otherSpots = activeReservations.reduce((total, r) => total + r.quantity, 0) - reservation.quantity;
        if (otherSpots + updateReservationDto.quantity > 5) {
            throw new BadRequestException(
                `Solo puedes tener ${5 - otherSpots} cupos en esta reserva (máximo 5 por usuario)`,
            );
        }

        event.availableSpots -= difference; // diferencia negativa = devuelve cupos
        await manager.save(event);
        reservation.quantity = updateReservationDto.quantity;
        return await manager.save(reservation);
    });
}
```

- 🧪 Ana 3 → 6 → **400** · 3 → 5 → el evento baja 2 cupos · con `eventId` → **400** · cancelada → **409**.

### 🔄 Si el parcial lo cambia

| #    | Si el parcial dice…                                  | Qué cambia                                                          |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| 11.1 | «solo se puede disminuir la cantidad de una reserva» | `if (difference > 0)` → 400; sin validar cupos ni límite            |
| 11.2 | «solo el dueño puede modificar su reserva»           | Sin `isAdmin`: `if (reservation.user.id !== currentUser.id)`        |
| 11.3 | «se permite cambiar la reserva a otro evento»        | DTO con `eventId` opcional; devolver al viejo y descontar del nuevo |

<details>
<summary><b>11.1 «solo se puede disminuir la cantidad de una reserva»</b></summary>

**Service:**

```typescript
async update(id: number, updateReservationDto: UpdateReservationDto, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { user: true, event: true },
        });
        if (!reservation) {
            throw new NotFoundException('Reserva no encontrada');
        }
        const isAdmin = currentUser.role?.name === 'admin';
        if (!isAdmin && reservation.user.id !== currentUser.id) {
            throw new ForbiddenException('Esta reserva no te pertenece'); // ADMIN o dueño
        }
        if (reservation.status === ReservationStatus.CANCELLED) {
            throw new ConflictException('No se puede modificar una reserva cancelada');
        }
        const event = reservation.event;
        if (new Date(event.date) <= new Date()) {
            throw new BadRequestException('No se puede modificar: el evento ya ocurrió');
        }
        const difference = updateReservationDto.quantity - reservation.quantity;
        // 🔄 CAMBIO: "solo disminuir" → si pide más, 400 (ya no hace falta cupos ni límite)
        if (difference > 0) {
            throw new BadRequestException('Solo puedes disminuir la cantidad de la reserva');
        }

        event.availableSpots -= difference; // diferencia negativa = devuelve cupos
        await manager.save(event);
        reservation.quantity = updateReservationDto.quantity;
        return await manager.save(reservation);
    });
}
```

</details>

<details>
<summary><b>11.2 «solo el dueño puede modificar su reserva»</b></summary>

**Service:**

```typescript
async update(id: number, updateReservationDto: UpdateReservationDto, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { user: true, event: true },
        });
        if (!reservation) {
            throw new NotFoundException('Reserva no encontrada');
        }
        // 🔄 CAMBIO: sin admin → solo el dueño
        if (reservation.user.id !== currentUser.id) {
            throw new ForbiddenException('Esta reserva no te pertenece');
        }
        if (reservation.status === ReservationStatus.CANCELLED) {
            throw new ConflictException('No se puede modificar una reserva cancelada');
        }
        const event = reservation.event;
        if (new Date(event.date) <= new Date()) {
            throw new BadRequestException('No se puede modificar: el evento ya ocurrió');
        }
        // diferencia: + pide más cupos, − devuelve cupos
        const difference = updateReservationDto.quantity - reservation.quantity;
        if (difference > event.availableSpots) {
            throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
        }
        // máximo 5: sus otras activas (SIN esta) + la nueva cantidad
        const activeReservations = await manager.find(Reservation, {
            where: {
                user: { id: reservation.user.id },
                event: { id: event.id },
                status: ReservationStatus.ACTIVE,
            },
        });
        const otherSpots = activeReservations.reduce((total, r) => total + r.quantity, 0) - reservation.quantity;
        if (otherSpots + updateReservationDto.quantity > 5) {
            throw new BadRequestException(
                `Solo puedes tener ${5 - otherSpots} cupos en esta reserva (máximo 5 por usuario)`,
            );
        }

        event.availableSpots -= difference; // diferencia negativa = devuelve cupos
        await manager.save(event);
        reservation.quantity = updateReservationDto.quantity;
        return await manager.save(reservation);
    });
}
```

</details>

<details>
<summary><b>11.3 «se permite cambiar la reserva a otro evento»</b></summary>

**DTO (`update-reservation.dto.ts`):**

```typescript
// 🔄 CAMBIO: eventId y quantity opcionales
export class UpdateReservationDto extends PartialType(CreateReservationDto) {}
```

**Service:**

```typescript
async update(id: number, updateReservationDto: UpdateReservationDto, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { user: true, event: true },
        });
        if (!reservation) {
            throw new NotFoundException('Reserva no encontrada');
        }
        const isAdmin = currentUser.role?.name === 'admin';
        if (!isAdmin && reservation.user.id !== currentUser.id) {
            throw new ForbiddenException('Esta reserva no te pertenece');
        }
        if (reservation.status === ReservationStatus.CANCELLED) {
            throw new ConflictException('No se puede modificar una reserva cancelada');
        }
        const oldEvent = reservation.event;
        if (new Date(oldEvent.date) <= new Date()) {
            throw new BadRequestException('No se puede modificar: el evento ya ocurrió');
        }

        // 🔄 CAMBIO: evento destino = el nuevo si vino, si no el mismo
        const changesEvent = updateReservationDto.eventId && updateReservationDto.eventId !== oldEvent.id;
        const targetEvent = changesEvent
            ? await manager.findOneBy(Event, { id: updateReservationDto.eventId })
            : oldEvent;
        if (!targetEvent) {
            throw new NotFoundException('No se encuentra el evento que buscas');
        }
        if (!targetEvent.isActive || new Date(targetEvent.date) <= new Date()) {
            throw new BadRequestException('El evento no está disponible');
        }

        // quantity nueva o la que ya tenía
        const newQuantity = updateReservationDto.quantity ?? reservation.quantity;

        // 🔄 CAMBIO: devolver TODO al viejo y luego ver si el destino alcanza
        oldEvent.availableSpots += reservation.quantity;
        if (targetEvent.availableSpots < newQuantity) {
            throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
        }

        // máximo 5 en el evento destino (sin contar esta reserva)
        const activeReservations = await manager.find(Reservation, {
            where: {
                user: { id: reservation.user.id },
                event: { id: targetEvent.id },
                status: ReservationStatus.ACTIVE,
            },
        });
        const otherSpots = activeReservations
            .filter((r) => r.id !== reservation.id)
            .reduce((total, r) => total + r.quantity, 0);
        if (otherSpots + newQuantity > 5) {
            throw new BadRequestException(`Solo puedes tener ${5 - otherSpots} cupos en ese evento (máximo 5)`);
        }

        targetEvent.availableSpots -= newQuantity; // descontar del destino
        await manager.save(oldEvent);
        if (changesEvent) {
            await manager.save(targetEvent);
        }
        reservation.event = targetEvent;
        reservation.quantity = newQuantity;
        return await manager.save(reservation);
    });
}
```

</details>

---

## 12. Eliminar reserva + tabla de errores

**📌 Pre-parcial:** _`DELETE /reservations/:id` (solo admin: `delete_reservation`)_

**Controller:**

```typescript
@Delete(':id')
@HttpCode(HttpStatus.OK)
@Permissions('delete_reservation')
remove(@Param('id', ParseIntPipe) id: number) {
    return this.reservationService.remove(id);
}
```

**Service:**

```typescript
async remove(id: number) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { event: true },
        });
        if (!reservation) {
            throw new NotFoundException(`Reserva con id ${id} no encontrada`);
        }
        // activa → sus cupos vuelven (cancelada ya los devolvió)
        if (reservation.status === ReservationStatus.ACTIVE) {
            reservation.event.availableSpots += reservation.quantity;
            await manager.save(reservation.event);
        }
        await manager.delete(Reservation, id);
        return { message: 'Reserva eliminada correctamente' };
    });
}
```

- 🧪 Admin borra la 999 → **404** · borra una activa → el evento recupera los cupos.

### 🔄 Si el parcial lo cambia

| #    | Si el parcial dice…                              | Qué cambia                                |
| ---- | ------------------------------------------------ | ----------------------------------------- |
| 12.1 | «solo se pueden eliminar reservas canceladas»    | Activa → 409 (y ya no se devuelven cupos) |
| 12.2 | «el usuario puede eliminar sus propias reservas» | `req.user!` + ADMIN o dueño (403)         |

<details>
<summary><b>12.1 «solo se pueden eliminar reservas canceladas»</b></summary>

**Service:**

```typescript
async remove(id: number) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { event: true },
        });
        if (!reservation) {
            throw new NotFoundException(`Reserva con id ${id} no encontrada`);
        }
        // 🔄 CAMBIO: activa → 409 (primero hay que cancelarla)
        if (reservation.status === ReservationStatus.ACTIVE) {
            throw new ConflictException('Solo se pueden eliminar reservas canceladas');
        }
        await manager.delete(Reservation, id);
        return { message: 'Reserva eliminada correctamente' };
    });
}
```

</details>

<details>
<summary><b>12.2 «el usuario puede eliminar sus propias reservas»</b></summary>

**Controller:**

```typescript
@Delete(':id')
@HttpCode(HttpStatus.OK)
@Permissions('delete_reservation') // ⚠️ en el seed: dáselo también al rol user
remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.reservationService.remove(id, req.user!); // 🔄 CAMBIO: pasa el usuario
}
```

**Service:**

```typescript
async remove(id: number, currentUser: User) {
    return await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
            where: { id },
            relations: { event: true, user: true },
        });
        if (!reservation) {
            throw new NotFoundException(`Reserva con id ${id} no encontrada`);
        }
        // 🔄 CAMBIO: ADMIN o dueño
        const isAdmin = currentUser.role?.name === 'admin';
        if (!isAdmin && reservation.user.id !== currentUser.id) {
            throw new ForbiddenException('Esta reserva no te pertenece');
        }
        if (reservation.status === ReservationStatus.ACTIVE) {
            reservation.event.availableSpots += reservation.quantity;
            await manager.save(reservation.event);
        }
        await manager.delete(Reservation, id);
        return { message: 'Reserva eliminada correctamente' };
    });
}
```

</details>

### Tabla de errores: frase → código

| Frase / situación                                              | Excepción             | Código |
| -------------------------------------------------------------- | --------------------- | ------ |
| Datos inválidos, fecha pasada, sin cupos, límite superado      | `BadRequestException` | 400    |
| Sin token / token inválido                                     | (lo hace `AuthGuard`) | 401    |
| Sin permiso / no es el dueño                                   | `ForbiddenException`  | 403    |
| "debe existir" y no existe                                     | `NotFoundException`   | 404    |
| Ya estaba así (cancelada, desactivado), duplicado, tiene hijos | `ConflictException`   | 409    |
| ❌ Nunca: error sin controlar                                  | —                     | 500    |

---

## ❌ Errores que ya cometí (no repetir)

| Error                                                                   | Síntoma                                | Arreglo                                                     |
| ----------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `@Get('user')` después de `@Get(':id')`                                 | 400 _"numeric string is expected"_     | Rutas fijas **antes** de `:id`                              |
| Permiso con otro nombre (`cancel_reservations` vs `cancel_reservation`) | 403 siempre                            | Copiar el nombre **exacto** del seed                        |
| Método sin `@Permissions`                                               | Cualquiera con token entra             | `@Permissions` en **cada** método                           |
| `req.user` sin `!`                                                      | TS2345 _"User \| undefined"_           | `req.user!`                                                 |
| `findOneBy` / `findOne` sin `relations`                                 | `.user` / `.event` undefined → 500     | `findOne({ where, relations: { user: true } })`             |
| `findOne` sin `if (!x)`                                                 | 200 con body vacío                     | `throw new NotFoundException(...)`                          |
| Copiar el `count` de "eliminar padre" para borrar el hijo               | 409 siempre                            | Hijo: buscar → 404 → devolver cupos → `delete`              |
| `update` sin ajustar cupos                                              | `availableSpots` desordenado           | Usar la **diferencia** (sección 11)                         |
| `PartialType(CreateDto)` en el update de reserva                        | Deja cambiar `eventId`                 | `PickType(CreateDto, ['quantity'])`                         |
| `manager.save(Reservation)` en vez de `manager.save(event)`             | No guarda los cupos                    | Guardar el **objeto** que cambiaste                         |
| `const Event = ...` (variable con nombre de la clase)                   | TS2448 _"used before its declaration"_ | Variables en minúscula: `const event`                       |
| `this.EventService` (mayúscula)                                         | _"Property does not exist"_            | El nombre del constructor: `this.eventService`              |
| Importar `DataSource` y no inyectarlo                                   | `this.dataSource` no existe            | `private readonly dataSource: DataSource` en el constructor |
| Copiar nombres de la receta (`owner`, `createExampleDto`)               | Errores de nombre / 500                | Traducir con la tabla de arriba                             |
| Cmd+Z de más y guardar                                                  | Vuelve código viejo                    | Cmd+Shift+Z antes de guardar                                |
