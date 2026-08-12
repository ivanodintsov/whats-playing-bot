import * as net from 'node:net';

export const parseIps = (value?: string[] | string): string[] => {
  if (!value) return [];

  let ipStringValue: string[];

  if (typeof value === 'string') {
    ipStringValue = value.split(',');
  } else {
    ipStringValue = value;
  }

  return ipStringValue
    .map((ip) => {
      let cleanIp = ip.trim();

      if (cleanIp.includes('.') && cleanIp.includes(':')) {
        cleanIp = cleanIp.split(':')[0];
      }

      if (cleanIp.startsWith('[') && cleanIp.includes(']:')) {
        cleanIp = cleanIp.slice(1, cleanIp.indexOf(']:'));
      }

      return cleanIp;
    })
    .filter((ip) => net.isIP(ip) !== 0);
};
