export abstract class NotSupportedByService extends Error {
  abstract serviceName: string;

  name = NotSupportedByService.name;

  constructor() {
    super();
  }
}
