import { DeferedPromise } from 'src/utils/createDeferredPromise';

export type MessageDataSuccess<T> = {
  key: string;
  value: T;
};

export type MessageDataError = {
  key: string;
  error: {
    name: string;
    message: string;
  };
};

export type MessageData<T> = MessageDataSuccess<T> | MessageDataError;

export enum SINGLE_FLIGHT_ROLE {
  OWNER,
  WAITER,
}

export type ResolversState = {
  id: string;
  channel: string;
  key: string;
  role: SINGLE_FLIGHT_ROLE;
  resolvers: DeferedPromise<any>[];
  finished: boolean;
  timeout: {
    promise: Promise<any> | null;
    cancel: () => void | null;
  };
};

export type SingleFlightWaiter<T> = {
  role: SINGLE_FLIGHT_ROLE.WAITER;
  promise: Promise<T>;
};

export type SingleFlightCaller = {
  role: SINGLE_FLIGHT_ROLE.OWNER;
  complete: <T extends object>(value: T) => Promise<boolean>;
  fail: (error: Error) => Promise<void>;
};

export type SingleFlight<T> = SingleFlightCaller | SingleFlightWaiter<T>;

export type KeyOptions = {
  channel: string;
  key: string;
};

export type WaitOptions = KeyOptions & {
  timeout: number;
};

export type CreateOwnerOptions = KeyOptions & {
  id: string;
  timeout: number;
};

export type CreateWaiterOptions = KeyOptions & {
  id: string;
};

export type ExecuteOptions<T1, T2> = WaitOptions & {
  owner: (caller: SingleFlightCaller) => Awaited<T1> | T1;
  waiter: (value: Awaited<T1>) => Promise<T2> | T2;
};
