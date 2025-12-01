export class GraphQLCacheHitException extends Error {
  constructor() {
    super('__SILENT_CACHE_HIT__');
    this.name = 'GraphQLCacheHitException';
  }
}
