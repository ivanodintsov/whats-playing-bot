import { ModuleMetadata, Type } from '@nestjs/common/interfaces';

export type GA4Options = {
  apiSecret: string;
  measurementId: string;
  clientId: string;
};

export type GA4EventParam = {
  [key: string]: string | number;
};

export type GA4Event = {
  name: string;
  params?: {
    [key: string]: string | number | GA4EventParam[];
    items?: GA4EventParam[];
    engagement_time_msec?: string;
    session_id?: string;
    session_start?: string;
  };
};

export type GA4Params = {
  user_id?: string;
  non_personalized_ads?: boolean;
  timestamp_micros?: string;
};

export type GA4ModuleOptions = GA4Options & {
  gaName?: string;
};

export interface GA4OptionsFactory {
  createTelegrafOptions(): Promise<GA4ModuleOptions> | GA4ModuleOptions;
}

export type GA4AsyncModuleOptions = Pick<GA4ModuleOptions, 'gaName'> &
  Pick<ModuleMetadata, 'imports'> & {
    useExisting?: Type<GA4OptionsFactory>;
    useClass?: Type<GA4OptionsFactory>;
    useFactory?: (
      ...args: any[]
    ) => Promise<GA4ModuleOptions> | GA4ModuleOptions;
    inject?: any[];
  };
