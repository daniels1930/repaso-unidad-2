# Recetario de `class-validator` + `class-transformer` (NestJS)

## 1. Instalación

```bash
npm install class-validator class-transformer
```

- **class-validator**: provee los decoradores (`@IsString`, `@IsEmail`, etc.) para validar las propiedades de tus DTOs.
- **class-transformer**: convierte objetos planos (JSON del request) en instancias de clase, y permite transformar tipos (`@Type()`).

---

## 2. Configuración en `main.ts`

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error) => {
    console.error('Error al iniciar la aplicación:', error);
    process.exit(1);
});
```

**¿Qué hace cada opción?**

| Opción                       | Qué hace                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `whitelist: true`            | Elimina automáticamente del objeto cualquier propiedad que **no** tenga decoradores en el DTO.                                                                                 |
| `forbidNonWhitelisted: true` | En vez de solo eliminar las props no declaradas, lanza un error 400 si el body trae propiedades extra.                                                                         |
| `transform: true`            | Convierte el `body`/`params`/`query` (que llegan como texto/JSON plano) a instancias reales de la clase DTO, respetando tipos (ej: string "5" → number 5 si el DTO lo espera). |

> Import base en cada DTO: `import { ... } from 'class-validator';`

---

## 3. Recetario de decoradores

### 📝 Strings y texto

**`@IsString()`**
Valida que el valor sea de tipo `string`.

```typescript
@IsString({ message: 'El campo debe ser una cadena de texto' })
nombre: string;
```

**`@IsNotEmpty()`**
Valida que el campo no esté vacío (ni `''`, `null`, `undefined`).

```typescript
@IsNotEmpty({ message: 'El campo es obligatorio' })
nombre: string;
```

**`@MinLength(n)`**
Longitud mínima de un string.

```typescript
@MinLength(3, { message: 'Debe contener al menos 3 caracteres' })
username: string;
```

**`@MaxLength(n)`**
Longitud máxima de un string.

```typescript
@MaxLength(200, { message: 'No puede exceder 200 caracteres' })
bio: string;
```

**`@Length(min, max)`**
Combina mínimo y máximo en un solo decorador.

```typescript
@Length(3, 20, { message: 'Debe tener entre 3 y 20 caracteres' })
apodo: string;
```

**`@Matches(regex)`**
Valida contra una expresión regular. Útil para contraseñas seguras, códigos, etc.

```typescript
@Matches(/^(?=.*[A-Z])(?=.*[0-9]).*$/, {
    message: 'La contraseña debe tener al menos una mayúscula y un número',
})
password: string;
```

**`@IsAlpha()`**
Solo letras (sin números ni símbolos).

```typescript
@IsAlpha('es-ES', { message: 'Solo se permiten letras' })
nombre: string;
```

**`@IsAlphanumeric()`**
Solo letras y números.

```typescript
@IsAlphanumeric('es-ES', { message: 'Solo se permiten letras y números' })
codigo: string;
```

**`@IsLowercase()`**
El string debe estar todo en minúsculas.

```typescript
@IsLowercase({ message: 'Debe estar en minúsculas' })
slug: string;
```

**`@IsUppercase()`**
El string debe estar todo en mayúsculas.

```typescript
@IsUppercase({ message: 'Debe estar en mayúsculas' })
codigoPais: string;
```

**`@IsEmpty()`**
Valida que el campo esté vacío (lo opuesto a `@IsNotEmpty`). Poco común pero útil para campos que no deben venir en ciertos casos.

```typescript
@IsEmpty({ message: 'Este campo no debe enviarse' })
campoInterno: string;
```

---

### 📧 Formatos específicos

**`@IsEmail()`**
Valida formato de correo electrónico.

```typescript
@IsEmail({}, { message: 'Debe ingresar un correo electrónico válido' })
email: string;
```

**`@IsUrl()`**
Valida que sea una URL válida.

```typescript
@IsUrl({}, { message: 'Debe ser una URL válida' })
sitioWeb: string;
```

**`@IsUUID()`**
Valida formato UUID (útil para IDs generados con `uuid`).

```typescript
@IsUUID('4', { message: 'El id debe ser un UUID válido' })
id: string;
```

**`@IsJSON()`**
Valida que el string sea un JSON válido (antes de parsearlo).

```typescript
@IsJSON({ message: 'Debe ser un JSON válido' })
metadata: string;
```

**`@IsPhoneNumber()`**
Valida número de teléfono según región (código ISO del país o `null` para autodetectar).

```typescript
@IsPhoneNumber('CO', { message: 'Debe ser un número de teléfono válido' })
telefono: string;
```

**`@IsDateString()`**
Valida que sea un string de fecha en formato ISO 8601.

```typescript
@IsDateString({}, { message: 'Debe ser una fecha válida (YYYY-MM-DD)' })
fechaNacimiento: string;
```

**`@IsBase64()`**
Valida que el string esté codificado en Base64.

```typescript
@IsBase64({}, { message: 'Debe ser una cadena Base64 válida' })
imagenBase64: string;
```

**`@IsHexColor()`**
Valida un color en formato hexadecimal.

```typescript
@IsHexColor({ message: 'Debe ser un color hexadecimal válido (#FFFFFF)' })
colorFavorito: string;
```

**`@IsMobilePhone()`**
Similar a `@IsPhoneNumber` pero específico para móviles según locale.

```typescript
@IsMobilePhone('es-CO', {}, { message: 'Debe ser un número móvil válido' })
celular: string;
```

**`@IsPostalCode()`**
Valida código postal según país.

```typescript
@IsPostalCode('any', { message: 'Debe ser un código postal válido' })
codigoPostal: string;
```

---

### 🔢 Números

**`@IsNumber()`**
Valida que sea de tipo `number`. Acepta un objeto de opciones (decimales, etc.) o `{}`.

```typescript
@IsNumber({}, { message: 'Debe ser un número' })
precio: number;
```

**`@IsInt()`**
Valida que sea un número entero (sin decimales).

```typescript
@IsInt({ message: 'Debe ser un número entero' })
cantidad: number;
```

**`@IsPositive()`**
El número debe ser mayor a 0.

```typescript
@IsPositive({ message: 'Debe ser un número positivo' })
stock: number;
```

**`@IsNegative()`**
El número debe ser menor a 0.

```typescript
@IsNegative({ message: 'Debe ser un número negativo' })
ajuste: number;
```

**`@Min(n)`**
Valor numérico mínimo permitido.

```typescript
@Min(0, { message: 'El valor mínimo permitido es 0' })
edad: number;
```

**`@Max(n)`**
Valor numérico máximo permitido.

```typescript
@Max(120, { message: 'El valor máximo permitido es 120' })
edad: number;
```

**`@IsDivisibleBy(n)`**
El número debe ser divisible entre `n`.

```typescript
@IsDivisibleBy(5, { message: 'Debe ser un múltiplo de 5' })
cantidadPorPaquete: number;
```

---

### ✅ Booleanos

**`@IsBoolean()`**
Valida que el valor sea `true` o `false`.

```typescript
@IsBoolean({ message: 'Debe ser un valor booleano (true/false)' })
activo: boolean;
```

**`@IsBooleanString()`**
Valida que sea un string que represente un booleano (`"true"` / `"false"`), útil en query params.

```typescript
@IsBooleanString({ message: 'Debe ser "true" o "false"' })
incluirInactivos: string;
```

---

### 📅 Fechas

**`@IsDate()`**
Valida que el valor sea una instancia de `Date` (requiere `@Type(() => Date)` de class-transformer para convertir el string entrante).

```typescript
@Type(() => Date)
@IsDate({ message: 'Debe ser una fecha válida' })
fechaRegistro: Date;
```

**`@MinDate(date)`**
Fecha mínima permitida.

```typescript
@MinDate(new Date('2020-01-01'), { message: 'La fecha no puede ser anterior a 2020' })
fechaEvento: Date;
```

**`@MaxDate(date)`**
Fecha máxima permitida.

```typescript
@MaxDate(new Date(), { message: 'La fecha no puede ser futura' })
fechaNacimiento: Date;
```

---

### 🎯 Enums y listas de valores

**`@IsEnum(EnumType)`**
Valida que el valor pertenezca a un enum definido.

```typescript
enum Rol {
    ADMIN = 'admin',
    USER = 'user',
}

@IsEnum(Rol, { message: 'El rol debe ser admin o user' })
rol: Rol;
```

**`@IsIn(array)`**
Valida que el valor esté dentro de un array de valores permitidos (más flexible que un enum).

```typescript
@IsIn(['pendiente', 'aprobado', 'rechazado'], {
    message: 'El estado debe ser pendiente, aprobado o rechazado',
})
estado: string;
```

**`@IsNotIn(array)`**
Valida que el valor NO esté dentro de un array (lo opuesto a `@IsIn`).

```typescript
@IsNotIn(['admin', 'root'], { message: 'Ese nombre de usuario está reservado' })
username: string;
```

---

### 📦 Arrays

**`@IsArray()`**
Valida que el valor sea un array.

```typescript
@IsArray({ message: 'Debe ser una lista' })
etiquetas: string[];
```

**`@ArrayNotEmpty()`**
El array no puede estar vacío.

```typescript
@ArrayNotEmpty({ message: 'Debe incluir al menos un elemento' })
etiquetas: string[];
```

**`@ArrayMinSize(n)`**
Cantidad mínima de elementos en el array.

```typescript
@ArrayMinSize(1, { message: 'Debe seleccionar al menos 1 categoría' })
categorias: string[];
```

**`@ArrayMaxSize(n)`**
Cantidad máxima de elementos en el array.

```typescript
@ArrayMaxSize(5, { message: 'No puede seleccionar más de 5 categorías' })
categorias: string[];
```

**`@ArrayUnique()`**
Los elementos del array no pueden repetirse.

```typescript
@ArrayUnique({ message: 'No puede haber elementos duplicados' })
etiquetas: string[];
```

**`@IsArray()` + `@IsString({ each: true })`**
Patrón para validar que sea un array **de strings** (la opción `each: true` aplica el decorador a cada elemento).

```typescript
@IsArray({ message: 'Debe ser una lista' })
@IsString({ each: true, message: 'Cada elemento debe ser texto' })
etiquetas: string[];
```

---

### ❓ Opcionales y condicionales

**`@IsOptional()`**
El campo puede no venir en el request; si viene, se valida con los demás decoradores.

```typescript
@IsOptional()
@IsString({ message: 'La biografía debe ser texto' })
bio?: string;
```

**`@ValidateIf((obj) => condicion)`**
Valida el campo solo si se cumple una condición basada en otras propiedades del DTO.

```typescript
@ValidateIf((dto) => dto.tipoDocumento === 'pasaporte')
@IsNotEmpty({ message: 'El número de pasaporte es obligatorio' })
numeroPasaporte?: string;
```

---

### 🧩 Objetos anidados

**`@ValidateNested()` + `@Type()`**
Para validar un objeto/DTO anidado dentro de otro. `@ValidateNested` le dice a class-validator que "entre" al objeto, y `@Type()` (de class-transformer) le dice qué clase usar para transformarlo.

```typescript
import { Type } from 'class-transformer';
import { ValidateNested, IsNotEmpty } from 'class-validator';

class DireccionDto {
    @IsNotEmpty({ message: 'La calle es obligatoria' })
    calle: string;

    @IsNotEmpty({ message: 'La ciudad es obligatoria' })
    ciudad: string;
}

export class CreateUserDto {
    // ...otros campos

    @ValidateNested({ message: 'La dirección no es válida' })
    @Type(() => DireccionDto)
    direccion: DireccionDto;
}
```

**Array de objetos anidados** (ej: lista de items en una orden):

```typescript
@ValidateNested({ each: true, message: 'Cada item debe ser válido' })
@Type(() => ItemDto)
items: ItemDto[];
```

---

### 🔗 Comparación entre campos

**`@Equals(value)`**
El valor debe ser exactamente igual al indicado.

```typescript
@Equals('acepto', { message: 'Debe escribir "acepto" para continuar' })
confirmacion: string;
```

**`@NotEquals(value)`**
El valor no debe ser igual al indicado.

```typescript
@NotEquals('123456', { message: 'La contraseña es demasiado común' })
password: string;
```

---

## 4. Tabla resumen rápida

| Decorador                               | Qué valida                   |
| --------------------------------------- | ---------------------------- |
| `@IsString()`                           | Es texto                     |
| `@IsNotEmpty()`                         | No está vacío                |
| `@MinLength(n)` / `@MaxLength(n)`       | Longitud mín/máx de texto    |
| `@Length(min, max)`                     | Longitud entre un rango      |
| `@Matches(regex)`                       | Cumple una expresión regular |
| `@IsEmail()`                            | Formato de correo            |
| `@IsUrl()`                              | Formato de URL               |
| `@IsUUID()`                             | Formato UUID                 |
| `@IsDateString()`                       | Fecha en string ISO          |
| `@IsPhoneNumber()`                      | Número telefónico válido     |
| `@IsNumber()` / `@IsInt()`              | Es número / entero           |
| `@IsPositive()` / `@IsNegative()`       | Signo del número             |
| `@Min(n)` / `@Max(n)`                   | Rango numérico               |
| `@IsBoolean()`                          | Es true/false                |
| `@IsDate()`                             | Es una fecha válida          |
| `@IsEnum(Enum)`                         | Pertenece a un enum          |
| `@IsIn([...])`                          | Está en una lista de valores |
| `@IsArray()`                            | Es un array                  |
| `@ArrayMinSize(n)` / `@ArrayMaxSize(n)` | Tamaño del array             |
| `@IsOptional()`                         | El campo es opcional         |
| `@ValidateIf(fn)`                       | Validación condicional       |
| `@ValidateNested()` + `@Type()`         | Valida objeto/DTO anidado    |

---

## 5. Ejemplo de DTO completo (referencia)

```typescript
import { Type } from 'class-transformer';
import {
    IsEmail,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from 'class-validator';

enum Rol {
    ADMIN = 'admin',
    USER = 'user',
}

class DireccionDto {
    @IsNotEmpty({ message: 'La calle es obligatoria' })
    calle: string;
}

export class CreateUserDto {
    @IsString({ message: 'El nombre de usuario debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
    @MinLength(3, { message: 'El nombre de usuario debe contener al menos 3 caracteres' })
    username: string;

    @IsEmail({}, { message: 'Debe ingresar un correo electrónico válido' })
    @IsNotEmpty({ message: 'El correo electrónico es requerido' })
    email: string;

    @IsString({ message: 'La contraseña debe ser texto' })
    @MinLength(8, { message: 'La contraseña debe tener mínimo 8 caracteres' })
    password: string;

    @IsInt({ message: 'La edad debe ser un número entero' })
    @Min(0, { message: 'La edad no puede ser negativa' })
    @Max(120, { message: 'La edad no es válida' })
    edad: number;

    @IsEnum(Rol, { message: 'El rol debe ser admin o user' })
    rol: Rol;

    @IsOptional()
    @IsString()
    @MaxLength(200, { message: 'La biografía no puede exceder 200 caracteres' })
    bio?: string;

    @ValidateNested({ message: 'La dirección no es válida' })
    @Type(() => DireccionDto)
    direccion: DireccionDto;
}
```
