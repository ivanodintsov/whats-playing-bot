export abstract class NoPlatformInstanceError extends Error {
  abstract serviceName: string;

  name = NoPlatformInstanceError.name;

  constructor() {
    super();
  }
}
