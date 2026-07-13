import { OnQueueFailed, Process, InjectQueue, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Logger } from 'src/logger';
import { Message } from 'src/bot-core/message/message';
import { AbstractBotService } from 'src/bot-core/bot.service';
import { Inject } from '@nestjs/common';
import { BOT_QUEUE } from 'src/bot-core/constants';
import {
  MusicServiceData,
  ShareSongConfig,
  ShareSongData,
} from 'src/bot-core/types';
import {
  MAIN_TELEGRAM_BOT_SERVICE_NAME,
  SECOND_TELEGRAM_BOT_SERVICE_NAME,
} from '../telegram/constants';
import { CLIENT_PROVIDES, MUSIC_SERVICE_PROVIDERS } from 'src/constants';

export type ShareSongJobData = { message: Message; config: ShareSongConfig };

export type UpdateShareJobData = {
  message: Message;
  messageToUpdate: Message;
  data: ShareSongData;
  config: ShareSongConfig;
  musicService: MusicServiceData;
};

export type SearchJobData = {
  message: Message;
};

export type PostToChatsJobData = {
  message: Message;
  data: ShareSongData;
  config: ShareSongConfig;
};

export type SignUpJobData = {
  message: Message;
};

export type DisconnectMusicServiceJobData = {
  message: Message;
};

export type AddSongToQueueJobData = {
  message: Message;
};

export type PlaySongJobData = {
  message: Message;
};

export type PreviousSongActionJobData = {
  message: Message;
};

export type NextSongActionJobData = {
  message: Message;
};

export type ToggleFavoriteJobData = {
  message: Message;
};

export type GetProfileJobData = {
  message: Message;
};

export type TogglePlayJobData = {
  message: Message;
};

export type NextSongJobData = {
  message: Message;
};

export type PreviousSongJobData = {
  message: Message;
};

export type UnlinkServiceJobData = {
  message: Message;
  serviceProvider: MUSIC_SERVICE_PROVIDERS;
};

export type SendConnectedSuccessfullyJobData = {
  chatId: string;
  platformInstance: CLIENT_PROVIDES;
  musicServiceName: string;
};

export type ShareQueueJobData =
  | ShareSongJobData
  | UpdateShareJobData
  | SearchJobData
  | PostToChatsJobData
  | SignUpJobData
  | PlaySongJobData
  | AddSongToQueueJobData
  | PreviousSongActionJobData
  | NextSongActionJobData
  | ToggleFavoriteJobData
  | GetProfileJobData
  | TogglePlayJobData
  | NextSongJobData
  | PreviousSongJobData
  | UnlinkServiceJobData
  | SendConnectedSuccessfullyJobData
  | DisconnectMusicServiceJobData;

@Processor(BOT_QUEUE)
export class BotProcessor {
  private readonly logger = new Logger(BotProcessor.name);
  private readonly botServices: Record<CLIENT_PROVIDES, AbstractBotService>;
  private readonly postToChatBotServices: Record<
    CLIENT_PROVIDES,
    AbstractBotService
  >;

  constructor(
    @InjectQueue(BOT_QUEUE)
    private readonly botQueue: Queue<ShareQueueJobData>,

    @Inject(MAIN_TELEGRAM_BOT_SERVICE_NAME)
    private telegramMainBotService: AbstractBotService,

    @Inject(SECOND_TELEGRAM_BOT_SERVICE_NAME)
    private telegramSecondBotService: AbstractBotService,
  ) {
    this.botServices = {
      [CLIENT_PROVIDES.TELEGRAM]: telegramMainBotService,
      [CLIENT_PROVIDES.TELEGRAM_2]: telegramSecondBotService,
    };

    this.postToChatBotServices = {
      [CLIENT_PROVIDES.TELEGRAM]: telegramMainBotService,
      [CLIENT_PROVIDES.TELEGRAM_2]: telegramMainBotService,
    };
  }

  private getBotService(message: Message) {
    return this.botServices[message.provider];
  }

  private getPostToChatBotService(message: Message) {
    return this.postToChatBotServices[message.provider];
  }

  @Process({
    name: 'shareSong',
    concurrency: 20,
  })
  private async shareSong(job: Job<ShareSongJobData>) {
    const botService = this.getBotService(job.data.message);

    await botService.processShare(job.data.message, job.data.config);
  }

  @Process({
    name: 'updateShare',
    concurrency: 20,
  })
  private async updateShare(job: Job<UpdateShareJobData>) {
    const botService = this.getBotService(job.data.message);

    await botService.processUpdateShare(
      job.data.message,
      job.data.messageToUpdate,
      job.data.data,
      job.data.config,
    );

    try {
      await this.botQueue.add(
        'postToChat',
        {
          message: job.data.message,
          data: job.data.data,
          config: job.data.config,
        },
        {
          attempts: 5,
          removeOnComplete: true,
        },
      );
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Process({
    name: 'postToChat',
    concurrency: 20,
  })
  private async postToChat(job: Job<PostToChatsJobData>) {
    const botService = this.getPostToChatBotService(job.data.message);
    await botService.sendSongToChats(
      job.data.message,
      job.data.data,
      job.data.config,
    );
  }

  @Process({
    name: 'signUp',
    concurrency: 10,
  })
  private async signUp(job: Job<SignUpJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.signUpProcess(job.data.message);
  }

  @Process({
    name: 'disconnectMusicService',
    concurrency: 10,
  })
  private async disconnectMusicService(job: Job<SignUpJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.disconnectMusicServiceProcess(job.data.message);
  }

  @Process({
    name: 'playSong',
    concurrency: 10,
  })
  private async playSong(job: Job<SignUpJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.playSongProcess(job.data.message);
  }

  @Process({
    name: 'addSongToQueue',
    concurrency: 10,
  })
  private async addSongToQueue(job: Job<AddSongToQueueJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.addSongToQueueProcess(job.data.message);
  }

  @Process({
    name: 'previousSongAction',
    concurrency: 10,
  })
  private async previousSongAction(job: Job<PreviousSongActionJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.previousSongActionProcess(job.data.message);
  }

  @Process({
    name: 'nextSongAction',
    concurrency: 10,
  })
  private async nextSongAction(job: Job<NextSongActionJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.nextSongActionProcess(job.data.message);
  }

  @Process({
    name: 'toggleFavorite',
    concurrency: 10,
  })
  private async toggleFavorite(job: Job<ToggleFavoriteJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.toggleFavoriteProcess(job.data.message);
  }

  @Process({
    name: 'getProfile',
    concurrency: 10,
  })
  private async getProfile(job: Job<GetProfileJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.getProfileProcess(job.data.message);
  }

  @Process({
    name: 'togglePlay',
    concurrency: 10,
  })
  private async togglePlay(job: Job<TogglePlayJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.togglePlayProcess(job.data.message);
  }

  @Process({
    name: 'nextSong',
    concurrency: 10,
  })
  private async nextSong(job: Job<NextSongJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.nextSongProcess(job.data.message);
  }

  @Process({
    name: 'previousSong',
    concurrency: 10,
  })
  private async previousSong(job: Job<PreviousSongJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.previousSongProcess(job.data.message);
  }

  @Process({
    name: 'unlinkService',
    concurrency: 10,
  })
  private async unlinkService(job: Job<UnlinkServiceJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.unlinkServiceProcess(
      job.data.message,
      job.data.serviceProvider,
    );
  }

  @Process({
    name: 'sendConnectedSuccessfully',
    concurrency: 10,
  })
  private async sendConnectedSuccessfully(
    job: Job<SendConnectedSuccessfullyJobData>,
  ) {
    const botService = this.botServices[job.data.platformInstance];
    await botService.sender.sendConnectedSuccessfullyProcess(job.data.chatId);
  }

  @Process({
    name: 'inlineQuery',
    concurrency: 20,
  })
  private async inlineQuery(job: Job<SearchJobData>) {
    const botService = this.getBotService(job.data.message);
    await botService.processSearch(job.data.message);
  }

  @OnQueueFailed()
  private onError(job: Job<ShareQueueJobData>, error: any) {
    this.logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }
}
