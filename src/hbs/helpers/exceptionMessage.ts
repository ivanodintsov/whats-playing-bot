const getResponseFieldMessage = <T1 extends object, T2 extends keyof T1>(
  response: T1,
  field: T2,
): string | null => {
  if (typeof response === 'string') {
    return response;
  }

  if (!response[field]) {
    return null;
  }

  if (Array.isArray(response[field])) {
    return response[field].join(', ');
  }

  return response[field].toString();
};

export function exceptionMessage(this: any): string {
  const response = this.message;
  return getResponseFieldMessage(response, 'message');
}

export function exceptionError(this: any): string {
  const response = this.message;
  return getResponseFieldMessage(response, 'error');
}
