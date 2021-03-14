import { Context } from 'nestjs-telegraf';

export const SpotifyGuard = function (targetClass: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(ctx: Context) => Promise<void>>) {
  const originalFn = descriptor.value;

  descriptor.value = async function (ctx: Context) {
    const tokens = await this.spotifyService.updateTokens({
      tg_id: `${ctx.from.id}`,
    });

    if (!tokens) {
      throw new Error('NO_TOKEN');
    }

    ctx.spotify = {
      tokens,
    };
    
    return originalFn.call(this, ctx);
  }

  return descriptor;
};
