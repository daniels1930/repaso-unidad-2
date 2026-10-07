# Ruta del parcial — qué hacer, en qué orden y qué archivo abrir

> Este archivo NO tiene código para copiar: es el **orden de trabajo**.
> En cada paso te dice qué hacer y **qué archivo abrir**. El código está
> en los otros archivos.

## 🔎 Buscador: frase del enunciado → dónde está

Cada regla del pre-parcial, copiada tal cual, con el link a la receta
(`recetas_parcial.md`) y al bloque (`metodos_nestjs.md`) donde está
resuelta.

> 💡 **Truco:** si tu parcial dice algo parecido pero no igual, usá
> `Cmd + F` en `recetas_parcial.md` y pegá un pedazo de la frase: cada
> receta tiene una línea **"Frases que la activan"**.

**Generales (todos los endpoints)**

| Frase del enunciado                                                                                           | Receta                                                                                          | Bloque                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _"deben estar limitados según los permisos del usuario ... `@UseGuards(AuthGuard('jwt'), PermissionsGuard)`"_ | [Molde: controllers](recetas_parcial.md#6-controllers-completos-con-el-orden-de-rutas-correcto) | [48](metodos_nestjs.md#48-proteger-un-endpoint-con-autenticación-jwt--autorización-permisos) · [101](metodos_nestjs.md#101-guards-una-vez-sobre-la-clase--permissions-en-cada-método)                                                                                                                       |
| _"debe responderse ... con un breve mensaje, evitando errores ... 500"_                                       | —                                                                                               | [26](metodos_nestjs.md#26-lanzar-errores-con-excepciones-de-nest-404-409-400-en-vez-de-throw-new-error) · [90](metodos_nestjs.md#90-responder-con-un-mensaje-breve--message-data--sin-exponer-datos-sensibles) · [44](metodos_nestjs.md#44-controller-con-trycatch-para-nunca-responder-un-500-sin-mensaje) |
| _"se debe tipar el request para acceder al usuario autenticado"_ (`AuthenticatedRequest`)                     | [Molde: AuthenticatedRequest](recetas_parcial.md#3-authenticatedrequest-y-módulos)              | [49](metodos_nestjs.md#49-tipar-y-usar-el-usuario-autenticado-authenticatedrequest)                                                                                                                                                                                                                         |
| _"DTOs ... validados cada campo ... class-validator"_                                                         | [Molde: DTOs](recetas_parcial.md#2-dtos)                                                        | [27](metodos_nestjs.md#27-validaciones-en-el-dto-con-class-validator) · [Paso 2](#paso-2--dtos-10)                                                                                                                                                                                                          |

**EventService**

| Frase del enunciado                                                                              | Receta                                                                                                         | Bloque                                                                                                              |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| _"La fecha del evento debe ser futura."_                                                         | [R1](recetas_parcial.md#r1-crear-evento-fecha-futura--availablespots--capacity)                                | [50](metodos_nestjs.md#50-crear-con-fecha-futura-e-inicializar-availablespots-con-capacity)                         |
| _"Inicializar `availableSpots` con el valor de `capacity` ... no debe incluir `availableSpots`"_ | [R1](recetas_parcial.md#r1-crear-evento-fecha-futura--availablespots--capacity)                                | [50](metodos_nestjs.md#50-crear-con-fecha-futura-e-inicializar-availablespots-con-capacity)                         |
| _"Si se modifica la fecha, debe seguir siendo futura."_                                          | [R5](recetas_parcial.md#r5-actualizar-evento-fecha-futura-si-se-modifica--capacidad-no-menor-a-los-reservados) | [82](metodos_nestjs.md#82-actualizar-evento-fecha-futura-si-se-modifica--capacidad-no-menor-a-los-cupos-reservados) |
| _"Si se modifica la capacidad, no puede ser menor al número de cupos ya reservados."_            | [R5](recetas_parcial.md#r5-actualizar-evento-fecha-futura-si-se-modifica--capacidad-no-menor-a-los-reservados) | [82](metodos_nestjs.md#82-actualizar-evento-fecha-futura-si-se-modifica--capacidad-no-menor-a-los-cupos-reservados) |
| _"Desactivar evento: Solo se permite si el evento no tiene reservas activas."_                   | [V6](recetas_parcial.md#v6-desactivar-evento-solo-sin-reservas-activas)                                        | [83](metodos_nestjs.md#83-desactivar-evento-solo-si-no-tiene-reservas-activas-sin-toggle)                           |
| _"Eliminar evento: Se debe validar la existencia del evento."_                                   | [V5](recetas_parcial.md#v5-eliminar-evento-o-reserva-validar-existencia--mensaje)                              | [89](metodos_nestjs.md#89-eliminar-evento-o-reserva-validar-que-exista-sin-500-por-fk-y-con-mensaje-propio)         |

**ReservationService — Crear reserva**

| Frase del enunciado                                                 | Receta                                                                                      | Bloque                                                                                                                                                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _"El evento debe existir."_                                         | [V1](recetas_parcial.md#v1-crear-reserva-existe-activo-no-ocurrió-cupos-límite-y-descontar) | [85](metodos_nestjs.md#85-crear-reserva-completa-evento-existe-activo-no-ocurrió-cupos-límite-y-descontar) · [2](metodos_nestjs.md#2-crear-un-registro-que-pertenece-a-otra-entidad-buscar-el-relacionado-por-id--404)  |
| _"El evento debe estar activo."_                                    | [V1](recetas_parcial.md#v1-crear-reserva-existe-activo-no-ocurrió-cupos-límite-y-descontar) | [85](metodos_nestjs.md#85-crear-reserva-completa-evento-existe-activo-no-ocurrió-cupos-límite-y-descontar)                                                                                                              |
| _"El evento no debe haber ocurrido."_                               | [V1](recetas_parcial.md#v1-crear-reserva-existe-activo-no-ocurrió-cupos-límite-y-descontar) | [85](metodos_nestjs.md#85-crear-reserva-completa-evento-existe-activo-no-ocurrió-cupos-límite-y-descontar) · [51](metodos_nestjs.md#51-validar-que-el-evento-no-haya-ocurrido-y-sea-dentro-de-los-próximos-n-días)      |
| _"No se deben exceder los cupos disponibles (`availableSpots`)."_   | [V1](recetas_parcial.md#v1-crear-reserva-existe-activo-no-ocurrió-cupos-límite-y-descontar) | [85](metodos_nestjs.md#85-crear-reserva-completa-evento-existe-activo-no-ocurrió-cupos-límite-y-descontar) · [52](metodos_nestjs.md#52-descontar-cupos-al-reservar-y-devolverlos-al-cancelar-no-exceder-availablespots) |
| _"Límite por usuario: máximo 5 cupos activos por evento."_          | [V1](recetas_parcial.md#v1-crear-reserva-existe-activo-no-ocurrió-cupos-límite-y-descontar) | [84](metodos_nestjs.md#84-límite-por-usuario-sumando-cupos-activos-ej-máximo-5-cupos-por-evento)                                                                                                                        |
| _"Al crear una reserva, se deben descontar los cupos disponibles."_ | [V1](recetas_parcial.md#v1-crear-reserva-existe-activo-no-ocurrió-cupos-límite-y-descontar) | [85](metodos_nestjs.md#85-crear-reserva-completa-evento-existe-activo-no-ocurrió-cupos-límite-y-descontar) · [52](metodos_nestjs.md#52-descontar-cupos-al-reservar-y-devolverlos-al-cancelar-no-exceder-availablespots) |

**ReservationService — Cancelar reserva**

| Frase del enunciado                                                               | Receta                                                                                              | Bloque                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _"La reserva debe existir."_                                                      | [V2](recetas_parcial.md#v2-cancelar-o-devolver-reserva-dueño-no-cancelada-no-ocurrió-liberar-cupos) | [86](metodos_nestjs.md#86-cancelar-reserva-completa-dueño-no-cancelada-evento-no-ocurrido-liberar-cupos-y-cancelled)                                                                                                              |
| _"Debe pertenecer al usuario autenticado."_                                       | [V2](recetas_parcial.md#v2-cancelar-o-devolver-reserva-dueño-no-cancelada-no-ocurrió-liberar-cupos) | [86](metodos_nestjs.md#86-cancelar-reserva-completa-dueño-no-cancelada-evento-no-ocurrido-liberar-cupos-y-cancelled) · [91](metodos_nestjs.md#91-validar-dueño-o-admin-en-un-método-reutilizable-findownedorfail)                 |
| _"No se puede cancelar una reserva previamente cancelada."_                       | [V2](recetas_parcial.md#v2-cancelar-o-devolver-reserva-dueño-no-cancelada-no-ocurrió-liberar-cupos) | [86](metodos_nestjs.md#86-cancelar-reserva-completa-dueño-no-cancelada-evento-no-ocurrido-liberar-cupos-y-cancelled)                                                                                                              |
| _"No se puede cancelar si el evento ya ocurrió."_                                 | [V2](recetas_parcial.md#v2-cancelar-o-devolver-reserva-dueño-no-cancelada-no-ocurrió-liberar-cupos) | [86](metodos_nestjs.md#86-cancelar-reserva-completa-dueño-no-cancelada-evento-no-ocurrido-liberar-cupos-y-cancelled)                                                                                                              |
| _"Al cancelar, se deben liberar los cupos y actualizar el estado a `CANCELLED`."_ | [V2](recetas_parcial.md#v2-cancelar-o-devolver-reserva-dueño-no-cancelada-no-ocurrió-liberar-cupos) | [86](metodos_nestjs.md#86-cancelar-reserva-completa-dueño-no-cancelada-evento-no-ocurrido-liberar-cupos-y-cancelled) · [52](metodos_nestjs.md#52-descontar-cupos-al-reservar-y-devolverlos-al-cancelar-no-exceder-availablespots) |

**ReservationService — Consultas y el resto de endpoints**

| Frase del enunciado                                                                    | Receta                                                                                                                       | Bloque                                                                                                                                                                        |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _"`GET /reservations/user`: retorna únicamente las reservas del usuario autenticado."_ | [R4](recetas_parcial.md#r4-mis-reservas-get-user-solo-las-del-usuario-del-token)                                             | [49](metodos_nestjs.md#49-tipar-y-usar-el-usuario-autenticado-authenticatedrequest)                                                                                           |
| _"`GET /reservations/:id`: recurso para ADMIN o propietario de la reserva."_           | [Molde: service del booking](recetas_parcial.md#5-service-del-booking)                                                       | [55](metodos_nestjs.md#55-ver-un-registro-solo-si-es-admin-o-el-dueño-403-si-no) · [91](metodos_nestjs.md#91-validar-dueño-o-admin-en-un-método-reutilizable-findownedorfail) |
| `PATCH /reservations/:id` (Actualizar reserva por id)                                  | [V3](recetas_parcial.md#v3-actualizar-reserva-cambiar-la-cantidad)                                                           | [87](metodos_nestjs.md#87-actualizar-reserva-cambiar-la-cantidad-ajustando-los-cupos-del-evento)                                                                              |
| `DELETE /reservations/:id` (Borrar reserva)                                            | [V5](recetas_parcial.md#v5-eliminar-evento-o-reserva-validar-existencia--mensaje)                                            | [89](metodos_nestjs.md#89-eliminar-evento-o-reserva-validar-que-exista-sin-500-por-fk-y-con-mensaje-propio)                                                                   |
| `GET` / `GET :id` de eventos y reservas (listar / ver uno)                             | [R3](recetas_parcial.md#r3-listar-eventos-paginación-filtros-y-buscador) · [Molde](recetas_parcial.md#4-service-del-recurso) | [5](metodos_nestjs.md#5-buscar-todos-trayendo-la-relación-join) · [7](metodos_nestjs.md#7-buscar-uno-por-id)                                                                  |
| _"filtrar entre dos fechas"_ (si tu versión del parcial lo pide)                       | [V4](recetas_parcial.md#v4-filtrar-reservas-entre-dos-fechas)                                                                | [88](metodos_nestjs.md#88-filtrar-entre-dos-fechas-recibidas-por-query-validadas-y-con-el-día-final-incluido)                                                                 |

---

## 🗂️ Qué archivo abrir para qué

| Archivo               | Abrilo cuando...                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `ruta_parcial.md`     | Al empezar y cada vez que no sepas qué sigue (este archivo)                                  |
| `recetas_parcial.md`  | Vas a escribir un endpoint: buscás la receta, la copiás y la renombrás                       |
| `validaciones_dto.md` | Estás armando un DTO y necesitás el decorador de `class-validator` para un campo             |
| `metodos_nestjs.md`   | Necesitás una pieza suelta (un filtro, un operador) o algo falla (trampas)                   |
| `auth.md`             | Solo si te piden TOCAR la autenticación (login, JwtStrategy). Si ya viene hecha, no la abras |

---

## ⏱️ Prioridades según la rúbrica

| Criterio                    | Peso | Cómo se ganan esos puntos                                            | Cuándo  |
| --------------------------- | ---- | -------------------------------------------------------------------- | ------- |
| DTOs y validaciones         | 10%  | Cada campo con su decorador y mensaje                                | Paso 2  |
| Event (controller + reglas) | 25%  | Crear, actualizar, desactivar, eliminar con sus reglas               | Paso 3  |
| Reservation                 | 30%  | Crear (todas las reglas) y cancelar son lo que más pesa              | Paso 3  |
| Seguridad                   | 15%  | Guards + `@Permissions` en TODOS los endpoints, usuario del token    | Paso 4  |
| Excepciones                 | 10%  | 404 / 400 / 403 / 409 correctos, nunca un 500                        | Paso 3  |
| Calidad                     | 10%  | Lógica en el service, controller delgado, nombres claros, sin basura | Siempre |

**Consejos de tiempo:**

- La seguridad (15%) y los DTOs (10%) son puntos RÁPIDOS: no los dejes para el final.
- Reservation pesa más que Event: si se te acaba el tiempo, que `crear reserva` y `cancelar reserva` estén completos.
- Un endpoint simple que funciona vale más que uno "perfecto" que no compila. Andá compilando seguido (`npm run start:dev` lo muestra al guardar).

---

## Paso 0 — Leer y preparar (antes de escribir una línea)

1. **Leé TODO el enunciado** y marcá tres cosas:
    - cada endpoint (verbo + ruta),
    - cada regla (_"debe"_, _"no puede"_, _"solo si"_, _"máximo"_),
    - cada mensaje literal (_"Reservation cancelled..."_, _"Este evento ha sido eliminado"_).
2. **Abrí las entities que te dan** y anotá los nombres EXACTOS de campos y relaciones. Con eso armás tu diccionario: [`recetas_parcial.md` → Diccionario de nombres](recetas_parcial.md#-diccionario-de-nombres).
3. **Abrí `db/insert.sql`:** nombres exactos de los permisos y de los roles (¿el admin se llama `admin` o `ADMIN`?).
4. **Abrí la colección de Postman:** rutas exactas, prefijo, bodies de ejemplo y con qué clave guarda el token el login ([bloque 103](metodos_nestjs.md#103-trampa-la-clave-del-token-del-login-no-coincide-con-postman-401-en-todo)).
5. **Ubicá en el proyecto** dónde están `PermissionsGuard`, `@Permissions`, `AuthenticatedRequest` (o `@CurrentUser`) y el `JwtStrategy`. Si el `JwtStrategy` no carga las relaciones del rol, todo va a dar 403 ([bloque 102](metodos_nestjs.md#102-trampa-el-jwtstrategy-no-carga-los-permisos-del-usuario-403-o-500-en-todo)).
6. **Levantá la BD y cargá el seed:** [`metodos_nestjs.md` → Paso 0](metodos_nestjs.md#paso-0--antes-de-escribir-código-levantar-la-bd-y-cargar-el-seed).

**Plantilla para tus notas** (una fila por endpoint):

| Endpoint                         | Reglas del enunciado                          | Mensaje literal            | Permiso (del seed)    | Receta |
| -------------------------------- | --------------------------------------------- | -------------------------- | --------------------- | ------ |
| `POST /events`                   | fecha futura, availableSpots = capacity, <111 | —                          | `create_events`       | R1     |
| `PATCH /reservations/:id/cancel` | dueño, no cancelada, no ocurrió, liberar      | "Reservation cancelled..." | `cancel_reservations` | V2     |

> La columna "Receta" sale del [índice de `recetas_parcial.md`](recetas_parcial.md#-índice-si-el-enunciado-dice--usá).

---

## Paso 1 — Estructura del módulo

1. Si el módulo no existe, generalo: `nest g resource events` (elegí _REST API_ y _yes_ para el CRUD). Si te crea un `entities/event.entity.ts` y la entity ya te la dieron, **borrá la generada** y usá la de ellos.
2. En el `*.module.ts`:
    - `TypeOrmModule.forFeature([...])` con TODAS las entities cuyo repositorio inyectes en el service.
    - `exports: [EventService]` si otro módulo (ej. reservas) usa este service.
    - Si usás el service de otro módulo, importá ese MÓDULO en `imports`.
3. Comprobá que el módulo esté en los `imports` del `AppModule`.

📄 Abrí: [`recetas_parcial.md` → `AuthenticatedRequest` y módulos](recetas_parcial.md#3-authenticatedrequest-y-módulos) · si falla la inyección: [bloque 79](metodos_nestjs.md#79-usar-el-service-de-otro-módulo-exports--imports).

---

## Paso 2 — DTOs (10%)

1. Abrí [`validaciones_dto.md` → Tabla resumen rápida](validaciones_dto.md#4-tabla-resumen-rápida) y el [molde de DTOs](recetas_parcial.md#2-dtos).
2. **Un campo en el DTO por cada dato que manda el cliente.** Lo que calcula el service NO va: `availableSpots`, `status`, el `userId` (sale del token).
3. Cada decorador con su `{ message: '...' }` (suma en calidad).
4. `UpdateDto extends PartialType(CreateDto)`; si hay campos que no se pueden cambiar, `OmitType` ([bloque 75](metodos_nestjs.md#75-updatedto-que-no-deja-cambiar-ciertos-campos-omittype)).

**Traductor: frase del enunciado → decorador**

| El enunciado dice...                  | Decorador                                                   |
| ------------------------------------- | ----------------------------------------------------------- |
| "obligatorio" / "requerido"           | `@IsNotEmpty()`                                             |
| "texto" / "nombre" / "descripción"    | `@IsString()`                                               |
| "menos de 111 caracteres"             | `@MaxLength(110)` ⚠️ (menos de 111 = máximo 110)            |
| "máximo 111" / "hasta 111 caracteres" | `@MaxLength(111)`                                           |
| "al menos 3 caracteres"               | `@MinLength(3)`                                             |
| "fecha"                               | `@IsDateString()`                                           |
| "número entero" / "capacidad"         | `@IsInt()` + `@Min(1)`                                      |
| "el id del evento / producto / ..."   | `@IsInt()` + `@IsPositive()`                                |
| "precio" (con decimales)              | `@IsNumber()` + `@Min(0)`                                   |
| "opcional"                            | `@IsOptional()` (arriba de los demás decoradores del campo) |
| "uno de estos valores" / un estado    | `@IsEnum(MiEnum)` o `@IsIn(['A', 'B'])`                     |
| "correo"                              | `@IsEmail()`                                                |
| "verdadero / falso"                   | `@IsBoolean()`                                              |
| "entre 1 y 5"                         | `@Min(1)` + `@Max(5)`                                       |

> ⚠️ "La fecha debe ser futura" o "no puede superar los cupos" **NO son
> decoradores**: son reglas de negocio y van en el service (Paso 3).

---

## Paso 3 — Services (Event 25% + Reservation 30% + excepciones 10%)

1. **Constructor:** un `@InjectRepository(Entidad)` por cada repositorio que uses + `DataSource` si hay transacciones.
2. **Escribí primero `findOne` con 404:** lo reutilizan `update`, `remove` y las acciones.
3. **Para cada endpoint:** buscalo en el [índice de recetas](recetas_parcial.md#-índice-si-el-enunciado-dice--usá) → copiá la receta → renombrá con tu diccionario → aplicá las variantes (borrá lo que no piden, agregá lo que sí).
4. **Dentro de cada método, siempre este orden:**

    | #   | Qué                                              | Si falla                                            |
    | --- | ------------------------------------------------ | --------------------------------------------------- |
    | 1   | Buscar lo que tiene que existir                  | 404 `NotFoundException`                             |
    | 2   | ¿Es del usuario del token? (o admin)             | 403 `ForbiddenException`                            |
    | 3   | Estado (activo, ya cancelado, ya ocurrió)        | 400 `BadRequestException` / 409 `ConflictException` |
    | 4   | Reglas de datos (fechas, cupos, límites, únicos) | 400 / 409                                           |
    | 5   | Guardar (transacción si tocás 2 tablas)          | —                                                   |
    | 6   | Responder (la entidad o `{ message }`)           | —                                                   |

5. **Mensajes literales:** copialos EXACTOS del enunciado (mayúsculas, puntos y comillas).

**Orden sugerido para el pre-parcial:**

| #   | Endpoint                            | Receta en `recetas_parcial.md`                                                                                 |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `POST /events`                      | [R1](recetas_parcial.md#r1-crear-evento-fecha-futura--availablespots--capacity)                                |
| 2   | `GET /events`, `GET /events/:id`    | [Molde: service del recurso](recetas_parcial.md#4-service-del-recurso)                                         |
| 3   | `PATCH /events/:id`                 | [R5](recetas_parcial.md#r5-actualizar-evento-fecha-futura-si-se-modifica--capacidad-no-menor-a-los-reservados) |
| 4   | `PATCH /events/:id/deactivate`      | [V6](recetas_parcial.md#v6-desactivar-evento-solo-sin-reservas-activas)                                        |
| 5   | `DELETE /events/:id`                | [V5](recetas_parcial.md#v5-eliminar-evento-o-reserva-validar-existencia--mensaje)                              |
| 6   | `POST /reservations` ⭐             | [V1](recetas_parcial.md#v1-crear-reserva-existe-activo-no-ocurrió-cupos-límite-y-descontar)                    |
| 7   | `PATCH /reservations/:id/cancel` ⭐ | [V2](recetas_parcial.md#v2-cancelar-o-devolver-reserva-dueño-no-cancelada-no-ocurrió-liberar-cupos)            |
| 8   | `GET /reservations/user`            | [R4](recetas_parcial.md#r4-mis-reservas-get-user-solo-las-del-usuario-del-token)                               |
| 9   | `GET /reservations/:id`             | [Molde: service del booking](recetas_parcial.md#5-service-del-booking)                                         |
| 10  | `PATCH /reservations/:id`           | [V3](recetas_parcial.md#v3-actualizar-reserva-cambiar-la-cantidad)                                             |
| 11  | Filtrar entre dos fechas            | [V4](recetas_parcial.md#v4-filtrar-reservas-entre-dos-fechas)                                                  |
| 12  | `DELETE /reservations/:id`          | [V5](recetas_parcial.md#v5-eliminar-evento-o-reserva-validar-existencia--mensaje)                              |

⭐ = lo que más pesa en la rúbrica.

---

## Paso 4 — Controllers (seguridad 15%)

- [ ] Prefijo en el `@Controller('api-test/...')`.
- [ ] `@UseGuards(AuthGuard('jwt'), PermissionsGuard)` sobre la clase (o en cada método).
- [ ] `@Permissions('...')` en CADA método, con los nombres exactos del `insert.sql`.
- [ ] Usuario del token con `@Req() req: AuthenticatedRequest` → `req.user` (si la interfaz está en otro archivo: `import type`). ¿En cuáles endpoints? Solo donde la regla depende del usuario ([bloque 49.2](metodos_nestjs.md#492-proteger--saber-quién-en-qué-endpoints-va-requser)).
- [ ] Ids con `ParseIntPipe` (o `ParseUUIDPipe` si son UUID).
- [ ] Rutas fijas (`user`, `between-dates`) ANTES de `@Get(':id')`.
- [ ] El controller solo recibe y delega: NADA de lógica.

📄 Abrí: [`recetas_parcial.md` → Controllers completos](recetas_parcial.md#6-controllers-completos-con-el-orden-de-rutas-correcto) · guards en la clase: [bloque 101](metodos_nestjs.md#101-guards-una-vez-sobre-la-clase--permissions-en-cada-método) · usuario del token: [bloque 49](metodos_nestjs.md#49-tipar-y-usar-el-usuario-autenticado-authenticatedrequest). · plantilla de cada endpoint protegido: [🔒 en `metodos_nestjs.md`](metodos_nestjs.md#-así-se-ve-un-endpoint-protegido-según-el-método).

---

## Paso 5 — Probar con Postman

1. **Login primero** y comprobá que el token se guarde (si después todo da 401, es la clave del token: [bloque 103](metodos_nestjs.md#103-trampa-la-clave-del-token-del-login-no-coincide-con-postman-401-en-todo)).
2. Por cada endpoint probá **el caso feliz + al menos un error**:
    - un id que no existe → 404,
    - un body inválido → 400 con tus mensajes,
    - una regla rota (fecha pasada, sin cupos) → 400/409,
    - la reserva de OTRO usuario → 403.
3. Mirá la consola del servidor: si aparece un error con stack trace, es un 500 que tenés que convertir en una excepción de Nest.

---

## 🆘 Si algo falla

| Lo que ves                                                                           | Causa probable                                                         | Dónde está la solución                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La app no arranca: _"Nest can't resolve dependencies of X"_                          | Falta la entity en `forFeature`, o el `exports` / `imports` del módulo | [bloque 79](metodos_nestjs.md#79-usar-el-service-de-otro-módulo-exports--imports)                                                                                                                                                                                                                          |
| No compila: _"TS1272 ... must be imported with 'import type'"_                       | `AuthenticatedRequest` importada desde otro archivo                    | [bloque 49.5](metodos_nestjs.md#495-trampa-la-interfaz-en-otro-archivo-error-ts1272)                                                                                                                                                                                                                       |
| No compila: _"Argument of type 'User \| undefined' is not assignable..."_ (TS2345)   | La interfaz tiene `user?: User` y pasás `req.user` al service          | [bloque 49.4](metodos_nestjs.md#494-trampa-el--de-user-user-error-ts2345)                                                                                                                                                                                                                                  |
| 401 en todo lo protegido                                                             | El token no llega (clave del login vs Postman, falta Bearer)           | [bloque 103](metodos_nestjs.md#103-trampa-la-clave-del-token-del-login-no-coincide-con-postman-401-en-todo)                                                                                                                                                                                                |
| 403 aunque el usuario tiene el permiso                                               | `JwtStrategy` sin relaciones, o el nombre del permiso no coincide      | [bloques 102](metodos_nestjs.md#102-trampa-el-jwtstrategy-no-carga-los-permisos-del-usuario-403-o-500-en-todo) y [101](metodos_nestjs.md#101-guards-una-vez-sobre-la-clase--permissions-en-cada-método)                                                                                                    |
| 400 _"property X should not exist"_                                                  | Mandás un campo que no está en el DTO (`forbidNonWhitelisted`)         | Agregalo al DTO o no lo mandes                                                                                                                                                                                                                                                                             |
| 400 _"Validation failed (numeric string is expected)"_ en `/user` o `/between-dates` | La ruta fija está declarada DESPUÉS de `@Get(':id')`                   | Movela arriba de `@Get(':id')`                                                                                                                                                                                                                                                                             |
| 500 _"null value in column ... violates not-null constraint"_                        | No asignaste la relación al crear, o la FK tiene `insert: false`       | [bloque 80](metodos_nestjs.md#80-trampa-columna-fk--relación-con-el-mismo-nombre-insert-false-rompe-los-insert)                                                                                                                                                                                            |
| 500 al borrar                                                                        | El registro tiene dependientes (FK)                                    | [bloques 14](metodos_nestjs.md#14-eliminar-solo-si-no-tiene-registros-asociados-ej-evento-con-reservas--409), [78](metodos_nestjs.md#78-borrado-en-cascada-desde-la-entity-ondelete-cascade) u [89](metodos_nestjs.md#89-eliminar-evento-o-reserva-validar-que-exista-sin-500-por-fk-y-con-mensaje-propio) |
| Una fecha futura da "ya ocurrió" (o al revés)                                        | Comparás un string con un `Date`                                       | [bloque 92](metodos_nestjs.md#92-trampa-fechas-date-llega-como-string-timestamp-como-date)                                                                                                                                                                                                                 |
| Sumás precios y da `"105"` en vez de `15`                                            | Columna `numeric`/`decimal` llega como string                          | [bloque 81](metodos_nestjs.md#81-trampa-ids-bigint-y-columnas-numeric-que-llegan-como-string)                                                                                                                                                                                                              |

---

## ✅ Antes de entregar

1. `npm run build` sin errores.
2. Repasá el [checklist de la guía de `metodos_nestjs.md`](metodos_nestjs.md#-checklist-antes-de-entregar).
3. Borrá `console.log`, código comentado y archivos generados que no usás (suma en calidad).
