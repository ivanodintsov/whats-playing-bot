export class UserExistsError extends Error {
  name = UserExistsError.name;

  constructor() {
    super();
  }
}

export class UserNotExistsError extends Error {
  name = UserNotExistsError.name;

  constructor() {
    super();
  }
}

export class PrivateOnlyError extends Error {
  name = PrivateOnlyError.name;

  constructor() {
    super();
  }
}

export class MaintenanceError extends Error {
  name = MaintenanceError.name;

  constructor() {
    super();
  }
}
