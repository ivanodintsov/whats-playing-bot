import { Maybe } from 'src/typings';
import {
  IImage,
  IImageBase,
} from 'src/music-services/music-service-core/types';
import { SERVICES_PROVIDERS } from './constants';
import { Provider } from './types';
import { TrackEntity } from 'src/music-services/domain/Track';

export class ParserMergeUtils {
  static uniqueStringArray<T extends string>(array1: Maybe<T[]>) {
    return Array.from(new Set([...(array1 || [])]));
  }

  static mergeStringArrays<T extends string>(
    array1: Maybe<T[]>,
    array2: Maybe<T[]>,
  ) {
    return Array.from(new Set([...(array1 || []), ...(array2 || [])]));
  }

  static mergeStringArraysOrNull<T extends string>(
    array1: Maybe<T[]>,
    array2: Maybe<T[]>,
  ) {
    const mergedList = ParserMergeUtils.mergeStringArrays(array1, array2);
    return !!mergedList.length ? mergedList : null;
  }

  public static isUnorderedEqual<T extends string | number>(
    left: readonly T[],
    right: readonly T[],
  ): boolean;
  public static isUnorderedEqual<T = unknown, K = unknown>(
    left: readonly T[],
    right: readonly T[],
    keySelector: (item: T) => K,
  ): boolean;

  static isUnorderedEqual<T>(
    left: Maybe<readonly T[]>,
    right: Maybe<readonly T[]>,
    keySelector?: (item: T) => unknown,
  ): boolean {
    const selector = keySelector ?? ((item: T) => item);
    if (!left || !right || left.length !== right.length) {
      return false;
    }

    const leftKeys = left.map(selector).sort();
    const rightKeys = right.map(selector).sort();

    return leftKeys.every((key, index) => key === rightKeys[index]);
  }

  static mergeUniqueBy<T, K>(
    arrays: readonly (readonly T[] | null | undefined)[],
    keySelector: (item: T) => K,
  ): T[] {
    const map = new Map<K, T>();

    for (const array of arrays) {
      if (!array) {
        continue;
      }

      for (const item of array) {
        const key = keySelector(item);

        if (!map.has(key)) {
          map.set(key, item);
        }
      }
    }

    return [...map.values()];
  }

  static diffBy<T1, T2, K>(
    current: readonly T1[] | null | undefined,
    incoming: readonly T2[] | null | undefined,
    keySelector: (item: T1 | T2) => K,
    equals?: (current: T1, incoming: T2) => boolean,
  ): ICollectionDiff<T1, T2> {
    const currentMap = new Map<K, T1>(
      (current ?? []).map((item) => [keySelector(item), item]),
    );

    const diff: ICollectionDiff<T1, T2> = {
      created: [],
      updated: [],
      deleted: [],
    };

    for (const item of incoming ?? []) {
      const key = keySelector(item);
      const existing = currentMap.get(key);

      if (!existing) {
        diff.created.push(item);
        continue;
      }

      if (!equals || !equals(existing, item)) {
        diff.updated.push({
          current: existing,
          incoming: item,
        });
      }

      currentMap.delete(key);
    }

    diff.deleted.push(...currentMap.values());

    return diff;
  }

  private static _imagesPriority: Record<Provider, number> = {
    spotify: 100,
    itunes: 90,
    itunesStore: 90,
    soundcloud: 80,
    youtubeMusic: 70,
    youtube: 70,
  };

  private static readonly PREFERRED_PROVIDER = SERVICES_PROVIDERS.spotify;

  static selectPreferredProviderValue(
    value1: any,
    value2: any,
    value1Provider: Maybe<Provider>,
    value2Provider: Maybe<Provider>,
  ) {
    if (value1 === null || value1 === undefined) {
      return value2;
    }

    if (value2 === null || value2 === undefined) {
      return value1;
    }

    if (
      !!value1Provider &&
      !!value2Provider &&
      value1Provider === value2Provider
    ) {
      return value2;
    }

    if (value2Provider === this.PREFERRED_PROVIDER) {
      return value2;
    }

    return value1;
  }

  static mergeTrackEntity(
    oldTrack: TrackEntity,
    newTrack: TrackEntity,
  ): TrackEntity {
    const trackEntity = new TrackEntity({
      id: newTrack.id,
      name: newTrack.name || oldTrack.name,
      uri: newTrack.uri,
      url: newTrack.url,
      thumb_url: newTrack.thumb_url || oldTrack.thumb_url,
      thumb_width: newTrack.thumb_url
        ? newTrack.thumb_width
        : oldTrack.thumb_width,
      thumb_height: newTrack.thumb_url
        ? newTrack.thumb_height
        : oldTrack.thumb_height,
      artists: newTrack.artists || oldTrack.artists,
      provider: newTrack.provider,
    });

    return trackEntity;
  }

  static isNeedUpdateImage(
    current: Maybe<IImage>,
    incoming: Maybe<IImage>,
    currentProvider: Maybe<Provider>,
    incomingProvider: Maybe<Provider>,
  ): boolean {
    if (!incoming) {
      return false;
    }

    if (!current) {
      return true;
    }

    const imagesToCheck = [
      [current, incoming],
      [current.small, incoming.small],
      [current.medium, incoming.medium],
      [current.alternative, incoming.alternative],
    ];

    for (let i = 0; i < imagesToCheck.length; i++) {
      const images = imagesToCheck[i];

      const isNeedUpdate = this._needUpdateImage(
        images[0],
        images[1],
        currentProvider,
        incomingProvider,
      );

      if (isNeedUpdate) {
        return true;
      }
    }

    return false;
  }

  static mergeImages(
    current: Maybe<IImage>,
    incoming: Maybe<IImage>,
    currentProvider: Maybe<Provider>,
    incomingProvider: Maybe<Provider>,
  ): Maybe<IImage> {
    if (!incoming && !current) {
      return null;
    }

    if (!incoming) {
      return current;
    }

    if (!current) {
      return incoming;
    }

    const image: Maybe<IImage> = this.mergeImage(
      current,
      incoming,
      currentProvider,
      incomingProvider,
    );

    image.small = this.mergeImage(
      current.small,
      incoming.small,
      currentProvider,
      incomingProvider,
    );
    image.medium = this.mergeImage(
      current.medium,
      incoming.medium,
      currentProvider,
      incomingProvider,
    );
    image.alternative = this.mergeImage(
      current.alternative,
      incoming.alternative,
      null,
      null,
    );

    return image;
  }

  private static mergeImage(
    current: Maybe<IImage>,
    incoming: Maybe<IImage>,
    currentProvider: Maybe<Provider>,
    incomingProvider: Maybe<Provider>,
  ) {
    if (!incoming && !current) {
      return null;
    }

    if (!incoming) {
      return current;
    }

    if (!current) {
      return incoming;
    }

    if (
      this._needUpdateImage(
        current,
        incoming,
        currentProvider,
        incomingProvider,
      )
    ) {
      return this.createImage(incoming);
    }

    return this.createImage(current);
  }

  private static createImage(current: Maybe<IImage>) {
    if (!current) {
      return null;
    }

    return {
      height: current.height,
      width: current.width,
      url: current.url,
    };
  }

  private static _needUpdateImage(
    current: Maybe<IImage>,
    incoming: Maybe<IImage>,
    currentProvider: Maybe<Provider>,
    incomingProvider: Maybe<Provider>,
  ): boolean {
    if (!incoming) {
      return false;
    }

    if (!current) {
      return true;
    }

    const currentResolution = this.getMaxResolution(current);
    const incomingResolution = this.getImageScore(
      incoming,
      this._imagesPriority[incomingProvider] ?? 0,
    );

    if (incomingResolution > currentResolution) {
      return true;
    }

    if (incomingResolution < currentResolution) {
      return false;
    }

    return current.url !== incoming.url;
  }

  private static getImageScore(
    image: IImage,
    providerPriority: number,
  ): number {
    return this.getMaxResolution(image) + providerPriority;
  }

  private static getMaxResolution(image: IImage): number {
    const variants = [
      image,
      image.medium,
      image.small,
      image.alternative,
    ].filter(Boolean) as IImageBase[];

    return Math.max(
      ...variants.map((img) => (img.width ?? 0) * (img.height ?? 0)),
    );
  }
}

export interface ICollectionDiff<T1, T2> {
  created: T2[];
  updated: Array<{
    current: T1;
    incoming: T2;
  }>;
  deleted: T1[];
}
