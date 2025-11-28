import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as CookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { MAIN_BOT, SECOND_BOT } from './telegram/constants';
import { engine } from 'express-handlebars';

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const cluster = require('cluster');
// import * as os from 'os';

import { staticPrefix } from './constants';
import { assets, section } from './hbs/helpers';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // app.enableCors({
  //   origin: 'https://dev.sharemusic.cc',
  //   methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  //   preflightContinue: false,
  //   optionsSuccessStatus: 204,
  // });
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

  await app.listen(3000);
}

// if (cluster.isPrimary) {
//   const numCPUs = os.cpus().length;
//   for (let i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }
//   cluster.on('exit', worker => {
//     console.log(`Worker ${worker.process.pid} died`);
//     cluster.fork();
//   });
// } else {
//   bootstrap();
// }

bootstrap();
