import { CustomHttpModule } from 'src/custom-http/custom-http.module';
import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { GA4_NAME, GA4_OPTIONS } from './constants';
import { getGA4Name } from './utils';
import {
  GA4ModuleOptions,
  GA4OptionsFactory,
  GA4AsyncModuleOptions,
} from './types';
import { GA4Service } from './ga4.service';

@Module({})
export class GA4Module {
  public static forRoot(options: GA4ModuleOptions): DynamicModule {
    const ga4Name = getGA4Name(options.gaName);

    const gaNameProvider: Provider = {
      provide: GA4_NAME,
      useValue: ga4Name,
    };

    const gaProvider: Provider = {
      provide: ga4Name,
      useClass: GA4Service,
    };

    return {
      module: GA4Module,
      imports: [CustomHttpModule],
      providers: [
        {
          provide: GA4_OPTIONS,
          useValue: options,
        },
        gaNameProvider,
        gaProvider,
      ],
      exports: [gaProvider],
    };
  }

  public static forRootAsync(options: GA4AsyncModuleOptions): DynamicModule {
    const ga4Name = getGA4Name(options.gaName);

    const gaNameProvider: Provider = {
      provide: GA4_NAME,
      useValue: ga4Name,
    };

    const gaProvider: Provider = {
      provide: ga4Name,
      useClass: GA4Service,
    };

    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: GA4Module,
      imports: [CustomHttpModule, ...options.imports],
      providers: [...asyncProviders, gaNameProvider, gaProvider],
      exports: [gaProvider],
    };
  }

  private static createAsyncProviders(
    options: GA4AsyncModuleOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    const useClass = options.useClass as Type<GA4AsyncModuleOptions>;

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: GA4AsyncModuleOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: GA4_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const inject = [
      (options.useClass || options.useExisting) as Type<GA4OptionsFactory>,
    ];

    return {
      provide: GA4_OPTIONS,
      useFactory: async (optionsFactory: GA4OptionsFactory) =>
        await optionsFactory.createTelegrafOptions(),
      inject,
    };
  }
}
