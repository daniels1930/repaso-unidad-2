# Recetario de métodos — Service + Controller NestJS/TypeORM (con ejemplos reales)

> En todos los controllers se asume una inyección estándar, por ejemplo:
>
> ```typescript
> @Controller('productos')
> export class ProductoController {
>     constructor(private readonly productoService: ProductoService) {}
> }
> ```
>
> Y que `ParseIntPipe` se importa de `@nestjs/common` cuando se necesita.

---

### 1. Crear un registro simple, sin relaciones

Cuando la entidad no depende de ninguna otra tabla — solo tiene sus
propias columnas — el `create` es directo. Ejemplo: crear una
**Categoría** de productos (solo tiene nombre).

```typescript
async create(createCategoriaDto: CreateCategoriaDto): Promise<Categoria> {
    const nuevaCategoria = this.categoriaRepository.create(createCategoriaDto);
    return await this.categoriaRepository.save(nuevaCategoria);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriaService.create(createCategoriaDto);
}
```

---

### 2. Crear un registro que depende de UNA entidad existente

Aquí la entidad nueva necesita "engancharse" a otra que ya existe en la
base de datos. Ejemplo típico: crear un **Pedido** que pertenece a un
**Cliente** que ya está registrado (te llega su id en el DTO).

```typescript
async create(createPedidoDto: CreatePedidoDto) {
    const cliente = await this.clienteService.findOne(createPedidoDto.clienteId);
    if (!cliente) {
        throw new Error('Cliente no encontrado');
    }

    const nuevoPedido = this.pedidoRepository.create({
        ...createPedidoDto,
        cliente,
    });
    return await this.pedidoRepository.save(nuevoPedido);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createPedidoDto: CreatePedidoDto) {
    return this.pedidoService.create(createPedidoDto);
}
```

---

### 3. Crear una tabla intermedia (dos relaciones, sin columnas propias)

Cuando necesitás una tabla que solo existe para unir dos entidades —
típico de una relación muchos-a-muchos con tabla propia. Ejemplo: una
**Inscripción** que une a un **Estudiante** con un **Curso**.

```typescript
async create(createInscripcionDto: CreateInscripcionDto) {
    const estudiante = await this.estudianteService.findOne(createInscripcionDto.estudianteId);
    const curso = await this.cursoService.findOne(createInscripcionDto.cursoId);

    if (!estudiante) {
        throw new Error('Estudiante no encontrado');
    }
    if (!curso) {
        throw new Error('Curso no encontrado');
    }

    const nuevaInscripcion = this.inscripcionRepository.create({
        estudiante,
        curso,
    });

    return await this.inscripcionRepository.save(nuevaInscripcion);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createInscripcionDto: CreateInscripcionDto) {
    return this.inscripcionService.create(createInscripcionDto);
}
```

---

### 4. Crear un registro con relación + validar que NO exista duplicado

Sirve para evitar que se repita la misma combinación dos veces. Ejemplo:
que un mismo **Estudiante** no pueda inscribirse dos veces al mismo
**Curso**.

```typescript
async create(createInscripcionDto: CreateInscripcionDto) {
    const estudiante = await this.estudianteService.findOne(createInscripcionDto.estudianteId);
    if (!estudiante) {
        throw new Error('Estudiante no encontrado');
    }

    const curso = await this.cursoService.findOne(createInscripcionDto.cursoId);
    if (!curso) {
        throw new Error('Curso no encontrado');
    }

    const yaInscrito = await this.inscripcionRepository.findOne({
        where: {
            estudiante: { id: estudiante.id },
            curso: { id: curso.id },
        },
    });
    if (yaInscrito) {
        throw new Error('El estudiante ya está inscrito en este curso');
    }

    const nuevaInscripcion = this.inscripcionRepository.create({ estudiante, curso });
    return await this.inscripcionRepository.save(nuevaInscripcion);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createInscripcionDto: CreateInscripcionDto) {
    return this.inscripcionService.create(createInscripcionDto);
}
```

---

### 5. Buscar todos, trayendo la relación (JOIN)

Para listar registros mostrando también el objeto relacionado, no solo su
id. Ejemplo: listar **Productos** mostrando el nombre completo de su
**Categoría**, no solo `categoriaId`.

```typescript
findAll() {
    return this.productoRepository.find({
        relations: {
            categoria: true,
        },
    });
}
```

**Controller:**

```typescript
@Get()
findAll() {
    return this.productoService.findAll();
}
```

---

### 6. Buscar todos, trayendo DOS niveles de relación anidados

Cuando la relación que traés tiene, a su vez, otra relación adentro.
Ejemplo: listar **Pedidos** con su **Cliente**, y dentro del cliente, la
**Ciudad** a la que pertenece.

```typescript
findAll() {
    return this.pedidoRepository.find({
        relations: {
            cliente: {
                ciudad: true,
            },
        },
    });
}
```

**Controller:**

```typescript
@Get()
findAll() {
    return this.pedidoService.findAll();
}
```

---

### 7. Buscar uno por id

El clásico `findOne` de cualquier CRUD. Ejemplo: buscar un **Producto**
puntual por su id.

```typescript
findOne(id: number) {
    return this.productoRepository.findOne({ where: { id } });
}
```

**Controller:**

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productoService.findOne(id);
}
```

---

### 8. Buscar filtrando por un campo de la RELACIÓN (no propio)

Para cuando el filtro no vive en la propia tabla sino en la tabla
relacionada. Ejemplo: traer todos los **Productos** cuya **Categoría**
se llame "Electrónica".

```typescript
async findByCategoria(nombreCategoria: string) {
    return await this.productoRepository.find({
        where: { categoria: { nombre: nombreCategoria } },
        relations: { categoria: true },
        order: { id: 'ASC' },
    });
}
```

**Controller:**

```typescript
@Get('por-categoria')
findByCategoria(@Query('nombre') nombre: string) {
    return this.productoService.findByCategoria(nombre);
}
```

---

### 9. Buscar por texto parcial (LIKE / contiene)

Un buscador tipo "encontrame los productos cuyo nombre contenga esta
palabra", sin que tenga que coincidir exacto. Ejemplo: buscar
**Productos** que contengan "camisa" en el nombre.

```typescript
import { Like } from 'typeorm';

async searchByName(texto: string) {
    return await this.productoRepository.find({
        where: { nombre: Like(`%${texto}%`) },
    });
}
```

**Controller:**

```typescript
@Get('buscar')
searchByName(@Query('texto') texto: string) {
    return this.productoService.searchByName(texto);
}
```

---

### 10. Actualizar campos simples (sin tocar relaciones)

Cuando el update solo toca columnas propias. Ejemplo: actualizar el
precio y el stock de un **Producto**.

```typescript
async update(id: number, updateProductoDto: UpdateProductoDto): Promise<Producto | null> {
    await this.productoRepository.update(id, updateProductoDto);
    return await this.productoRepository.findOneBy({ id });
}
```

**Controller:**

```typescript
@Patch(':id')
update(@Param('id', ParseIntPipe) id: number, @Body() updateProductoDto: UpdateProductoDto) {
    return this.productoService.update(id, updateProductoDto);
}
```

---

### 11. Actualizar reasignando UNA relación

Para cambiar a qué entidad relacionada apunta un registro que ya existe.
Ejemplo: reasignar un **Pedido** a otro **Cliente** (por ejemplo, se
cargó mal el pedido).

```typescript
async update(id: number, updatePedidoDto: UpdatePedidoDto) {
    const pedido = await this.pedidoRepository.findOneBy({ id });
    if (!pedido) {
        throw new Error('Pedido no encontrado');
    }

    if (updatePedidoDto.clienteId) {
        const cliente = await this.clienteService.findOne(updatePedidoDto.clienteId);
        if (!cliente) {
            throw new Error('Cliente no encontrado');
        }
        pedido.cliente = cliente;
    }

    return await this.pedidoRepository.save({ ...pedido, ...updatePedidoDto });
}
```

**Controller:**

```typescript
@Patch(':id')
update(@Param('id', ParseIntPipe) id: number, @Body() updatePedidoDto: UpdatePedidoDto) {
    return this.pedidoService.update(id, updatePedidoDto);
}
```

---

### 12. Actualizar reasignando DOS relaciones (tabla intermedia)

Igual que el anterior, pero cuando la fila que actualizás pertenece a una
tabla intermedia con dos relaciones. Ejemplo: cambiar el **Estudiante**
o el **Curso** de una **Inscripción** ya existente.

```typescript
async update(id: number, updateInscripcionDto: UpdateInscripcionDto) {
    const inscripcion = await this.inscripcionRepository.findOneBy({ id });
    if (!inscripcion) {
        throw new Error('Inscripción no encontrada');
    }

    if (updateInscripcionDto.estudianteId) {
        const estudiante = await this.estudianteService.findOne(updateInscripcionDto.estudianteId);
        if (!estudiante) {
            throw new Error('Estudiante no encontrado');
        }
        inscripcion.estudiante = estudiante;
    }

    if (updateInscripcionDto.cursoId) {
        const curso = await this.cursoService.findOne(updateInscripcionDto.cursoId);
        if (!curso) {
            throw new Error('Curso no encontrado');
        }
        inscripcion.curso = curso;
    }

    return await this.inscripcionRepository.save(inscripcion);
}
```

**Controller:**

```typescript
@Patch(':id')
update(@Param('id', ParseIntPipe) id: number, @Body() updateInscripcionDto: UpdateInscripcionDto) {
    return this.inscripcionService.update(id, updateInscripcionDto);
}
```

---

### 13. Eliminar por id (simple, cualquier entidad)

El `remove` estándar, incluso para tablas intermedias — borrar nunca
necesita resolver relaciones. Ejemplo: eliminar una **Categoría**.

```typescript
async remove(id: number) {
    const resultado = await this.categoriaRepository.delete(id);
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
    return this.categoriaService.remove(id);
}
```

---

### 14. Eliminar validando que no tenga dependencias

Para evitar dejar datos huérfanos: no dejar borrar un registro si otros
todavía dependen de él. Ejemplo: no permitir borrar una **Categoría** si
todavía tiene **Productos** asociados.

```typescript
async remove(id: number) {
    const productosAsociados = await this.productoRepository.count({
        where: { categoria: { id } },
    });
    if (productosAsociados > 0) {
        throw new Error('No se puede eliminar: hay productos asociados a esta categoría');
    }

    const resultado = await this.categoriaRepository.delete(id);
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
    return this.categoriaService.remove(id);
}
```

---

### 15. Contar todos los registros

Para responder algo tipo "¿cuántos pedidos hay en total?".

```typescript
async count(): Promise<number> {
    return await this.pedidoRepository.count();
}
```

**Controller:**

```typescript
// OJO: esta ruta debe declararse ANTES de @Get(':id'),
// si no, Nest intenta interpretar "count" como si fuera el id.
@Get('count')
count() {
    return this.pedidoService.count();
}
```

---

### 16. Contar filtrando por relación

Para responder "¿cuántos productos tiene tal categoría?".

```typescript
async countByCategoria(nombreCategoria: string): Promise<number> {
    return await this.productoRepository.count({
        where: { categoria: { nombre: nombreCategoria } },
    });
}
```

**Controller:**

```typescript
@Get('count/por-categoria')
countByCategoria(@Query('nombre') nombre: string) {
    return this.productoService.countByCategoria(nombre);
}
```

---

### 17. Verificar si ya existe antes de crear (evitar duplicados por nombre)

Para que no se puedan crear dos registros con el mismo valor en un campo
que debería ser único. Ejemplo: no permitir dos **Categorías** con el
mismo nombre.

```typescript
async create(createCategoriaDto: CreateCategoriaDto): Promise<Categoria> {
    const existe = await this.categoriaRepository.existsBy({ nombre: createCategoriaDto.nombre });
    if (existe) {
        throw new Error('Ya existe una categoría con ese nombre');
    }

    const nuevaCategoria = this.categoriaRepository.create(createCategoriaDto);
    return await this.categoriaRepository.save(nuevaCategoria);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriaService.create(createCategoriaDto);
}
```

---

### 18. Traer los N más recientes

Ejemplo: mostrar los últimos 5 **Pedidos** que entraron.

```typescript
async findLatest(limit: number) {
    return await this.pedidoRepository.find({
        order: { createdAt: 'DESC' },
        take: limit,
    });
}
```

**Controller:**

```typescript
@Get('recientes')
findLatest(@Query('limit', ParseIntPipe) limit: number) {
    return this.pedidoService.findLatest(limit);
}
```

---

### 19. Paginar resultados (con total)

Para un listado con paginación real, mostrando página actual y total de
registros. Ejemplo: listado paginado de **Productos** para un catálogo.

```typescript
async findPaginated(page: number, limit: number) {
    const [items, total] = await this.productoRepository.findAndCount({
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
    return this.productoService.findPaginated(page, limit);
}
```

---

### 20. Relación `@OneToOne` (uno a uno)

Para cuando una entidad tiene exactamente UN registro relacionado y
único de otra tabla. Ejemplo: un **Usuario** que tiene un único
**Perfil** con su foto y biografía.

```typescript
// entidad Usuario
@OneToOne(() => Perfil, { cascade: true })
@JoinColumn({ name: 'perfil_id' })
perfil: Perfil;

// service
async create(createUsuarioDto: CreateUsuarioDto) {
    const nuevoUsuario = this.usuarioRepository.create({
        ...createUsuarioDto,
        perfil: createUsuarioDto.perfil, // objeto completo, se crea en cascada
    });
    return await this.usuarioRepository.save(nuevoUsuario);
}

findOne(id: number) {
    return this.usuarioRepository.findOne({
        where: { id },
        relations: { perfil: true },
    });
}
```

**Controller:**

```typescript
@Post()
create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
}

@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.findOne(id);
}
```

---

### 21. Relación `@ManyToMany` DIRECTA (sin service de tabla intermedia)

Para cuando NO necesitás una tabla intermedia con su propio CRUD, sino
una relación muchos-a-muchos simple que maneja TypeORM automáticamente.
Ejemplo: un **Libro** puede tener varios **Autores**, y no hace falta
gestionar "autoría" como entidad aparte.

```typescript
// entidad Libro
@ManyToMany(() => Autor)
@JoinTable({ name: 'libro_autor' }) // solo en el lado "dueño" de la relación
autores: Autor[];

// service — crear asignando varios autores a la vez
async create(createLibroDto: CreateLibroDto) {
    const autores = await this.autorRepository.findBy({
        id: In(createLibroDto.autorIds), // array de ids
    });

    const nuevoLibro = this.libroRepository.create({
        ...createLibroDto,
        autores,
    });
    return await this.libroRepository.save(nuevoLibro);
}

// agregar un autor más a un libro ya existente
async addAutor(id: number, autorId: number) {
    const libro = await this.libroRepository.findOne({
        where: { id },
        relations: { autores: true },
    });
    if (!libro) {
        throw new Error('Libro no encontrado');
    }

    const autor = await this.autorRepository.findOneBy({ id: autorId });
    if (!autor) {
        throw new Error('Autor no encontrado');
    }

    libro.autores.push(autor);
    return await this.libroRepository.save(libro);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createLibroDto: CreateLibroDto) {
    return this.libroService.create(createLibroDto);
}

@Patch(':id/autores/:autorId')
addAutor(
    @Param('id', ParseIntPipe) id: number,
    @Param('autorId', ParseIntPipe) autorId: number,
) {
    return this.libroService.addAutor(id, autorId);
}
```

---

### 22. Filtrar con operadores de comparación (`MoreThan`, `LessThan`, `Between`)

Para cosas como "traer productos con precio mayor a X" o "pedidos hechos
entre dos fechas".

```typescript
import { MoreThan, LessThan, Between } from 'typeorm';

async findMoreExpensiveThan(valor: number) {
    return await this.productoRepository.find({ where: { precio: MoreThan(valor) } });
}

async findCheaperThan(valor: number) {
    return await this.productoRepository.find({ where: { precio: LessThan(valor) } });
}

async findPedidosBetweenDates(inicio: Date, fin: Date) {
    return await this.pedidoRepository.find({ where: { createdAt: Between(inicio, fin) } });
}
```

**Controller:**

```typescript
@Get('precio/mayor-a')
findMoreExpensiveThan(@Query('valor', ParseIntPipe) valor: number) {
    return this.productoService.findMoreExpensiveThan(valor);
}

@Get('precio/menor-a')
findCheaperThan(@Query('valor', ParseIntPipe) valor: number) {
    return this.productoService.findCheaperThan(valor);
}

@Get('pedidos/entre-fechas')
findPedidosBetweenDates(@Query('inicio') inicio: string, @Query('fin') fin: string) {
    return this.pedidoService.findPedidosBetweenDates(new Date(inicio), new Date(fin));
}
```

---

### 23. Filtrar por una lista de ids (`In`)

Útil cuando el frontend te manda una selección múltiple. Ejemplo clásico:
traer los **Productos** de un carrito de compras a partir de sus ids.

```typescript
import { In } from 'typeorm';

async findByIds(ids: number[]) {
    return await this.productoRepository.find({ where: { id: In(ids) } });
}
```

**Controller:**

```typescript
// se recibe como query string separado por comas, ej: /productos/por-ids?ids=1,2,3
@Get('por-ids')
findByIds(@Query('ids') ids: string) {
    const idsArray = ids.split(',').map(Number);
    return this.productoService.findByIds(idsArray);
}
```

---

### 24. Consulta con QueryBuilder (cuando `find()` no alcanza)

Para joins manuales, agregaciones (`COUNT`, `SUM`) o condiciones dinámicas
que `find()` no arma fácil. Ejemplo: buscar **Productos** por nombre con
join a categoría, y un reporte de cuántos **Pedidos** hizo cada
**Cliente**.

```typescript
async findWithQueryBuilder(nombre: string) {
    return await this.productoRepository
        .createQueryBuilder('producto')
        .leftJoinAndSelect('producto.categoria', 'categoria')
        .where('producto.nombre LIKE :nombre', { nombre: `%${nombre}%` })
        .orderBy('producto.id', 'ASC')
        .getMany();
}

// reporte: cuántos pedidos hizo cada cliente
async countPedidosPorCliente() {
    return await this.pedidoRepository
        .createQueryBuilder('pedido')
        .select('cliente.nombre', 'clienteNombre')
        .addSelect('COUNT(pedido.id)', 'total')
        .leftJoin('pedido.cliente', 'cliente')
        .groupBy('cliente.nombre')
        .getRawMany();
}
```

**Controller:**

```typescript
@Get('query-builder')
findWithQueryBuilder(@Query('nombre') nombre: string) {
    return this.productoService.findWithQueryBuilder(nombre);
}

@Get('reportes/pedidos-por-cliente')
countPedidosPorCliente() {
    return this.pedidoService.countPedidosPorCliente();
}
```

---

### 25. Transacción (varias operaciones que deben tener éxito juntas)

Para cuando necesitás hacer 2+ operaciones y, si una falla, hay que
deshacer todo. Ejemplo clásico de tienda: crear un **Pedido** y, en el
mismo momento, descontar el **Stock** del producto — si algo sale mal, no
querés que se descuente el stock sin que exista el pedido.

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class PedidoService {
    constructor(private dataSource: DataSource) {}

    async createWithTransaction(createPedidoDto: CreatePedidoDto) {
        return await this.dataSource.transaction(async (manager) => {
            const nuevoPedido = manager.create(Pedido, createPedidoDto);
            const pedidoGuardado = await manager.save(nuevoPedido);

            // descuenta el stock del producto, dentro de la misma transacción
            await manager.update(Producto, createPedidoDto.productoId, {
                stock: () => 'stock - 1',
            });

            return pedidoGuardado;
            // si algo falla en cualquier punto, TypeORM revierte TODO automáticamente
        });
    }
}
```

**Controller:**

```typescript
@Post('con-transaccion')
createWithTransaction(@Body() createPedidoDto: CreatePedidoDto) {
    return this.pedidoService.createWithTransaction(createPedidoDto);
}
```

---

### 26. Usar excepciones propias de NestJS (en vez de `throw new Error`)

Para que los errores devuelvan el código HTTP correcto (404, 409, etc.)
en vez de un genérico 500. Ejemplo: 404 si el **Producto** no existe, 409
si la **Categoría** ya está registrada.

```typescript
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

async findOne(id: number) {
    const producto = await this.productoRepository.findOneBy({ id });
    if (!producto) {
        throw new NotFoundException(`Producto con id ${id} no encontrado`); // devuelve 404
    }
    return producto;
}

async create(createCategoriaDto: CreateCategoriaDto) {
    const existe = await this.categoriaRepository.existsBy({ nombre: createCategoriaDto.nombre });
    if (existe) {
        throw new ConflictException('Ya existe una categoría con ese nombre'); // devuelve 409
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
create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriaService.create(createCategoriaDto);
}

@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productoService.findOne(id);
}
```

---

### 27. Validaciones en el DTO con `class-validator`

Para que NestJS rechace automáticamente datos mal formados antes de que
lleguen al service (requiere `ValidationPipe` global en `main.ts`:
`app.useGlobalPipes(new ValidationPipe())`). Ejemplo: validar los datos
al crear un **Producto**.

```typescript
import { IsString, IsNotEmpty, IsInt, IsOptional, MaxLength, Min, IsPositive, IsBoolean } from 'class-validator';

export class CreateProductoDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    nombre: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    descripcion?: string;

    @IsInt()
    @IsPositive()
    categoriaId: number;

    @IsInt()
    @Min(0)
    precio: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    stock?: number;

    @IsOptional()
    @IsBoolean()
    disponible?: boolean;
}
```

**Controller:**

```typescript
// El controller tampoco cambia: el DTO se sigue recibiendo con @Body()
// tal cual en el bloque 1. La validación ocurre antes de entrar al método,
// gracias al ValidationPipe global registrado en main.ts.
// Si algo no cumple las reglas del DTO, Nest responde 400 automáticamente.
@Post()
create(@Body() createProductoDto: CreateProductoDto) {
    return this.productoService.create(createProductoDto);
}
```

---

### 28. Buscar por texto parcial ignorando mayúsculas y minúsculas (`ILike`)

Igual que `Like`, pero sin importar si el texto está en mayúsculas o
minúsculas — muy usado con PostgreSQL. Ejemplo: buscar un **Cliente**
por nombre, sin que importe cómo lo escribió el usuario ("juan",
"Juan" o "JUAN" deberían encontrar lo mismo).

```typescript
import { ILike } from 'typeorm';

async searchByName(texto: string) {
    return await this.clienteRepository.find({
        where: { nombre: ILike(`%${texto}%`) },
    });
}
```

**Controller:**

```typescript
@Get('buscar')
searchByName(@Query('texto') texto: string) {
    return this.clienteService.searchByName(texto);
}
```

---

### 29. Filtrar por valores mayores o iguales (`MoreThanOrEqual`)

Ejemplo: encontrar **Productos** con un precio de 100.000 o más.

```typescript
import { MoreThanOrEqual } from 'typeorm';

async findMoreThanOrEqual(valor: number) {
    return await this.productoRepository.find({
        where: { precio: MoreThanOrEqual(valor) },
    });
}
```

**Controller:**

```typescript
@Get('precio/desde')
findMoreThanOrEqual(@Query('valor', ParseIntPipe) valor: number) {
    return this.productoService.findMoreThanOrEqual(valor);
}
```

---

### 30. Filtrar por valores menores o iguales (`LessThanOrEqual`)

Ejemplo: encontrar **Productos** con un precio de 50.000 o menos (para un
filtro de "hasta cierto presupuesto").

```typescript
import { LessThanOrEqual } from 'typeorm';

async findLessThanOrEqual(valor: number) {
    return await this.productoRepository.find({
        where: { precio: LessThanOrEqual(valor) },
    });
}
```

**Controller:**

```typescript
@Get('precio/hasta')
findLessThanOrEqual(@Query('valor', ParseIntPipe) valor: number) {
    return this.productoService.findLessThanOrEqual(valor);
}
```

---

### 31. Buscar registros donde un campo sea NULL (`IsNull`)

Para encontrar registros que todavía no tienen algo asignado. Ejemplo:
listar **Clientes** que no cargaron ningún correo electrónico.

`IsNull()` equivale a `WHERE columna IS NULL`.

```typescript
import { IsNull } from 'typeorm';

async findWithoutEmail() {
    return await this.clienteRepository.find({
        where: { email: IsNull() },
    });
}
```

**Controller:**

```typescript
@Get('sin-email')
findWithoutEmail() {
    return this.clienteService.findWithoutEmail();
}
```

---

### 32. Negar una condición (`Not`)

Para buscar todo lo que NO cumpla cierta condición. Ejemplo: traer todos
los **Pedidos** cuyo estado no sea "cancelado".

`Not()` también sirve para negar otros operadores, como `Not(In([...]))`
o `Not(IsNull())`.

```typescript
import { Not } from 'typeorm';

async findNoCancelados() {
    return await this.pedidoRepository.find({
        where: { estado: Not('cancelado') },
    });
}
```

**Controller:**

```typescript
@Get('no-cancelados')
findNoCancelados() {
    return this.pedidoService.findNoCancelados();
}
```

---

### 33. Excepciones HTTP estándar en NestJS

Para que cada error tenga el código HTTP que le corresponde, en vez de
que todo termine como un 500 genérico. Las excepciones se lanzan desde el
service, y NestJS arma automáticamente la respuesta HTTP.

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

**Ejemplo: `NotFoundException`** — devolver 404 cuando el **Producto**
buscado no existe.

```typescript
import { NotFoundException } from '@nestjs/common';

async findOne(id: number) {
    const producto = await this.productoRepository.findOneBy({ id });
    if (!producto) {
        throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return producto;
}
```

**Controller:**

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productoService.findOne(id);
}
```

**Ejemplo: `ConflictException`** — indicar que ya existe una
**Categoría** con ese nombre.

```typescript
import { ConflictException } from '@nestjs/common';

async create(createCategoriaDto: CreateCategoriaDto) {
    const existe = await this.categoriaRepository.existsBy({
        nombre: createCategoriaDto.nombre,
    });

    if (existe) {
        throw new ConflictException('Ya existe una categoría con ese nombre');
    }

    const nuevaCategoria = this.categoriaRepository.create(createCategoriaDto);
    return await this.categoriaRepository.save(nuevaCategoria);
}
```

**Controller:**

```typescript
@Post()
create(@Body() createCategoriaDto: CreateCategoriaDto) {
    return this.categoriaService.create(createCategoriaDto);
}
```

**Ejemplo: `BadRequestException`** — rechazar un valor negativo en un
descuento aplicado a un **Pedido**.

```typescript
import { BadRequestException } from '@nestjs/common';

async aplicarDescuento(valor: number) {
    if (valor < 0) {
        throw new BadRequestException('El descuento no puede ser negativo');
    }
}
```

**Controller:**

```typescript
@Post('aplicar-descuento')
aplicarDescuento(@Body('valor') valor: number) {
    return this.pedidoService.aplicarDescuento(valor);
}
```

**Ejemplo: `UnauthorizedException`** — el **Usuario** no mandó
credenciales válidas al intentar loguearse.

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
    return this.usuarioService.authenticate();
}
```

**Ejemplo: `ForbiddenException`** — un **Usuario** autenticado, pero sin
permisos para borrar un **Pedido** ajeno.

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
    return this.usuarioService.checkPermission();
}
```

**Regla importante:** el controller nunca necesita `try/catch` para estas
excepciones. Se lanzan desde el service y NestJS arma la respuesta HTTP
automáticamente.

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
| Buscar texto ignorando mayúsculas/minúsculas (`ILike`)    | 28              |
| Filtrar por mayor o igual que (`MoreThanOrEqual`)         | 29              |
| Filtrar por menor o igual que (`LessThanOrEqual`)         | 30              |
| Buscar valores NULL (`IsNull`)                            | 31              |
| Negar una condición (`Not`)                               | 32              |
| Manejar excepciones HTTP estándar                         | 33              |
