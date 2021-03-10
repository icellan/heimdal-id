import bsv from 'bsv';
import base64url from 'base64url';

export const Random = {
  secret(length = 32) {
    return base64url(bsv.crypto.Random.getRandomBuffer(length)).substr(0, length);
  },
  hexString(length = 32) {
    return bsv.crypto.Random.getRandomBuffer(Math.ceil(length / 2)).toString('hex');
  },
};
