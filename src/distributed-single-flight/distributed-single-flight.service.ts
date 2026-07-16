import * as crypto from 'crypto';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import {
  DISTRIBUTED_SINGLE_FLIGHT,
  DISTRIBUTED_SINGLE_FLIGHT_SUB,
} from './constants';
import { Logger } from 'src/logger.service';
import { TimeoutException } from './errors/TimeoutException';
import { DistributedLockService } from './distributed-lock/distributed-lock.service';
import { REDIS_WITH_CUSTOM_METHODS } from 'src/redis/redis-with-custom-methods/constants';
import { RedisWithScripts } from 'src/redis/redis-with-custom-methods/types';
import {
  CreateOwnerOptions,
  CreateWaiterOptions,
  ExecuteOptions,
  MessageData,
  MessageDataError,
  MessageDataSuccess,
  ResolversState,
  SINGLE_FLIGHT_ROLE,
  SingleFlight,
  SingleFlightCaller,
  SingleFlightWaiter,
  WaitOptions,
} from './types';
import { createDeferredPromise } from 'src/utils/createDeferredPromise';

@Injectable()
export class DistributedSingleFlightService implements OnModuleInit {
  private readonly logger = new Logger(DistributedSingleFlightService.name);
  private readonly resolversMap: Map<string, ResolversState> = new Map();

  constructor(
    @Inject(REDIS_WITH_CUSTOM_METHODS)
    private readonly publisher: RedisWithScripts,

    @Inject(DISTRIBUTED_SINGLE_FLIGHT_SUB)
    private readonly subscriber: Redis,

    private readonly distributedLockService: DistributedLockService,
  ) {}

  async onModuleInit() {
    await this.subscribeToService();
  }

  async execute<T1 extends object, T2>(
    options: ExecuteOptions<T1, T2>,
  ): Promise<T2> {
    const flight = await this.wait<T1>({
      channel: options.channel,
      key: options.key,
      timeout: options.timeout,
    });

    if (flight.role === SINGLE_FLIGHT_ROLE.WAITER) {
      const response = await flight.promise;
      return options.waiter(response);
    }

    try {
      const ownerRespone = await options.owner(flight);

      await flight.complete(ownerRespone);

      return options.waiter(ownerRespone);
    } catch (error) {
      await flight.fail(error as Error);
      throw error;
    }
  }

  async wait<T extends object>({
    channel,
    key,
    timeout,
  }: WaitOptions): Promise<SingleFlight<T>> {
    const resolversKey = this.getKey({ channel, key });
    const id = crypto.randomUUID();
    const lock = await this.distributedLockService.lock(
      resolversKey,
      id,
      timeout,
    );

    if (lock) {
      return this.createOwner({
        channel,
        key,
        timeout,
        id,
      });
    } else {
      return this.createWaiter<T>({
        channel,
        key,
        id,
      });
    }
  }

  private createOwner({ channel, key, id, timeout }: CreateOwnerOptions) {
    const resolversKey = this.getKey({ channel, key });
    let state = this.resolversMap.get(resolversKey);

    if (!state) {
      state = {
        id,
        channel,
        key,
        role: SINGLE_FLIGHT_ROLE.OWNER,
        resolvers: [],
        finished: false,
        timeout: null,
      };
      this.resolversMap.set(resolversKey, state);
    } else {
      state.timeout?.cancel();
      state.id = id;
      state.role = SINGLE_FLIGHT_ROLE.OWNER;
    }

    const caller: SingleFlightCaller = {
      role: SINGLE_FLIGHT_ROLE.OWNER,
      complete: this.createComplete(state),
      fail: this.createFail(state),
    };

    const timeoutPromise = this.timeoutPromise(caller, timeout);

    state.timeout = timeoutPromise;

    return caller;
  }

  private createWaiter<T>({
    channel,
    key,
    id,
  }: CreateWaiterOptions): SingleFlightWaiter<T> {
    const resolversKey = this.getKey({ channel, key });
    let state = this.resolversMap.get(resolversKey);

    if (!state) {
      state = {
        id,
        channel,
        key,
        role: SINGLE_FLIGHT_ROLE.WAITER,
        finished: false,
        resolvers: [],
        timeout: null,
      };
      this.resolversMap.set(resolversKey, state);
    }

    const deferedPromise = createDeferredPromise<T>();
    const promises = [deferedPromise.promise];

    if (state.timeout) {
      promises.push(state.timeout.promise);
    }

    const promise = Promise.race(promises);

    state.resolvers.push(deferedPromise);

    return {
      role: SINGLE_FLIGHT_ROLE.WAITER,
      promise,
    };
  }

  private createComplete(state: ResolversState) {
    return async <T extends object>(value: T) => {
      if (state.finished) {
        return false;
      }

      state.timeout?.cancel();
      const resolversKey = this.getKey({
        channel: state.channel,
        key: state.key,
      });
      const messageData: MessageDataSuccess<T> = {
        key: resolversKey,
        value,
      };

      const response = await this.publisher.publish(
        DISTRIBUTED_SINGLE_FLIGHT,
        JSON.stringify(messageData),
      );

      return !!response;
    };
  }

  private createFail<T extends object>(state: ResolversState) {
    return async (error: Error) => {
      if (state.finished) {
        return;
      }

      state.finished = true;
      state.timeout?.cancel();
      const resolversKey = this.getKey({
        channel: state.channel,
        key: state.key,
      });
      const messageData: MessageDataError = {
        key: resolversKey,
        error: {
          name: error.name,
          message: error.message,
        },
      };

      await this.publisher.publish(
        DISTRIBUTED_SINGLE_FLIGHT,
        JSON.stringify(messageData),
      );
    };
  }

  private getKey({ channel, key }: { channel: string; key: string }) {
    return `${channel}:${key}`;
  }

  private timeoutPromise(caller: SingleFlightCaller, timeout: number) {
    let timeoutId!: NodeJS.Timeout;

    const promise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new TimeoutException());
      }, timeout * 1000);
    });

    void promise.catch((error) => caller.fail(error));

    const cancel = () => {
      clearTimeout(timeoutId);
    };

    return {
      promise,
      cancel,
    };
  }

  private async onMessageHandler(_: string, message: string) {
    const messageData = JSON.parse(message) as MessageData<any>;
    const key = messageData.key;
    const state = this.resolversMap.get(key);

    if (!state) {
      return;
    }

    while (state.resolvers.length > 0) {
      const resolver = state.resolvers.shift();

      if ('value' in messageData) {
        resolver.resolve(messageData.value);
      } else {
        resolver.reject(messageData.error);
      }
    }

    this.resolversMap.delete(key);

    if (state.role === SINGLE_FLIGHT_ROLE.OWNER) {
      await this.distributedLockService.release(key, state.id);
    }
  }

  private async subscribeToService() {
    const onMessageHandler = (channel: string, message: string) => {
      this.onMessageHandler(channel, message);
    };
    this.subscriber.on('message', onMessageHandler);
    this.subscriber.on('error', (error) => this.logger.error(error));
    this.subscriber.on('reconnecting', () =>
      this.logger.debug(`${DISTRIBUTED_SINGLE_FLIGHT} Redis reconnecting...`),
    );
    await this.subscriber.subscribe(DISTRIBUTED_SINGLE_FLIGHT);
  }
}
