import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { GA4_OPTIONS } from './constants';
import { EVENT_LIST } from './ga4.constants';
import { GA4Options, GA4Event, GA4Params } from './types';

@Injectable()
export class GA4Service {
  private constantParams = {};
  private hitBuffer: GA4Event[] = [];
  private readonly eventList = EVENT_LIST;
  private readonly logger = new Logger(GA4Service.name);

  constructor(
    @Inject(GA4_OPTIONS)
    private readonly options: GA4Options,
    private readonly httpService: HttpService,
  ) {}

  send(events: GA4Event[], params: GA4Params = {}, postpone = false) {
    const eventMax = events.length > 25;
    this.checkPredefinedEventParams(events);
    this.addConstantParamsToEvents(events);
    this.nullParamCheck(events);

    if (postpone) {
      events.forEach((event) => this.hitBuffer.push(event));
    } else {
      if (eventMax) {
        this.sendLargeEventCount(events);
      } else {
        this.sendEvents(events, params);
      }
    }
  }

  private async sendEvents(events: GA4Event[], params: GA4Params) {
    try {
      console.log(
        this.GA_ENDPOINT,
        JSON.stringify({
          ...params,
          client_id: this.options.clientId,
          events: events,
        }),
      );
      await this.httpService.axiosRef.post(this.GA_ENDPOINT, {
        ...params,
        client_id: this.options.clientId,
        events: events,
      });
    } catch (error) {
      this.logger.debug(error.message, error.stack);
    }
  }

  readClientInfo() {
    this.logger.debug(`
      *** Connection details for GA4 Connection ***
      API_SECRET: ${this.options.apiSecret}
      MEASUREMENT_ID: ${this.options.measurementId}
      CLIENT_ID: ${this.options.clientId}
      GA_ENDPOINT: ${this.GA_ENDPOINT}
      DEBUG_ENDPOINT: ${this.DEBUG_ENDPOINT}
    `);
  }

  private get GA_ENDPOINT() {
    return `https://www.google-analytics.com/mp/collect?measurement_id=${this.options.measurementId}&api_secret=${this.options.apiSecret}`;
  }

  private get DEBUG_ENDPOINT() {
    return `https://www.google-analytics.com/debug/mp/collect?measurement_id=${this.options.measurementId}&api_secret=${this.options.apiSecret}`;
  }

  private addConstantParamsToEvents(events) {
    for (let i = 0; i < events.length; i++) {
      for (const param in this.constantParams) {
        events[i].params[param] = this.constantParams[param];
      }
    }
  }

  private sendLargeEventCount(events: GA4Event[]) {
    let eventBlock;
    while (events.length > 0) {
      eventBlock = events.splice(25);
      this.send(events);
      events = eventBlock;
    }
  }

  private checkPredefinedEventParams(events: GA4Event[]) {
    for (let i = 0; i < events.length; i++) {
      if (this.eventList[events[i].name] !== undefined) {
        for (const eventParam in this.eventList[events[i].name]) {
          if (
            events[i].params[this.eventList[events[i].name][eventParam]] ===
            undefined
          ) {
            this.logger.warn(
              `Missing a recommened parameter "${
                this.eventList[events[i].name][eventParam]
              }" for "${events[i].name}"`,
            );
          }
        }
      }
    }
  }

  private nullParamCheck(events: GA4Event[]) {
    for (let i = 0; i < events.length; i++) {
      for (const param in events[i].params) {
        if (events[i].params[param] === null) {
          this.logger.warn(
            `Removed null param for '${param}' in '${events[i].name}'`,
          );
          delete events[i].params[param];
        }
      }
    }
  }
}
