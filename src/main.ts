import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as CookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { getBotToken } from 'nestjs-telegraf';

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

  const bot = app.get(getBotToken());
  app.use(bot.webhookCallback(process.env.TELEGRAM_BOT_WEBHOOK_PATH));

  await app.listen(3000);
}
bootstrap();
