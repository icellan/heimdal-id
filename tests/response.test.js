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

  test('valid signature', () => {
    const r = Object.assign({...responseObject, time: moment().subtract(5, 'seconds').unix()});
    const message = serverUrl + r.challenge + '&time=' + r.time;
    r.signature = Message(Buffer.from(message)).sign(privateKey);
    const response = new HeimdalResponse(serverUrl, r);
    expect(response.isValid()).toBe(true);
    expect(response.errors).toStrictEqual([]);
  });
});

describe('fields', () => {
  test('init', () => {
    const response = new HeimdalResponse(serverUrl, responseObject);
    expect(response.getFieldValue('name')).toBe('Name');
    expect(response.getFieldValue('email')).toBe('name@example.com');
  });
});
