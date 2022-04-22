import { logger } from './log';

export function wrapAsync<A extends Array<unknown>>(afunc: (...args: A) => Promise<void>, log: typeof logger) {
  return function (this: unknown, ...args: A) {
    afunc.apply(this, args)
      .catch(error => log.error(error))
  };
}

export function autocatch(log: typeof logger) {
  return (_target: unknown, _propertyKey: string, descriptor?: PropertyDescriptor) => {
    descriptor!.value = wrapAsync(descriptor!.value, log);
  };
};

export function timeout(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
