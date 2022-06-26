import { Inject, Injectable } from '@nestjs/common';
import { Context, SlashCommand, On, ContextOf } from 'necord';
import { CommandInteraction, Client } from 'discord.js';
import { DiscordMessage } from './message/message';
import { ACTIONS, BOT_SERVICE } from 'src/bot-core/constants';
import { AbstractBotService } from 'src/bot-core/bot.service';
import { MessageButton } from 'discord.js';

'use strict';

@Injectable()
export class AppCommandsService {
  constructor(
    @Inject(BOT_SERVICE)
    private readonly botService: AbstractBotService,

    private readonly client: Client,
  ) {}

  @SlashCommand('connect', 'Connect service')
  public async onConnect(@Context() [interaction]: [CommandInteraction]) {
    await interaction.reply('Loading');
    const message = await interaction.fetchReply();

    await this.botService.singUp(
      new DiscordMessage(interaction.channel, message),
    );
  }

  @SlashCommand('share', 'Share current playing song')
  public async onPing(@Context() [interaction]: [CommandInteraction]) {
    await interaction.reply('Loading');
    const message = await interaction.fetchReply();

    await this.botService.shareSong(
      new DiscordMessage(interaction.channel, message),
    );
  }

  @SlashCommand('unlink_spotify', 'Unlink Spotify service')
  public async onUnlinkSpotify(@Context() [interaction]: [CommandInteraction]) {
    await interaction.reply('Loading');
    const message = await interaction.fetchReply();

    await this.botService.unlinkService(
      new DiscordMessage(interaction.channel, message),
    );
  }

  @On('interactionCreate')
  public async onInteractionCreate(
    @Context() [interaction]: ContextOf<'interactionCreate'>,
  ) {
    if (!interaction.isButton()) return;

    const message = await interaction.deferUpdate({ fetchReply: true });

    const domainMessage = new DiscordMessage(
      interaction.channel,
      message,
      interaction.component as MessageButton,
    );

    if (interaction.customId.startsWith(ACTIONS.PLAY_ON_SPOTIFY)) {
      await this.botService.playSong(domainMessage);
    } else if (interaction.customId.startsWith(ACTIONS.NEXT)) {
      await this.botService.nextSongAction(domainMessage);
    } else if (interaction.customId.startsWith(ACTIONS.PREVIOUS)) {
      await this.botService.previousSongAction(domainMessage);
    } else if (interaction.customId.startsWith(ACTIONS.ADD_TO_QUEUE_SPOTIFY)) {
      await this.botService.addSongToQueue(domainMessage);
    } else if (interaction.customId.startsWith(ACTIONS.ADD_TO_FAVORITE)) {
      await this.botService.toggleFavorite(domainMessage);
    }
  }
}
