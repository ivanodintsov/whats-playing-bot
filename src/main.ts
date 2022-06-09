import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as CookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { getBotToken } from 'nestjs-telegraf';
import { MAIN_BOT, SECOND_BOT } from './telegram/constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  app.use(CookieParser(process.env.COOKIE_SECRET));

  app.setBaseViewsDir(join(__dirname, '..', 'views'));
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
