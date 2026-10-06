import crypto from 'crypto';

export const generateConfirmationCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

export const queueDate = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};
