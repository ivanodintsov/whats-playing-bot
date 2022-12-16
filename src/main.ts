import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as CookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { getBotToken } from 'nestjs-telegraf';
import { MAIN_BOT, SECOND_BOT } from './telegram/constants';
import { engine } from 'express-handlebars';

import { staticPrefix } from './constants';
import { assets, section } from './hbs/helpers';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  app.use(CookieParser(process.env.COOKIE_SECRET));

  app.useStaticAssets(join(__dirname, '..', 'static'), {
    prefix: staticPrefix,
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
      },
    }),
  );

  app.setViewEngine('hbs');
  app.setGlobalPrefix('backend');

  const mainBot = app.get(getBotToken(MAIN_BOT));
  app.use(mainBot.webhookCallback(process.env.TELEGRAM_BOT_WEBHOOK_PATH));

  const secondBot = app.get(getBotToken(SECOND_BOT));
  app.use(
    secondBot.webhookCallback(process.env.TELEGRAM_SECOND_BOT_WEBHOOK_PATH),
  );

  await app.listen(3000);
}
bootstrap();
