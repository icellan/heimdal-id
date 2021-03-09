import bsv from 'bsv';
import moment from 'moment';
import Message from 'bsv/message';
import { describe, expect, test } from '@jest/globals';
import { HeimdalResponse } from '../src/response';

const privateKey = bsv.PrivateKey.fromWIF('5Jpw5Ce49wLyxjN4StRp29HAUMxYN4nb7Xyb2PRYPs859oqxq2s');
const address = '1HeA4r8cBERrq2gJ8nzWs6NaQ3qEb9jqEg';

const serverUrl = 'https://demo.heimdal.app/';
const responseObject = {
  challenge: 'QWp_PaPeBzQIqMdQB2_B~hIceHss4Jxw',
  address: '1HeA4r8cBERrq2gJ8nzWs6NaQ3qEb9jqEg',
  time: 1615235601,
  signature: 'H6IIcYkdwUae0pWH5V7nWKM6Jv1nHVYe57akQF4anTheJy6SGFbUuiFI1dwwVvZXa6PBiqEtfk2YWz0HyA2b5O0=',
  fields: {
    avatar: 'avatar',
    name: 'Name',
    email: 'name@example.com',
    '#employeeId': 'DEMO-NL1234242B031',
    '#employeeAddress': '1HnTVYWXZCFvXcgYQBnbnmoJuBWDFfvM2r',
  },
  bap: {
    address: "1bap9SLgBu5WuT5ERNPp785QqELGnfu9s",
    signature: "<...>",
    attributes: {
      name: {
        value: "Satoshi Nakamoto",
        nonce: "1149b3e9002e49f73b6aae16d3b27d105b18f5f1d084a6a0daad07598e416bad"
      },
      email: {
        value: "satoshin@gmx.com",
        nonce: "ca822b23cf4ca72023847fcffa7776969053cdb56cfe29e4d6485a0c098cb1ec"
      },
      over21: {
        value: 1,
        nonce: "ca822b23cf4ca72023847fcffa7776969053cdb56cfe29e4d6485a0c098cb1ec"
      }
    }
  }
};

describe('validation', () => {
  test('init', () => {
    const response = new HeimdalResponse(serverUrl, {});
    expect(typeof response).toBe('object');
    expect(response instanceof HeimdalResponse).toBe(true);
  });

  test('invalid', () => {
    const response = new HeimdalResponse(serverUrl, {});
    expect(response.isValid()).toBe(false);
    expect(response.errors).toStrictEqual(['Not all fields are filled in']);
  });

  test('invalid time', () => {
    const r = Object.assign({...responseObject, time: 'sr4h2'});
    const response = new HeimdalResponse(serverUrl, r);
    expect(response.isValid()).toBe(false);
    expect(response.errors).toStrictEqual(['Invalid time']);
  });

  test('time in the past', () => {
    const r = Object.assign({...responseObject, time: 2});
    const response = new HeimdalResponse(serverUrl, r);
    expect(response.isValid()).toBe(false);
    expect(response.errors).toStrictEqual(['Signature has expired']);
  });

  test('time in the future', () => {
    const r = Object.assign({...responseObject, time: moment().add(5, 'seconds').unix()});
    const response = new HeimdalResponse(serverUrl, r);
    expect(response.isValid()).toBe(false);
    expect(response.errors).toStrictEqual(['Time is in the future']);
  });

  test('invalid signature', () => {
    const r = Object.assign({...responseObject, time: moment().subtract(5, 'seconds').unix()});
    const response = new HeimdalResponse(serverUrl, r);
    expect(response.isValid()).toBe(false);
    expect(response.errors).toStrictEqual(['Could not verify signature']);
  });

  test('invalid signature 2', () => {
    const r = Object.assign({...responseObject, time: moment().subtract(5, 'seconds').unix()});
    r.signature = 'test';
    const response = new HeimdalResponse(serverUrl, r);
    expect(response.isValid()).toBe(false);
    expect(response.errors).toStrictEqual(['Could not verify signature']);
  });

  test('valid signature', () => {
    const r = Object.assign({...responseObject, time: moment().subtract(5, 'seconds').unix()});

    const response = new HeimdalResponse(serverUrl, r);
    const message = response.getSigningMessage();
    response.signature = Message(Buffer.from(message)).sign(privateKey);

    expect(response.isValid()).toBe(true);
    expect(response.errors).toStrictEqual([]);
  });

  test('valid signature - server url variations', () => {
    const r = Object.assign({...responseObject, time: moment().subtract(5, 'seconds').unix()});

    const response = new HeimdalResponse('https://demo.heimdal.app', r);
    const message = response.getSigningMessage();
    const signature = Message(Buffer.from(message)).sign(privateKey);

    response.signature = signature;
    expect(response.isValid()).toBe(true);

    const response2 = new HeimdalResponse('https://demo.heimdal.app//', r);
    response2.signature = signature;
    expect(response2.isValid()).toBe(true);

    const response3 = new HeimdalResponse('http://demo.heimdal.app', r);
    response2.signature = signature;
    expect(response3.isValid()).toBe(false);
  });
});

describe('getters', () => {
  let response;
  beforeEach(() => {
    response = new HeimdalResponse(serverUrl, responseObject);
  });

  test('getSigningMessage', () => {
    const signingMessage = response.getSigningMessage();
    expect(signingMessage).toBe('https://demo.heimdal.app/QWp_PaPeBzQIqMdQB2_B~hIceHss4Jxw?time=1615235601&f=%7B%22%23employeeAddress%22%3A%221HnTVYWXZCFvXcgYQBnbnmoJuBWDFfvM2r%22%2C%22%23employeeId%22%3A%22DEMO-NL1234242B031%22%2C%22avatar%22%3A%22avatar%22%2C%22email%22%3A%22name%40example.com%22%2C%22name%22%3A%22Name%22%7D&bap=%7B%22address%22%3A%221bap9SLgBu5WuT5ERNPp785QqELGnfu9s%22%2C%22attributes%22%3A%7B%22email%22%3A%7B%22nonce%22%3A%22ca822b23cf4ca72023847fcffa7776969053cdb56cfe29e4d6485a0c098cb1ec%22%2C%22value%22%3A%22satoshin%40gmx.com%22%7D%2C%22name%22%3A%7B%22nonce%22%3A%221149b3e9002e49f73b6aae16d3b27d105b18f5f1d084a6a0daad07598e416bad%22%2C%22value%22%3A%22Satoshi%20Nakamoto%22%7D%2C%22over21%22%3A%7B%22nonce%22%3A%22ca822b23cf4ca72023847fcffa7776969053cdb56cfe29e4d6485a0c098cb1ec%22%2C%22value%22%3A1%7D%7D%2C%22signature%22%3A%22%3C...%3E%22%7D');
  });

  test('getResponseUrl', () => {
    const signingMessage = response.getResponseUrl();
    expect(signingMessage).toBe('https://demo.heimdal.app/loginViaQr');
  });

  test('id', () => {
    expect(response.getId()).toBe(address);
  });

  test('challenge', () => {
    expect(response.getChallenge()).toBe('QWp_PaPeBzQIqMdQB2_B~hIceHss4Jxw');
  });
});

describe('fields', () => {
  let response;
  beforeEach(() => {
    response = new HeimdalResponse(serverUrl, responseObject);
  });

  test('getFields', () => {
    expect(response.getFields()).toStrictEqual({
        '#employeeAddress': '1HnTVYWXZCFvXcgYQBnbnmoJuBWDFfvM2r',
        '#employeeId': 'DEMO-NL1234242B031',
        'avatar': 'avatar',
        'email': 'name@example.com',
        'name': 'Name',
      });
  });

  test('getFieldValue', () => {
    expect(response.getFieldValue('name')).toBe('Name');
    expect(response.getFieldValue('email')).toBe('name@example.com');
    expect(response.getFieldValue('#employeeId')).toBe('DEMO-NL1234242B031');
  });

  test('setFieldValue', () => {
    response.setFieldValue('name', 'Test Name');
    expect(response.getFieldValue('name')).toBe('Test Name');
  });
});

describe('verified fields', () => {
  let response;
  beforeEach(() => {
    response = new HeimdalResponse(serverUrl, responseObject);
  });

  test('getVerifiedFieldValue', () => {
    expect(response.getVerifiedFieldValue('name')).toBe('Satoshi Nakamoto');
    expect(response.getVerifiedFieldValue('email')).toBe('satoshin@gmx.com');
    expect(response.getVerifiedFieldValue('over21')).toBe(1);
  });

  test('getVerifiedFieldNonce', () => {
    expect(response.getVerifiedFieldNonce('name')).toBe('1149b3e9002e49f73b6aae16d3b27d105b18f5f1d084a6a0daad07598e416bad');
    expect(response.getVerifiedFieldNonce('email')).toBe('ca822b23cf4ca72023847fcffa7776969053cdb56cfe29e4d6485a0c098cb1ec');
    expect(response.getVerifiedFieldNonce('over21')).toBe('ca822b23cf4ca72023847fcffa7776969053cdb56cfe29e4d6485a0c098cb1ec');
  });
});
