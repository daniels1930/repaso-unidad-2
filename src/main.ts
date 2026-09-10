import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error) => {
    console.error('Error al iniciar la aplicación:', error);
    process.exit(1);
});
