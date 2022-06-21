export class UserExistsError extends Error {
  name = UserExistsError.name;

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
