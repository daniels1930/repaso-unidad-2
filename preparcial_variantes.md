# Pre-parcial resuelto + variantes (abrí esto primero)

> El código de cada sección es **el pre-parcial Eventos / Reservas resuelto y probado**.
> Debajo de cada uno: **qué cambiar si el parcial lo pide distinto**.
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

```typescript
@Controller('reservations')
@UseGuards(AuthGuard('jwt'), PermissionsGuard) // protege TODOS los métodos
export class ReservationController {
    @Get()
    @HttpCode(HttpStatus.OK)
    @Permissions('read_reservations') // nombre EXACTO del seed (singular/plural importa)
    findAll() {
        return this.reservationService.findAll();
    }
}
```

- `@UseGuards` en la clase (y si querés, repetido en cada método: no falla).
- `@Permissions(...)` en **cada** método. Sin él → cualquiera con token entra.

**🔄 Si te lo cambian:**

| Si dice…                                        | Cambiá…                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| "este endpoint es **público**" (sin login)      | Guards en **cada método** (no en la clase) y a ese no le pongas nada               |
| "necesita **dos** permisos"                     | `@Permissions('read_event', 'update_event')` → tu guard exige TODOS (AND)          |
| "**cualquiera** de dos permisos"                | Guard OR → bloque 61 de `metodos_nestjs.md`                                        |
| "solo el rol ADMIN" (roles, no permisos)        | `@Roles('admin')` + `RolesGuard` → bloque 47                                       |
| "solo usuarios autenticados" (sin permiso fijo) | Solo los guards, sin `@Permissions` (tu guard deja pasar si no hay `@Permissions`) |

**🧪 Probar:** sin token → **401** · Ana en algo de admin → **403**.

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

**📌 Pre-parcial:** _"fecha futura"_ + _"inicializar `availableSpots` con `capacity`"_

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

**🔄 Si te lo cambian:**

| Si dice…                                     | Cambiá…                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| "al menos **N días** en el futuro"           | `const min = new Date(); min.setDate(min.getDate() + N);` y `if (new Date(dto.date) < min)` → 400 |
| "dentro de los próximos **N días**" (máximo) | `const max = new Date(); max.setDate(max.getDate() + N);` y `if (new Date(dto.date) > max)` → 400 |
| "el **nombre** no se puede repetir"          | `if (await this.eventRepository.existsBy({ name: dto.name }))` → 409 `ConflictException`          |
| "stock / cupos iniciales = otro campo"       | Igual: `stock: createProductDto.initialStock`                                                     |
| "el creador es el usuario autenticado"       | Recibí `currentUser: User` (sección 2) y agregá `createdBy: currentUser` en el `create({...})`    |

**🧪 Probar:** admin con fecha pasada → **400** · Ana crea → **403**.

---

## 4. Actualizar evento

**📌 Pre-parcial:** _"si se modifica la fecha, debe seguir siendo futura"_ + _"capacidad no menor a lo reservado"_

```typescript
// "si se modifica la fecha" → && = solo si vino
if (updateEventDto.date && new Date(updateEventDto.date) <= new Date()) {
    throw new BadRequestException('La fecha debe ser futura');
}
const reservedSpots = event.capacity - event.availableSpots; // ya reservados
if (updateEventDto.capacity !== undefined) {
    if (updateEventDto.capacity < reservedSpots) {
        throw new BadRequestException(
            `La capacidad no puede ser inferior a los ${reservedSpots} lugares ya reservados`,
        );
    }
    event.availableSpots = updateEventDto.capacity - reservedSpots; // recalcular
}
return await this.eventRepository.save({ ...event, ...updateEventDto }); // viejo + nuevo
```

**🔄 Si te lo cambian:**

| Si dice…                                             | Cambiá…                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| "no se puede modificar un evento **inactivo**"       | Después del 404: `if (!event.isActive)` → 400                                    |
| "no se puede modificar si **ya ocurrió**"            | Después del 404: `if (new Date(event.date) <= new Date())` → 400                 |
| "no se puede cambiar la fecha si **tiene reservas**" | `if (updateEventDto.date && reservedSpots > 0)` → 409                            |
| "el campo X **no** se puede modificar"               | DTO: `extends PartialType(OmitType(CreateEventDto, ['x'] as const))` → bloque 75 |

---

## 5. Desactivar evento

**📌 Pre-parcial:** _"solo se permite si el evento no tiene reservas activas"_

```typescript
if (!event.isActive) {
    throw new ConflictException('Este evento ya esta desactivado'); // ya estaba → 409
}
const activeDependents = await this.reservationRepository.count({
    where: { event: { id }, status: ReservationStatus.ACTIVE }, // solo ACTIVAS
});
if (activeDependents > 0) {
    throw new ConflictException('No se puede desactivar: el evento tiene reservas activas.');
}
event.isActive = false;
await this.eventRepository.save(event);
return { message: 'Evento desactivado' };
```

**🔄 Si te lo cambian:**

| Si dice…                                         | Cambiá…                                               |
| ------------------------------------------------ | ----------------------------------------------------- |
| "**activar** evento"                             | `if (event.isActive)` → 409 y `event.isActive = true` |
| "activar / desactivar con el **mismo** endpoint" | Quitá los `if` y `event.isActive = !event.isActive`   |
| "al desactivar se **cancelan** sus reservas"     | En vez del 409: el bloque de abajo                    |

```typescript
// "al desactivar se cancelan sus reservas" → cancelar todas y devolver cupos
const active = await this.reservationRepository.find({
    where: { event: { id }, status: ReservationStatus.ACTIVE },
});
active.forEach((r) => (r.status = ReservationStatus.CANCELLED));
await this.reservationRepository.save(active); // save de una lista = guarda todas
event.availableSpots = event.capacity; // todos los cupos vuelven
event.isActive = false;
await this.eventRepository.save(event);
```

**🧪 Probar:** permiso `deactivate_event` (no `update_event`) · evento 1 (tiene activas) → **409**.

---

## 6. Eliminar evento

**📌 Pre-parcial:** _"se debe validar la existencia del evento"_ (+ sin 500 por FK)

```typescript
const dependentCount = await this.reservationRepository.count({
    where: { event: { id } }, // TODAS (activas y canceladas)
});
if (dependentCount > 0) {
    throw new ConflictException('No se puede eliminar: el evento tiene reservas.'); // evita 500 por FK
}
await this.eventRepository.delete(id);
return { message: 'Este evento ha sido eliminado' };
```

- Este `count` es para borrar al **PADRE**. Para borrar al **HIJO** (reserva) no va → sección 12.

**🔄 Si te lo cambian:**

| Si dice…                                    | Cambiá…                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| "no eliminar si tiene reservas **activas**" | Agregá `status: ReservationStatus.ACTIVE` al `where`, y antes del `delete` borrá las canceladas: `find` + `remove(lista)` |
| "al eliminar, se eliminan sus reservas"     | `onDelete: 'CASCADE'` en el `@ManyToOne` de la reserva → bloque 78                                                        |
| "no borrar, solo **marcar** como eliminado" | Soft delete → bloque 65                                                                                                   |

---

## 7. Crear reserva

**📌 Pre-parcial:** _"existe, activo, no ocurrió, no exceder cupos, máximo 5 cupos activos por evento, descontar cupos"_

Orden de los `if` (todo dentro de `this.dataSource.transaction(async (manager) => {...})`):

```typescript
const event = await manager.findOneBy(Event, { id: createReservationDto.eventId });
if (!event) throw new NotFoundException('No se encuentra el evento que buscas'); // existe
if (!event.isActive) throw new BadRequestException('El evento no está activo'); // activo
if (new Date(event.date) <= new Date()) throw new BadRequestException('El evento ya ocurrió'); // no ocurrió
if (event.availableSpots < createReservationDto.quantity) {
    throw new BadRequestException('No hay suficientes cupos disponibles para este evento'); // cupos
}

// "máximo 5 por usuario" → SUMAR quantity de sus activas en este evento
const activeReservations = await manager.find(Reservation, {
    where: { user: { id: currentUser.id }, event: { id: event.id }, status: ReservationStatus.ACTIVE },
});
const activeSpots = activeReservations.reduce((total, reservation) => total + reservation.quantity, 0);
if (activeSpots + createReservationDto.quantity > 5) {
    throw new BadRequestException(
        `Solo puedes reservar ${5 - activeSpots} cupos más para este evento (máximo 5 por usuario)`,
    );
}

event.availableSpots -= createReservationDto.quantity; // descontar
await manager.save(event); // se guarda el EVENTO

const newReservation = manager.create(Reservation, {
    quantity: createReservationDto.quantity,
    event, // objeto, no id
    user: currentUser, // del token
    status: ReservationStatus.ACTIVE,
});
return await manager.save(newReservation);
```

**🔄 Si te lo cambian:**

| Si dice…                                          | Cambiá…                                                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| "máximo N **reservas**" (no cupos)                | `const count = await manager.count(Reservation, { where: {...igual} })` y `if (count >= N)`         |
| "máximo N cupos **en total**" (todos los eventos) | Quitá `event: { id: event.id }` del `where`                                                         |
| "el ADMIN **no** tiene límite"                    | `const isAdmin = currentUser.role?.name === 'admin';` y envolvé el `if` en `if (!isAdmin) {...}`    |
| "no puede reservar **dos veces** el mismo evento" | `count` de sus activas en el evento; `if (count > 0)` → 409 `ConflictException`                     |
| "máximo N cupos **por reserva**"                  | En el DTO: `@Max(N)` sobre `quantity` (no en el service)                                            |
| "cada reserva es de **1** cupo" (sin `quantity`)  | `availableSpots < 1` y `availableSpots -= 1`                                                        |
| "solo eventos de los próximos N días"             | `const max = new Date(); max.setDate(max.getDate() + N);` y `if (new Date(event.date) > max)` → 400 |

**🧪 Probar:** Ana, evento 1, 3 cupos → **400** (ya tiene 3) · evento 4 → **400** (ya ocurrió) · evento 999 → **404**.

---

## 8. Cancelar reserva

**📌 Pre-parcial:** _"existe, pertenece al usuario, no cancelada antes, evento no ocurrido, liberar cupos, `CANCELLED`"_

```typescript
const reservation = await manager.findOne(Reservation, {
    where: { id },
    relations: { user: true, event: true }, // sin esto .user / .event = undefined → 500
});
if (!reservation) throw new NotFoundException('Reserva no encontrada');
if (reservation.user.id !== currentUser.id) throw new ForbiddenException('Esta reserva no te pertenece'); // dueño
if (reservation.status === ReservationStatus.CANCELLED) throw new ConflictException('Esta reserva ya fue cancelada');
if (new Date(reservation.event.date) <= new Date()) {
    throw new BadRequestException('No se puede cancelar: el evento ya ocurrió');
}
reservation.event.availableSpots += reservation.quantity; // liberar (+=)
await manager.save(reservation.event);
reservation.status = ReservationStatus.CANCELLED; // no se borra, cambia estado
await manager.save(reservation);
return { message: 'Reserva cancelada correctamente' };
```

**🔄 Si te lo cambian:**

| Si dice…                              | Cambiá…                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| "el ADMIN **también** puede cancelar" | `const isAdmin = currentUser.role?.name === 'admin';` y `if (!isAdmin && reservation.user.id !== currentUser.id)`         |
| "hasta **N horas antes** del evento"  | `const limit = new Date(reservation.event.date); limit.setHours(limit.getHours() - N);` y `if (new Date() > limit)` → 400 |
| "cancelar = **borrar**"               | En vez de cambiar `status`: `await manager.delete(Reservation, id)`                                                       |
| "guardar **cuándo** se canceló"       | Columna `cancelledAt` (nullable) en la entity y `reservation.cancelledAt = new Date()`                                    |

**🧪 Probar:** Carlos cancela la 1 (de Ana) → **403** · cancelar dos veces → **409** · reserva 4 (evento pasado) → **400**.

---

## 9. Mis reservas (`GET /user`)

**📌 Pre-parcial:** _"retorna únicamente las reservas del usuario autenticado"_

```typescript
// controller — ⚠️ @Get('user') va ANTES de @Get(':id')
@Get('user')
@Permissions('read_own_reservations')
findMine(@Req() req: AuthenticatedRequest) {
    return this.reservationService.findMine(req.user!);
}

// service
async findMine(currentUser: User) {
    return await this.reservationRepository.find({
        where: { user: { id: currentUser.id } }, // filtro por relación
        relations: { event: true }, // ver de qué evento es
    });
}
```

**🔄 Si te lo cambian:**

| Si dice…                                      | Cambiá…                                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| "filtrar por **estado**" (`?status=ACTIVE`)   | Controller: `@Query('status') status?: ReservationStatus` · where: `{ user: {...}, ...(status && { status }) }` |
| "solo las **activas**"                        | Agregá `status: ReservationStatus.ACTIVE` al `where`                                                            |
| "solo de eventos **futuros**"                 | `event: { date: MoreThan(new Date()) }` en el `where` (import `MoreThan` de `typeorm`)                          |
| "**ordenadas** por fecha (recientes primero)" | `order: { createdAt: 'DESC' }`                                                                                  |
| "el ADMIN ve las de **cualquier** usuario"    | `@Get('user/:userId')` + `@Param('userId', ParseIntPipe)` y `where: { user: { id: userId } }`                   |

**🧪 Probar:** Ana → solo las suyas (1, 4, 5) · si da **400 "numeric string is expected"** → la ruta está después de `:id`.

---

## 10. Ver una (ADMIN o dueño)

**📌 Pre-parcial:** _"`GET /reservations/:id`: recurso para ADMIN o propietario de la reserva"_

```typescript
async findOne(id: number, currentUser: User) {
    const reservation = await this.reservationRepository.findOne({
        where: { id },
        relations: { user: true, event: true }, // user → para saber el dueño
    });
    if (!reservation) throw new NotFoundException(`Reserva con id ${id} no encontrada`);

    const isAdmin = currentUser.role?.name === 'admin'; // nombre del rol en el seed
    const isOwner = reservation.user.id === currentUser.id;
    if (!isAdmin && !isOwner) throw new ForbiddenException('No tienes acceso a esta reserva'); // ninguno → 403
    return reservation;
}
```

**🔄 Si te lo cambian:**

| Si dice…                       | Cambiá…                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| "solo el **dueño**"            | Quitá `isAdmin`: `if (!isOwner)`                             |
| "solo **ADMIN**"               | No hace falta `req.user`: con el permiso alcanza (sección 1) |
| "**no mostrar** la contraseña" | Antes del `return`: el bloque de abajo                       |

```typescript
// "no exponer datos sensibles" → devolver solo lo necesario del user
const { id: userId, username, email } = reservation.user;
return { ...reservation, user: { id: userId, username, email } };
```

**🧪 Probar:** Carlos ve la 1 → **403** · Ana ve la 1 → **200** · admin ve la 1 → **200** · 999 → **404**.

---

## 11. Actualizar reserva

**📌 Pre-parcial:** `PATCH /reservations/:id` con `{ "quantity" }`

```typescript
// DTO: SOLO quantity (PartialType dejaba cambiar eventId)
export class UpdateReservationDto extends PickType(CreateReservationDto, ['quantity'] as const) {}
```

```typescript
// service (dentro de la transacción, después del 404, dueño/ADMIN, cancelada y evento ocurrido)
const difference = updateReservationDto.quantity - reservation.quantity; // + pide más, − devuelve
if (difference > event.availableSpots) {
    throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
}
// máximo 5: sus otras activas (SIN esta) + la nueva cantidad
const activeReservations = await manager.find(Reservation, {
    where: { user: { id: reservation.user.id }, event: { id: event.id }, status: ReservationStatus.ACTIVE },
});
const otherSpots = activeReservations.reduce((total, r) => total + r.quantity, 0) - reservation.quantity;
if (otherSpots + updateReservationDto.quantity > 5) {
    throw new BadRequestException(`Solo puedes tener ${5 - otherSpots} cupos en esta reserva (máximo 5 por usuario)`);
}
event.availableSpots -= difference; // diferencia negativa = devuelve cupos
await manager.save(event);
reservation.quantity = updateReservationDto.quantity;
return await manager.save(reservation);
```

**🔄 Si te lo cambian:**

| Si dice…                         | Cambiá…                                                                     |
| -------------------------------- | --------------------------------------------------------------------------- |
| "solo se puede **disminuir**"    | `if (difference > 0)` → 400 (y ya no hace falta validar cupos ni el límite) |
| "solo el **dueño**" (sin ADMIN)  | `if (reservation.user.id !== currentUser.id)` → 403                         |
| "se puede **cambiar de evento**" | DTO con `eventId` opcional y el bloque de abajo                             |

```typescript
// "cambiar de evento" → devolver al viejo, validar y descontar del nuevo
if (updateReservationDto.eventId && updateReservationDto.eventId !== reservation.event.id) {
    const newEvent = await manager.findOneBy(Event, { id: updateReservationDto.eventId });
    if (!newEvent) throw new NotFoundException('No se encuentra el evento que buscas');
    if (!newEvent.isActive || new Date(newEvent.date) <= new Date()) {
        throw new BadRequestException('El evento no está disponible');
    }
    if (newEvent.availableSpots < reservation.quantity) {
        throw new BadRequestException('No hay suficientes cupos disponibles para este evento');
    }
    reservation.event.availableSpots += reservation.quantity; // devolver al viejo
    await manager.save(reservation.event);
    newEvent.availableSpots -= reservation.quantity; // descontar del nuevo
    await manager.save(newEvent);
    reservation.event = newEvent;
}
```

**🧪 Probar:** Ana 3 → 6 → **400** · 3 → 5 → evento baja 2 cupos · con `eventId` (DTO solo quantity) → **400** · cancelada → **409**.

---

## 12. Eliminar reserva + tabla de errores

**📌 Pre-parcial:** `DELETE /reservations/:id` (solo admin: `delete_reservation`)

```typescript
const reservation = await manager.findOne(Reservation, { where: { id }, relations: { event: true } });
if (!reservation) throw new NotFoundException(`Reserva con id ${id} no encontrada`);
// activa → sus cupos vuelven (cancelada ya los devolvió)
if (reservation.status === ReservationStatus.ACTIVE) {
    reservation.event.availableSpots += reservation.quantity;
    await manager.save(reservation.event);
}
await manager.delete(Reservation, id);
return { message: 'Reserva eliminada correctamente' };
```

**🔄 Si te lo cambian:**

| Si dice…                                   | Cambiá…                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| "solo se pueden borrar las **canceladas**" | `if (reservation.status === ReservationStatus.ACTIVE)` → 409 (y sin devolver) |
| "el **dueño** puede borrar la suya"        | Recibí `currentUser` + `if (!isAdmin && !isOwner)` → 403 (sección 10)         |

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
