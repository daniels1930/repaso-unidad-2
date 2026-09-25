# 🔐 Recetario de Autenticación en NestJS

> Guía de referencia con todos los procesos de autenticación y autorización más comunes en NestJS: hashing, login local, JWT, refresh tokens, OAuth2, roles, permisos, 2FA, recuperación de contraseña, y más.
>
> **Nota importante sobre este recetario:** no todas las secciones están implementadas en el proyecto base de este curso (el que ya trae JWT + permisos armado). Cada sección tiene un aviso que te dice si es lo que YA existe en el proyecto, algo que podés agregar con lo que ya está instalado, o algo que necesitaría dependencias nuevas (para otro taller o el mundo real). Fijate siempre en ese aviso antes de copiar código a ciegas.

---

## 0. Instalación de dependencias

> 🎯 **Úsalo en el examen cuando...:** necesites una técnica que el proyecto NO tiene instalada todavía (revisá primero el `package.json`: si ya está, no instales de nuevo). El proyecto base de este curso **ya trae** `bcrypt`, `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/jwt`, `@nestjs/config`. **NO trae** `passport-local`, `passport-google-oauth20`, `speakeasy`/`qrcode`, `@nestjs/throttler`, `cookie-parser`/`csurf` — si un taller te pide algo de eso, ahí sí instalás.

Este es el comando base que necesitas para casi todo el recetario:

```bash
npm install bcrypt
npm install @nestjs/passport passport passport-local
npm install @nestjs/passport passport passport-jwt @nestjs/jwt
npm install -D @types/passport-jwt
npm install @nestjs/jwt passport-jwt
npm install @nestjs/config
npm install @nestjs/throttler

# Tipos (si usas TypeScript)
npm install -D @types/bcrypt @types/passport-local @types/passport-jwt

# OAuth2 (opcional, según proveedor)
npm install passport-google-oauth20
npm install passport-github2

# 2FA (opcional)
npm install speakeasy qrcode
npm install -D @types/speakeasy @types/qrcode
```

---

## 1. Hashing de contraseñas

> 🎯 **Úsalo en el examen cuando...:** creás un `User` (o cualquier entidad con contraseña) — SIEMPRE hay que hashearla antes de guardar, nunca en texto plano. **✅ Esto es exactamente lo que hace el proyecto**, salvo un detalle: usa `SALT_ROUNDS` desde `.env` vía `ConfigService`, no el número `10` fijo.

Se usa **al crear el usuario**, nunca se guarda la contraseña en texto plano.

```typescript
import * as bcrypt from 'bcrypt';

// UserService
async create(createUserDto: CreateUserDto) {
  const role = await this.roleService.findOne(createUserDto.roleId);
  if (!role) {
    throw new RoleNotFoundException(createUserDto.roleId);
  }

  const passwordHashed = await bcrypt.hash(createUserDto.password, 10);

  const newUser = this.userRepository.create({
    ...createUserDto,
    passwordHash: passwordHashed,
    role,
  });

  return await this.userRepository.save(newUser);
}
```

> 💡 **Nota:** usa `password` en el DTO de entrada (texto plano) y `passwordHash` solo en la entidad/DB. Mezclar los nombres genera confusión.
>
> **Versión real del proyecto (con `SALT_ROUNDS` desde `.env`):**
>
> ```typescript
> const saltRounds = parseInt(this.configService.get<string>('SALT_ROUNDS') ?? '10', 10);
> const passwordHashed = await bcrypt.hash(userData.password, saltRounds);
> ```

El número `10` es el **salt rounds** (costo computacional). Valores típicos: 10–12. Más alto = más seguro pero más lento.

---

## 2. Comparación de contraseñas (base del login)

> 🎯 **Úsalo en el examen cuando...:** implementás el `login` — es el corazón de CUALQUIER estrategia de autenticación con contraseña. **✅ Se usa igual en el proyecto real**, aunque ahí se lanza `UnauthorizedException` genérica en vez de una excepción custom.

```typescript
const isMatch = await bcrypt.compare(plainPassword, user.passwordHash);
if (!isMatch) {
    throw new InvalidCredentialsException();
}
```

Esto es el corazón de **cualquier** estrategia de login que veas más abajo.

---

## 3. Login local (email + password) con Passport

> 🎯 **Úsalo en el examen cuando...:** te piden explícitamente una estrategia `passport-local` separada del `AuthService` (poco común si el proyecto ya funciona sin ella). **⚠️ OJO: el proyecto real de este curso NO usa esto.** El login real es directo: `AuthController.login()` recibe `email`+`password` en el body y llama a `authService.login(dto)` sin pasar por `AuthGuard('local')` ni por una `LocalStrategy`. Si copiás este bloque tal cual estarías agregando una capa que no está en el proyecto — no lo hagas salvo que el enunciado lo pida explícitamente.

### 3.1 Método `findByEmail` en `UserService`

```typescript
// user.service.ts
async findByEmail(email: string): Promise<User | null> {
  return this.userRepository.findOne({
    where: { email },
    relations: ['role'], // si necesitas el rol para el token
  });
}
```

### 3.2 `AuthService`

```typescript
// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
    constructor(private readonly userService: UserService) {}

    async validateUser(email: string, password: string) {
        const user = await this.userService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Correo no encontrado');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Contraseña incorrecta');
        }

        const { passwordHash, ...result } = user;
        return result;
    }

    async login(loginInput: LoginInputDto) {
        const user = await this.validateUser(loginInput.email, loginInput.password);
        return {
            message: 'Login exitoso',
            user,
        };
    }
}
```

> ⚠️ **Nota de seguridad:** separar los mensajes "correo no encontrado" vs "contraseña incorrecta" es más amigable, pero le da pistas a un atacante sobre qué correos existen (enumeración de usuarios). En producción muchos usan un mensaje genérico: `"Credenciales inválidas"`. Depende del nivel de seguridad que necesites. **El proyecto real usa mensajes separados** (`'Usuario no encontrado'` / `'Credenciales inválidas'`), así que para este curso está bien seguir ese estilo.

### 3.3 `LocalStrategy`

```typescript
// local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService) {
        super({ usernameField: 'email' }); // por defecto passport-local espera "username"
    }

    async validate(email: string, password: string) {
        return this.authService.validateUser(email, password);
    }
}
```

### 3.4 `AuthController`

```typescript
// auth.controller.ts
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginInputDto } from './dto/login-input.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @UseGuards(AuthGuard('local'))
    @Post('login')
    async login(@Request() req) {
        // req.user ya viene validado por LocalStrategy
        return this.authService.login(req.user);
    }
}
```

### 3.5 `AuthModule`

```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { UserModule } from '../user/user.module';

@Module({
    imports: [UserModule, PassportModule],
    providers: [AuthService, LocalStrategy],
    controllers: [AuthController],
})
export class AuthModule {}
```

---

## 4. Autenticación con JWT

> 🎯 **Úsalo en el examen cuando...:** necesitás proteger endpoints con un token que el cliente manda en cada request (`Authorization: Bearer ...`) — es la base de TODO el sistema de seguridad de este curso. **✅ Esto SÍ está implementado en el proyecto**, pero con diferencias importantes respecto al código genérico de abajo — leé la nota en 4.2 antes de copiar nada.

### 4.1 Generar el token en `AuthService`

> ⚠️ **Diferencia con el proyecto real:** acá el payload es `{ sub, email, role }`. El proyecto real firma `{ sub, email, permissions }` (el array completo de nombres de permisos), según su propia interfaz `JwtPayload`. Si agregás algo nuevo, respetá esa interfaz existente, no inventes una nueva.

```typescript
// auth.service.ts
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService, // se agrega
    ) {}

    // ...validateUser igual que antes

    async login(user: any) {
        const payload = { sub: user.id, email: user.email, role: user.role?.name };

        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }
}
```

### 4.2 `JwtStrategy`

> ⚠️ **ESTA es la parte más importante para no romper nada.** La versión de abajo (genérica) usa `process.env.JWT_SECRET` directo y en `validate()` devuelve el payload tal cual (`{ userId, email, role }`). **El proyecto real es distinto y hay que respetarlo así:**
>
> - Usa `ConfigService` para leer `JWT_SECRET`, y tira un `Error` en el constructor si no está configurado.
> - En `validate()`, **NO** devuelve el payload — recarga el `User` COMPLETO desde la base de datos con `usersService.findOne(payload.sub, true)`, trayendo `role.rolePermissions.permission`. Eso significa que `req.user` termina siendo una entidad `User` entera, no un objeto chico con 3 campos.
> - Esto es crítico porque el `PermissionsGuard` (sección 10) necesita leer `user.role.rolePermissions` — si copiás la versión genérica de abajo, le rompés el guard de permisos.

**Código genérico (NO copiar tal cual en este proyecto):**

```typescript
// jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    async validate(payload: any) {
        // esto se inyecta en req.user en cada ruta protegida
        return { userId: payload.sub, email: payload.email, role: payload.role };
    }
}
```

**Versión real del proyecto (esta es la que hay que seguir):**

```typescript
// jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { UserService } from '../user/user.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        configService: ConfigService,
        private readonly usersService: UserService,
    ) {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('La variable de entorno JWT_SECRET no está configurada');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: JwtPayload) {
        // recarga el User COMPLETO (con role + permisos) — req.user será esto
        const user = await this.usersService.findOne(payload.sub, true);
        if (!user) {
            throw new UnauthorizedException('El token no corresponde a un usuario activo');
        }
        return user;
    }
}
```

### 4.3 `JwtAuthGuard`

> ⚠️ **El proyecto real NO tiene esta clase separada.** Usa `AuthGuard('jwt')` directo e inline dentro de `@UseGuards(AuthGuard('jwt'), PermissionsGuard)` en cada controller. Crear esta clase no está mal, pero si la agregás, usala de forma consistente en TODOS los controllers (no mezclar estilos).

```typescript
// jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### 4.4 Usarlo en un controller protegido

```typescript
// user.controller.ts
import { UseGuards, Get, Request, Controller } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UserController {
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req) {
        return req.user; // viene de JwtStrategy.validate()
    }
}
```

> **Estilo real del proyecto (sin clase envoltorio):**
>
> ```typescript
> @UseGuards(AuthGuard('jwt'), PermissionsGuard)
> @Permissions('manage_users')
> @Get('profile')
> getProfile(@Request() req) {
>     return req.user;
> }
> ```

### 4.5 Configuración en `AuthModule`

```typescript
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        UserModule,
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '15m' }, // access token de corta duración
        }),
    ],
    providers: [AuthService, LocalStrategy, JwtStrategy],
    controllers: [AuthController],
})
export class AuthModule {}
```

> **Versión real del proyecto** (usa `registerAsync` + `ConfigService`, sin `LocalStrategy` ni `PassportModule` explícito):
>
> ```typescript
> JwtModule.registerAsync({
>     inject: [ConfigService],
>     useFactory: (config: ConfigService) => ({
>         secret: config.get<string>('JWT_SECRET') || 'defaultSecret',
>         signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '1h' },
>     }),
> }),
> ```

---

## 5. Refresh Tokens

> 🎯 **Úsalo en el examen cuando...:** te piden explícitamente "renovar el token sin volver a pedir contraseña" o "sesiones de larga duración". **❌ No implementado en el proyecto actual** (no hay columna `hashedRefreshToken` en `User`, ni endpoint `/auth/refresh`). Si un taller nuevo lo pide, tendrías que agregar esa columna a la entidad además de este código.

Permite renovar el `access_token` sin pedir credenciales de nuevo.

### 5.1 `AuthService` — generar par de tokens

```typescript
async login(user: any) {
  const payload = { sub: user.id, email: user.email };

  const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
  const refreshToken = this.jwtService.sign(payload, {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '7d',
  });

  // Guardamos el hash del refresh token en la BD (buena práctica)
  const hashedRefresh = await bcrypt.hash(refreshToken, 10);
  await this.userService.setRefreshToken(user.id, hashedRefresh);

  return { access_token: accessToken, refresh_token: refreshToken };
}

async refreshTokens(userId: string, refreshToken: string) {
  const user = await this.userService.findOne(userId);
  if (!user || !user.hashedRefreshToken) {
    throw new UnauthorizedException('Acceso denegado');
  }

  const matches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
  if (!matches) {
    throw new UnauthorizedException('Refresh token inválido');
  }

  return this.login(user); // genera un nuevo par
}
```

### 5.2 `RefreshTokenStrategy`

```typescript
// refresh-token.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_REFRESH_SECRET,
            passReqToCallback: true,
        });
    }

    validate(req: Request, payload: any) {
        const refreshToken = req.get('Authorization').replace('Bearer', '').trim();
        return { ...payload, refreshToken };
    }
}
```

### 5.3 `AuthController`

```typescript
@UseGuards(AuthGuard('jwt-refresh'))
@Post('refresh')
async refresh(@Request() req) {
  return this.authService.refreshTokens(req.user.sub, req.user.refreshToken);
}
```

---

## 6. OAuth2 (ejemplo con Google)

> 🎯 **Úsalo en el examen cuando...:** te piden "login con Google/GitHub". **❌ No implementado, ni la dependencia (`passport-google-oauth20`) está instalada.** Muy poco probable que aparezca en un parcial de este curso — es más típico de un proyecto final.

### 6.1 `GoogleStrategy`

```typescript
// google.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor() {
        super({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.API_URL}/auth/google/callback`,
            scope: ['email', 'profile'],
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) {
        const { emails, name } = profile;
        const user = {
            email: emails[0].value,
            firstName: name.givenName,
            lastName: name.familyName,
        };
        done(null, user);
    }
}
```

### 6.2 `AuthController`

```typescript
@Get('google')
@UseGuards(AuthGuard('google'))
async googleAuth() {
  // Passport redirige automáticamente a Google
}

@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleAuthRedirect(@Request() req) {
  // req.user viene del GoogleStrategy.validate()
  // Aquí: buscar o crear el usuario en tu BD (findByEmail o create)
  return this.authService.loginWithOAuth(req.user);
}
```

En `AuthService`, el patrón típico es: buscar por email con `userService.findByEmail`, y si no existe, crearlo automáticamente (sin password, o con uno random inutilizable) y luego emitir el JWT igual que en el login normal.

---

## 7. Guards personalizados (RBAC — roles)

> 🎯 **Úsalo en el examen cuando...:** el control de acceso es SOLO por rol simple, sin tabla de permisos (`admin` puede, `user` no puede). **⚠️ El proyecto real NO usa este patrón** — fue directo al modelo de permisos granulares (sección 10), que es más flexible. Si el proyecto ya tiene `@Permissions()` + `PermissionsGuard` armado, usá eso en vez de este `RolesGuard` — no mezcles los dos sistemas en el mismo proyecto.

### 7.1 Decorator `@Roles()`

```typescript
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

### 7.2 `RolesGuard`

```typescript
// roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
        if (!requiredRoles) return true;

        const { user } = context.switchToHttp().getRequest();
        return requiredRoles.includes(user.role);
    }
}
```

### 7.3 Uso combinado con JWT

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin-only')
getAdminData() {
  return { secret: 'solo admins ven esto' };
}
```

Este es el que conecta directamente con tu `RoleService` de la clase: al hacer `findByEmail` en el login, traes el `role` relacionado (`relations: ['role']`), lo metes en el `payload` del JWT, y el `RolesGuard` lo valida en cada request.

---

## 8. Decorator `@CurrentUser()`

> 🎯 **Úsalo en el examen cuando...:** necesitás el usuario logueado en varios controllers y no querés repetir `@Req() req` + tipar `AuthenticatedRequest` en cada uno. **⚠️ No existe todavía en el proyecto, pero es 100% compatible** con lo que ya está armado — se puede agregar sin romper nada.

Para no repetir `req.user` en cada controller:

```typescript
// current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
```

Uso:

```typescript
@UseGuards(JwtAuthGuard)
@Get('me')
getMe(@CurrentUser() user: any) {
  return user;
}
```

---

## 9. Rutas públicas dentro de un módulo protegido globalmente

> 🎯 **Úsalo en el examen cuando...:** hay (o te piden armar) un guard GLOBAL de autenticación (`APP_GUARD`) y necesitás dejar rutas abiertas como login/registro. **⚠️ No aplica al proyecto actual** — el profe NO protege todo globalmente, cada controller pone `@UseGuards(...)` a mano donde corresponde. Si nunca te piden un guard global, no necesitás esto.

```typescript
// public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
// jwt-auth.guard.ts (versión mejorada)
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;
        return super.canActivate(context);
    }
}
```

```typescript
@Public()
@Post('login')
async login(...) { ... }
```

---

## 10. Permisos granulares (permission-based)

> 🎯 **Úsalo en el examen cuando...:** el enunciado dice "limitar el acceso según los permisos del usuario" — **✅ esto es EXACTAMENTE lo que ya está armado en el proyecto** (`@Permissions()` + `PermissionsGuard`). Es la sección más importante de todo este recetario para este curso. Ojo: la versión genérica de abajo es más simple que la real — no lanza excepciones, solo devuelve `true`/`false`. Usá la versión real (más abajo) para que las respuestas de error sean correctas.

Más flexible que roles fijos cuando necesitas control fino.

```typescript
// permission.entity.ts
// Role -> tiene muchos Permission (many-to-many)

// permissions.guard.ts (versión genérica, simplificada)
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
        if (!requiredPermissions) return true;

        const { user } = context.switchToHttp().getRequest();
        const userPermissions: string[] = user.role.permissions.map((p) => p.name);

        return requiredPermissions.every((p) => userPermissions.includes(p));
    }
}
```

```typescript
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('users:delete')
@Delete(':id')
remove(@Param('id') id: string) { ... }
```

**Versión real del proyecto (con excepciones correctas — usá esta):**

```typescript
// permissions.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User } from '../entities/user.entity';

interface AuthenticatedRequest extends Request {
    user?: User;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, context.getHandler());
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const user = request.user;
        if (!user) {
            throw new UnauthorizedException('Usuario no autenticado en la solicitud');
        }

        const userPermissions = user.role?.rolePermissions?.map((rp) => rp.permission.name) ?? [];
        const hasAllRequiredPermissions = requiredPermissions.every((permission) =>
            userPermissions.includes(permission),
        );

        if (!hasAllRequiredPermissions) {
            throw new ForbiddenException('Acceso denegado: No cuentas con los permisos suficientes para esta acción');
        }
        return true;
    }
}
```

```typescript
// permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
```

---

## 11. Autenticación de dos factores (2FA con TOTP)

> 🎯 **Úsalo en el examen cuando...:** te piden "código de verificación adicional al iniciar sesión". **❌ No implementado, dependencias (`speakeasy`, `qrcode`) no instaladas.** Muy poco probable en este curso.

### 11.1 Generar el secreto y QR

```typescript
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

async generate2FASecret(user: User) {
  const secret = speakeasy.generateSecret({ name: `MiApp (${user.email})` });

  await this.userService.setTwoFactorSecret(user.id, secret.base32);

  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
  return { secret: secret.base32, qrCodeUrl };
}
```

### 11.2 Verificar el código

```typescript
verify2FACode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1, // tolerancia de tiempo
  });
}
```

### 11.3 Flujo de login con 2FA

```typescript
async login(loginInput: LoginInputDto) {
  const user = await this.validateUser(loginInput.email, loginInput.password);

  if (user.isTwoFactorEnabled) {
    if (!loginInput.twoFactorCode) {
      return { requiresTwoFactor: true }; // el frontend pide el código
    }
    const isValid = this.verify2FACode(user.twoFactorSecret, loginInput.twoFactorCode);
    if (!isValid) {
      throw new UnauthorizedException('Código 2FA inválido');
    }
  }

  return this.generateTokens(user);
}
```

---

## 12. Recuperación de contraseña (forgot / reset password)

> 🎯 **Úsalo en el examen cuando...:** te piden "olvidé mi contraseña" / "resetear contraseña por correo". **⚠️ No implementado, pero SÍ es viable con lo que ya está instalado** (solo usa `JwtService`, que el proyecto ya tiene) — necesitarías agregar un `MailService` propio o simularlo con un `console.log` si no hay envío de correo real configurado.

```typescript
// 1. Solicitar reset
async forgotPassword(email: string) {
  const user = await this.userService.findByEmail(email);
  if (!user) return; // no revelar si el correo existe o no

  const resetToken = this.jwtService.sign(
    { sub: user.id },
    { secret: process.env.JWT_RESET_SECRET, expiresIn: '15m' },
  );

  // enviar por correo (con un servicio de mail)
  await this.mailService.sendResetPasswordEmail(user.email, resetToken);
}

// 2. Confirmar reset
async resetPassword(token: string, newPassword: string) {
  let payload: any;
  try {
    payload = this.jwtService.verify(token, { secret: process.env.JWT_RESET_SECRET });
  } catch {
    throw new BadRequestException('Token inválido o expirado');
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await this.userService.updatePassword(payload.sub, newHash);
}
```

---

## 13. Verificación de correo electrónico al registrarse

> 🎯 **Úsalo en el examen cuando...:** te piden que la cuenta quede "pendiente de verificación" hasta confirmar el correo. **❌ No implementado.** Igual que la sección 12, técnicamente viable pero necesita un `MailService`.

```typescript
async register(createUserDto: CreateUserDto) {
  const user = await this.userService.create(createUserDto); // isEmailVerified: false por defecto

  const verifyToken = this.jwtService.sign(
    { sub: user.id },
    { secret: process.env.JWT_VERIFY_SECRET, expiresIn: '1d' },
  );

  await this.mailService.sendVerificationEmail(user.email, verifyToken);
  return { message: 'Revisa tu correo para verificar tu cuenta' };
}

async verifyEmail(token: string) {
  const payload = this.jwtService.verify(token, { secret: process.env.JWT_VERIFY_SECRET });
  await this.userService.markEmailAsVerified(payload.sub);
  return { message: 'Correo verificado correctamente' };
}
```

> 💡 Combina esto con un `EmailVerifiedGuard` si quieres bloquear el login hasta que el correo esté verificado.

---

## 14. JWT en cookies httpOnly (alternativa a Authorization header)

> 🎯 **Úsalo en el examen cuando...:** te piden explícitamente que el token viaje en una cookie en vez del header `Authorization`. **❌ No implementado** — el proyecto usa `ExtractJwt.fromAuthHeaderAsBearerToken()` (header `Authorization: Bearer ...`), no cookies. Si lo usás, hay que cambiar también el `jwtFromRequest` de la `JwtStrategy`.

Más seguro contra XSS que guardar el token en `localStorage`.

```typescript
// auth.controller.ts
@Post('login')
async login(@Body() loginInput: LoginInputDto, @Res({ passthrough: true }) res: Response) {
  const { access_token, refresh_token, user } = await this.authService.login(loginInput);

  res.cookie('access_token', access_token, {
    httpOnly: true,
    secure: true, // solo HTTPS en producción
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refresh_token', refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { user };
}
```

Y en la `JwtStrategy`, cambiar el `jwtFromRequest` para extraer de la cookie en lugar del header:

```typescript
jwtFromRequest: ExtractJwt.fromExtractors([
  (req) => req?.cookies?.access_token,
]),
```

---

## 15. API Keys (autenticación máquina a máquina)

> 🎯 **Úsalo en el examen cuando...:** el endpoint lo consume OTRO SERVICIO, no un usuario humano con login (ej. un webhook). **❌ No implementado.** Poco probable en un examen de este curso, que se centra en usuarios con JWT.

Para endpoints consumidos por otros servicios, no por usuarios humanos.

```typescript
// api-key.guard.ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];
        return apiKey === process.env.INTERNAL_API_KEY;
    }
}
```

```typescript
@UseGuards(ApiKeyGuard)
@Post('webhook')
handleWebhook(@Body() payload: any) { ... }
```

Para algo más robusto: guardar API keys hasheadas en BD, asociadas a un cliente/servicio, con scopes y expiración.

---

## 16. Rate limiting / protección contra fuerza bruta

> 🎯 **Úsalo en el examen cuando...:** te piden "limitar los intentos de login" o "evitar fuerza bruta". **❌ No implementado, `@nestjs/throttler` no está instalado.** Si te lo piden, hay que instalar la dependencia primero (sección 0).

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
    imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]), // 5 intentos por minuto
    ],
})
export class AppModule {}
```

```typescript
// auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login(...) { ... }
```

Esto evita que alguien pruebe miles de contraseñas por fuerza bruta contra `/auth/login`.

---

## 17. Logout y revocación de tokens

> 🎯 **Úsalo en el examen cuando...:** te piden un endpoint de "cerrar sesión" que realmente invalide el token (no solo borrarlo del lado del cliente). **❌ No implementado** — como el JWT es _stateless_, esto requiere guardar algo en BD (refresh token) o en Redis (blacklist), ninguno de los dos existe hoy en el proyecto.

Como el JWT es _stateless_, "cerrar sesión" requiere una estrategia extra:

```typescript
// Opción A: invalidar el refresh token guardado en BD
async logout(userId: string) {
  await this.userService.setRefreshToken(userId, null);
  return { message: 'Sesión cerrada' };
}
```

```typescript
// Opción B: blacklist de access tokens (Redis, por ejemplo)
async logout(token: string) {
  const decoded = this.jwtService.decode(token) as any;
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  await this.redisService.set(`blacklist:${token}`, true, ttl);
}

// Y en el JwtStrategy o un guard, verificar contra la blacklist antes de aceptar el token.
```

---

## 18. CSRF protection (si usas cookies/sesiones)

> 🎯 **Úsalo en el examen cuando...:** usás autenticación por COOKIES (sección 14). **❌ No aplica al proyecto actual**, que usa `Authorization` header, donde CSRF no es un problema de la misma forma.

```bash
npm install csurf cookie-parser
```

```typescript
// main.ts
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';

app.use(cookieParser());
app.use(csurf({ cookie: true }));
```

> Nota: solo es relevante si usas **cookies** para auth (sección 14). Si usas JWT por `Authorization` header, CSRF no aplica de la misma forma.

---

## 19. Manejo de errores de autenticación (excepciones custom)

> 🎯 **Úsalo en el examen cuando...:** te piden "mejorar el manejo de errores del login/auth" o mantener el mismo formato de excepción que el resto del proyecto. **⚠️ Parcial:** el proyecto SÍ tiene `RoleNotFoundException`/`UserNotFoundException` con formato `{ error, message, code }`, pero el login usa `UnauthorizedException` genérica (`'Credenciales inválidas'`), no una `InvalidCredentialsException` propia. Si te piden pulir esto, seguí el mismo formato que `UserNotFoundException`.

```typescript
// exceptions/invalid-credentials.exception.ts
import { UnauthorizedException } from '@nestjs/common';

export class InvalidCredentialsException extends UnauthorizedException {
    constructor() {
        super('Credenciales inválidas');
    }
}

// exceptions/role-not-found.exception.ts
import { NotFoundException } from '@nestjs/common';

export class RoleNotFoundException extends NotFoundException {
    constructor(roleId: string) {
        super(`El rol con id ${roleId} no existe`);
    }
}

// exceptions/email-already-exists.exception.ts
import { ConflictException } from '@nestjs/common';

export class EmailAlreadyExistsException extends ConflictException {
    constructor(email: string) {
        super(`El correo ${email} ya está registrado`);
    }
}
```

Uso:

```typescript
if (!role) {
    throw new RoleNotFoundException(createUserDto.roleId);
}
```

Con un `ExceptionFilter` global puedes estandarizar el formato de respuesta de error en toda la API.

---

## 20. Tabla resumen — ¿qué sección uso según lo que me piden?

Agrupada por tema, con link directo a cada sección. Las marcadas **✅** ya están implementadas en el proyecto real; **⚠️** son viables con lo ya instalado; **❌** necesitan dependencias nuevas.

### 🔑 A. Fundamentos (siempre aplican en este curso)

| Necesitás...                                        | Sección                                            | Estado |
| --------------------------------------------------- | -------------------------------------------------- | ------ |
| Hashear una contraseña antes de guardarla           | [#1](#1-hashing-de-contraseñas)                    | ✅     |
| Comparar contraseña en el login                     | [#2](#2-comparación-de-contraseñas-base-del-login) | ✅     |
| Generar y validar un JWT (login + strategy + guard) | [#4](#4-autenticación-con-jwt)                     | ✅     |

### 🛂 B. Autorización

| Necesitás...                                                | Sección                                                           | Estado                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------- |
| Guard simple por rol (`admin`/`user`)                       | [#7](#7-guards-personalizados-rbac--roles)                        | ⚠️ (no usado, preferí permisos) |
| Decorador `@CurrentUser()`                                  | [#8](#8-decorator-currentuser)                                    | ⚠️                              |
| Rutas públicas con guard global (`@Public()`)               | [#9](#9-rutas-públicas-dentro-de-un-módulo-protegido-globalmente) | ⚠️ (no hay guard global)        |
| Permisos granulares (`@Permissions()` + `PermissionsGuard`) | [#10](#10-permisos-granulares-permission-based)                   | ✅                              |

### 🔄 C. Sesión avanzada

| Necesitás...                            | Sección                                  | Estado |
| --------------------------------------- | ---------------------------------------- | ------ |
| Refresh tokens (renovar sin re-loguear) | [#5](#5-refresh-tokens)                  | ❌     |
| Logout real / revocación de tokens      | [#17](#17-logout-y-revocación-de-tokens) | ❌     |

### 🌐 D. Login alternativo

| Necesitás...                                                  | Sección                                           | Estado                          |
| ------------------------------------------------------------- | ------------------------------------------------- | ------------------------------- |
| Login local con `passport-local` (separado del `AuthService`) | [#3](#3-login-local-email--password-con-passport) | ⚠️ (proyecto usa login directo) |
| Login social (Google, GitHub)                                 | [#6](#6-oauth2-ejemplo-con-google)                | ❌                              |

### 🔒 E. Seguridad extra

| Necesitás...                               | Sección                                                               | Estado                    |
| ------------------------------------------ | --------------------------------------------------------------------- | ------------------------- |
| Segundo factor de autenticación (2FA/TOTP) | [#11](#11-autenticación-de-dos-factores-2fa-con-totp)                 | ❌                        |
| JWT en cookies httpOnly en vez de header   | [#14](#14-jwt-en-cookies-httponly-alternativa-a-authorization-header) | ❌                        |
| Autenticación máquina a máquina (API Keys) | [#15](#15-api-keys-autenticación-máquina-a-máquina)                   | ❌                        |
| Rate limiting contra fuerza bruta          | [#16](#16-rate-limiting--protección-contra-fuerza-bruta)              | ❌                        |
| Protección CSRF                            | [#18](#18-csrf-protection-si-usas-cookiessesiones)                    | ❌ (solo si usás cookies) |

### 👤 F. Gestión de cuenta

| Necesitás...                    | Sección                                                      | Estado |
| ------------------------------- | ------------------------------------------------------------ | ------ |
| Recuperar contraseña por correo | [#12](#12-recuperación-de-contraseña-forgot--reset-password) | ⚠️     |
| Verificar correo al registrarse | [#13](#13-verificación-de-correo-electrónico-al-registrarse) | ⚠️     |

### ⚠️ G. Manejo de errores

| Necesitás...                        | Sección                                                          | Estado |
| ----------------------------------- | ---------------------------------------------------------------- | ------ |
| Excepciones custom de autenticación | [#19](#19-manejo-de-errores-de-autenticación-excepciones-custom) | ⚠️     |

---

### 📦 Estructura de carpetas sugerida

```
src/
├── auth/
│   ├── dto/
│   │   ├── login-input.dto.ts
│   │   └── register.dto.ts
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── current-user.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   ├── permissions.guard.ts
│   │   └── api-key.guard.ts
│   ├── strategies/
│   │   ├── local.strategy.ts
│   │   ├── jwt.strategy.ts
│   │   ├── refresh-token.strategy.ts
│   │   └── google.strategy.ts
│   ├── exceptions/
│   │   ├── invalid-credentials.exception.ts
│   │   └── role-not-found.exception.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── auth.module.ts
└── user/
    ├── user.service.ts   // findByEmail, create, updatePassword, etc.
    ├── user.controller.ts
    └── user.module.ts
```
