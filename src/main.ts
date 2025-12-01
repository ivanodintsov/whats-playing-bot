import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as CookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { engine } from 'express-handlebars';
import { assets, section } from './hbs/helpers';
import { Logger } from './logger.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const CORS_WHITELIST = [process.env.FRONTEND_URL, process.env.SITE];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || CORS_WHITELIST.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Origin',
      'X-Requested-With',
      'Accept',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  app.useLogger(new Logger());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  app.use(CookieParser(process.env.COOKIE_SECRET));

  app.useStaticAssets(join(__dirname, '..', 'static'), {
    prefix: '/backend/static',
  });
  app.setBaseViewsDir(join(__dirname, '..', 'views'));

  app.engine(
    'hbs',
    engine({
      extname: 'hbs',
      defaultLayout: false,
      layoutsDir: join(__dirname, '..', 'views', 'layouts'),
      partialsDir: join(__dirname, '..', 'views', 'partials'),
      helpers: {
        assets: assets(),
        section: section(),
        gtmId: () => process.env.GTM_ID,
        ad1: () => process.env.AD_TAG1,
        ad2: () => process.env.AD_TAG2,
        siteUrl: () => process.env.FRONTEND_URL,
      },
      runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
      },
    }),
  );

  app.setViewEngine('hbs');
  app.setGlobalPrefix('backend');

  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);
}

bootstrap();
