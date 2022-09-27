import { describe, expect, test } from '@jest/globals';
import { jsonStableStringify, parseUri } from '../src/utils';

describe('parseUri', () => {
  test('heimdal uri', () => {
    const parsed = parseUri('heimdal://demo.heimdal.app/test?t=api&a=/api/v1/loginViaQr&f=name,email,%23employeeId');
    expect(parsed).toStrictEqual({
        anchor: undefined,
        authority: 'demo.heimdal.app',
        directory: '/test',
        file: '',
        host: 'demo.heimdal.app',
        password: undefined,
        path: '/test',
        port: undefined,
        protocol: 'heimdal',
        query: 't=api&a=/api/v1/loginViaQr&f=name,email,%23employeeId',
        queryKey: {
          a: '/api/v1/loginViaQr',
          f: 'name,email,%23employeeId',
          t: 'api',
        },
        relative: '/test?t=api&a=/api/v1/loginViaQr&f=name,email,%23employeeId',
        source: 'heimdal://demo.heimdal.app/test?t=api&a=/api/v1/loginViaQr&f=name,email,%23employeeId',
        user: undefined,
        userInfo: undefined,
      });
  });
});

describe('jsonStableStringify', () => {
  test('simple object', () => {
    const obj = { c: 8, b: [{z:6,y:5,x:4},7], a: 3 };
    expect(jsonStableStringify(obj)).toBe('{"a":3,"b":[{"x":4,"y":5,"z":6},7],"c":8}');
  });

  test('reverse sort', () => {
    const obj = { c: 8, b: [{z:6,y:5,x:4},7], a: 3 };
    const s = jsonStableStringify(obj, function (a, b) {
      return a.key < b.key ? 1 : -1;
    });
    expect(s).toBe('{"c":8,"b":[{"z":6,"y":5,"x":4},7],"a":3}');
  });

  test('reverse sort', () => {
    const obj = { d: 6, c: 5, b: [{z:3,y:2,x:1},9], a: 10 };
    const s = jsonStableStringify(obj, function (a, b) {
      return a.value < b.value ? 1 : -1;
    });
    expect(s).toBe('{"a":10,"b":[{"z":3,"y":2,"x":1},9],"d":6,"c":5}');
  });
});
