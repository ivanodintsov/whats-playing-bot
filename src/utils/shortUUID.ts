import * as shortUUID from 'short-uuid';

const uuidTranslator = shortUUID(process.env.SHORT_UUID_CHARS);

export class NotCorrectIDError extends Error {
  name = NotCorrectIDError.name;
  message = 'ID is not correct';

  constructor() {
    super();
  }
}

export const fromUUID = ({ value }) => {
  try {
    return uuidTranslator.fromUUID(value);
  } catch (error) {
    throw new NotCorrectIDError();
  }
};

export const toUUID = ({ value }) => {
  try {
    return uuidTranslator.toUUID(value);
  } catch (err) {
    return toUUIDLegacy({ value });
  }
};

const uuidTranslatorLegacy = shortUUID(process.env.OLD_SHORT_UUID_CHARS);

export const toUUIDLegacy = ({ value }) => {
  try {
    return uuidTranslatorLegacy.toUUID(value);
  } catch (error) {
    throw new NotCorrectIDError();
  }
};
