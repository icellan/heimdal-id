import { describe, expect, test } from '@jest/globals';
import { HeimdalId } from '../src';
import { parseUri } from '../src/utils';
import { HeimdalResponse } from '../src/response';

const privateKey = '5Jpw5Ce49wLyxjN4StRp29HAUMxYN4nb7Xyb2PRYPs859oqxq2s';
const address = '1HeA4r8cBERrq2gJ8nzWs6NaQ3qEb9jqEg';

describe('basics', () => {
  test('init', () => {
    const heimdalId = new HeimdalId();
    expect(typeof heimdalId).toBe('object');
    expect(heimdalId instanceof HeimdalId).toBe(true);
  });

  test('illegal urls', () => {
    const heimdalId = new HeimdalId();
    expect(() => {
      heimdalId.requestFromUrl('heimdal:/demo.heimdal.app/test?t=api&a=/api/v1/loginViaQr');
    }).toThrow('Domain authority could not be parsed');
    expect(() => {
      heimdalId.requestFromUrl('test://demo.heimdal.app/test?t=api&a=/api/v1/loginViaQr');
    }).toThrow('Not a valid protocol for Heimdal');
    expect(() => {
      heimdalId.requestFromUrl('test://demo.heimdal.app/?t=api&a=/api/v1/loginViaQr');
    }).toThrow('Not a valid protocol for Heimdal');
    expect(() => {
      heimdalId.requestFromUrl('test://demo.heimdal.app/#?t=api&a=/api/v1/loginViaQr');
    }).toThrow('Illegal characters found in QR Code');
    expect(() => {
      heimdalId.requestFromUrl('test://demo.heimdal.app/?t=¥pi&a=/api/v1/loginViaQr');
    }).toThrow('Illegal characters found in QR Code');
  });

  test('parse heimdal url', () => {
    const heimdalId = new HeimdalId();
    heimdalId.requestFromUrl('heimdal://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05?t=api&a=/api/v1/loginViaQr');
    expect(heimdalId.checksum).toBe('yoEY-qBV3');
    expect(heimdalId.protocol).toBe('heimdal');
    expect(heimdalId.host).toBe('demo.heimdal.app');
    expect(heimdalId.port).toBe('');
    expect(heimdalId.authority).toBe('demo.heimdal.app');
    expect(heimdalId.challenge).toBe('F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05');
    expect(heimdalId.type).toBe('api');
    expect(heimdalId.action).toBe('/api/v1/loginViaQr');
  });

  test('parse heimdal url - with port', () => {
    const heimdalId = new HeimdalId();
    heimdalId.requestFromUrl('heimdal://demo.heimdal.app:3306/test?t=api&a=/api/loginViaQr');
    expect(heimdalId.checksum).toBe('nUzf-8eKw');
    expect(heimdalId.protocol).toBe('heimdal');
    expect(heimdalId.host).toBe('demo.heimdal.app');
    expect(heimdalId.port).toBe('3306');
    expect(heimdalId.authority).toBe('demo.heimdal.app:3306');
    expect(heimdalId.challenge).toBe('test');
    expect(heimdalId.type).toBe('api');
    expect(heimdalId.action).toBe('/api/loginViaQr');
  });

  test('parse heimdal url - signed', () => {
    const heimdalId = new HeimdalId();
    heimdalId.requestFromUrl('heimdal://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05?t=api&a=/api/v1/loginViaQr&f=name,email&sig=HCyn9ScK6IeGNwTBBQqPu%2F4i6T%2BaMj1wugryxEpRsNUSOVyusBZ%2BuQebpgP2QJRE4Uso9WxPGL75xK5PbqtOcOM%3D&id=1HJshh5r2e63CmL1wtvDBrncLVD9bbpXwS');
    expect(heimdalId.checksum).toBe('3jRS-iNFw');
    expect(heimdalId.protocol).toBe('heimdal');
    expect(heimdalId.authority).toBe('demo.heimdal.app');
    expect(heimdalId.challenge).toBe('F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05');
    expect(heimdalId.type).toBe('api');
    expect(heimdalId.action).toBe('/api/v1/loginViaQr');
    expect(heimdalId.fields).toStrictEqual(['email','name']);
    expect(heimdalId.id).toBe('1HJshh5r2e63CmL1wtvDBrncLVD9bbpXwS');
    expect(heimdalId.signature).toBe('HCyn9ScK6IeGNwTBBQqPu/4i6T+aMj1wugryxEpRsNUSOVyusBZ+uQebpgP2QJRE4Uso9WxPGL75xK5PbqtOcOM=');
  });
});

describe('getters / setters', () => {
  test('challenge', () => {
    const heimdalId = new HeimdalId();
    heimdalId.newRequest('demo.heimdal.app');
    const challenge = heimdalId.getChallenge();
    expect(typeof challenge).toBe('string');
    expect(challenge !== 'test').toBe(true);
    heimdalId.setChallenge('test');
    expect(heimdalId.getChallenge()).toBe('test');
  });

  test('type', () => {
    const heimdalId = new HeimdalId();
    expect(heimdalId.getType()).toBe('api');
    heimdalId.setType('app');
    expect(heimdalId.getType()).toBe('app');
    expect(() => {
      heimdalId.setType('test');
    }).toThrow();
  });

  test('action', () => {
    const heimdalId = new HeimdalId();
    expect(heimdalId.getAction()).toBe('/loginViaQr');
    heimdalId.setAction('/api/v1/loginViaQr');
    expect(heimdalId.getAction()).toBe('/api/v1/loginViaQr');
  });

  test('fields', () => {
    const heimdalId = new HeimdalId();
    heimdalId.addField('name');
    expect(heimdalId.getFields()).toStrictEqual(['name']);
    heimdalId.addFields(['name', 'email', '#test*']);
    expect(heimdalId.getFields()).toStrictEqual(['name','email','#test*']);
    expect(heimdalId.getCleanFields()).toStrictEqual(['name','email','#test']);
    heimdalId.setFields(['email', '#test*']);
    expect(heimdalId.getCleanFields()).toStrictEqual(['email','#test']);
  });

  test('value', () => {
    const heimdalId = new HeimdalId();
    expect(heimdalId.getValue()).toBe(undefined);
    heimdalId.setFields(['email', '#test*']);
    // this should overwrite fields
    heimdalId.addFieldValue('name', 'Satoshi');
    expect(heimdalId.getFields()).toStrictEqual(['name']);
    expect(heimdalId.getValue()).toBe('Satoshi');

    heimdalId.addFieldValue('Yen', '¥');
    expect(heimdalId.getValue()).toBe('¥');
    // check encoding
  });

  test('encoded values', () => {
    const heimdalId = new HeimdalId();
    heimdalId.newRequest('demo.heimdal.app');
    heimdalId.addFieldValue('Yen', '¥');
    expect(heimdalId.getValue()).toBe('¥');
    const request = heimdalId.getRequest();

    const parsedRequest = parseUri(request);
    expect(parsedRequest.queryKey.f).toBe('Yen');
    expect(parsedRequest.queryKey.v).toBe('%C2%A5');

    const heimdalId2 = new HeimdalId();
    heimdalId2.requestFromUrl(request);
    expect(heimdalId2.getFields()).toStrictEqual(['Yen']);
    expect(heimdalId2.getValue()).toBe('¥');
  });

  test('authority', () => {
    const heimdalId = new HeimdalId();
    heimdalId.newRequest('demo.heimdal.app');
    expect(heimdalId.getAuthority()).toBe('demo.heimdal.app');

    heimdalId.newRequest('https://demo.heimdal.app/');
    expect(heimdalId.getAuthority()).toBe('demo.heimdal.app');
  });

  test('request', () => {
    const heimdalId = new HeimdalId();
    expect(() => {
      heimdalId.getRequest();
    }).toThrow();

    heimdalId.newRequest('demo.heimdal.app');
    heimdalId.setChallenge('test')
    expect(heimdalId.getRequest()).toBe('heimdal://demo.heimdal.app/test?t=api&a=/loginViaQr');
    expect(heimdalId.getRequest(true)).toBe('heimdal://demo.heimdal.app/test');
  });
});

describe('url creation', () => {
  test('failing request', () => {
    const heimdalId = new HeimdalId();
    expect(() => {
      heimdalId.newRequest('');
    }).toThrow();
  });

  test('simple request', () => {
    const heimdalId = new HeimdalId();
    heimdalId.newRequest('demo.heimdal.app');
    const request = heimdalId.getRequest();
    const parsedRequest = parseUri(request);
    expect(parsedRequest.protocol).toBe('heimdal');
    expect(parsedRequest.authority).toBe('demo.heimdal.app');
    expect(typeof parsedRequest.path).toBe('string');
    expect(parsedRequest.path.length).toBe(33); // + 1 for /
    expect(parsedRequest.queryKey.t).toBe('api');
    expect(parsedRequest.queryKey.a).toBe('/loginViaQr');
  });

  test('simple request 2', () => {
    const heimdalId = new HeimdalId();
    heimdalId.newRequest('https://demo.heimdal.app');
    heimdalId.addFields(['name','email']);
    const request = heimdalId.getRequest();
    const parsedRequest = parseUri(request);
    expect(parsedRequest.protocol).toBe('heimdal');
    expect(parsedRequest.authority).toBe('demo.heimdal.app');
    expect(parsedRequest.queryKey.f).toBe('name,email');
  });

  test('simple request 3', () => {
    const heimdalId = new HeimdalId();
    heimdalId.newRequest('https://demo.heimdal.app/');
    heimdalId.addField('name');
    heimdalId.addField('email');
    const request = heimdalId.getRequest();
    const parsedRequest = parseUri(request);
    expect(parsedRequest.protocol).toBe('heimdal');
    expect(parsedRequest.authority).toBe('demo.heimdal.app');
    expect(parsedRequest.queryKey.f).toBe('name,email');
  });

  test('short request', () => {
    const heimdalId = new HeimdalId();
    heimdalId.newRequest('demo.heimdal.app');
    const request = heimdalId.getRequest(true);
    const parsedRequest = parseUri(request);
    expect(parsedRequest.protocol).toBe('heimdal');
    expect(parsedRequest.authority).toBe('demo.heimdal.app');
    expect(typeof parsedRequest.path).toBe('string');
    expect(parsedRequest.path.length).toBe(33); // + 1 for /
    expect(parsedRequest.queryKey).toStrictEqual({});
  });

  test('request with value', () => {
    const heimdalId = new HeimdalId();
    heimdalId.newRequest('demo.heimdal.app');
    heimdalId.addFieldValue('name','Satoshi');
    const request = heimdalId.getRequest();
    const parsedRequest = parseUri(request);
    expect(parsedRequest.queryKey.f).toStrictEqual('name');
    expect(parsedRequest.queryKey.v).toStrictEqual('Satoshi');
  });

  test('signed request - fails', () => {
    const heimdalId = new HeimdalId();
    heimdalId.newRequest('demo.heimdal.app');
    expect(() => {
      const request = heimdalId.getSignedRequest();
    }).toThrow();
  });

  test('signing message', () => {
    const heimdalId = new HeimdalId();
    heimdalId.newRequest('demo.heimdal.app');
    const message = heimdalId.getSigningMessage();
    const parsedRequest = parseUri(message);
    expect(parsedRequest.protocol).toBe('heimdal');
    expect(parsedRequest.authority).toBe('demo.heimdal.app');
    expect(typeof parsedRequest.path).toBe('string');
    expect(parsedRequest.path.length).toBe(33); // + 1 for /
    // make sure all the fields are present
    expect(parsedRequest.queryKey.t).toBe('api');
    expect(parsedRequest.queryKey.a).toBe('/loginViaQr');
    expect(parsedRequest.queryKey.f).toBe('');
    expect(parsedRequest.queryKey.v).toBe('');
    expect(parsedRequest.queryKey.x).toBe('');
  });

  test('signing message with fields', () => {
    const heimdalId = new HeimdalId();
    heimdalId.newRequest('demo.heimdal.app');
    heimdalId.addFields(['name','email']);
    const message = heimdalId.getSigningMessage();
    const parsedRequest = parseUri(message);
    // fields should be sorted
    expect(parsedRequest.queryKey.f).toBe('email,name');
  });

  test('signing message errors', () => {
    const heimdalId = new HeimdalId();
    expect(() => {
      heimdalId.getSigningMessage();
    }).toThrow('Domain authority has not been set');

    heimdalId.newRequest('demo.heimdal.app');
    heimdalId.challenge = '';
    expect(() => {
      heimdalId.getSigningMessage();
    }).toThrow('Challenge key has not been set');
  });

  test('signed request', () => {
    const heimdalId = new HeimdalId(privateKey);
    heimdalId.newRequest('demo.heimdal.app');
    const request = heimdalId.getSignedRequest();
    const parsedRequest = parseUri(request);
    expect(parsedRequest.protocol).toBe('heimdal');
    expect(parsedRequest.authority).toBe('demo.heimdal.app');
    expect(typeof parsedRequest.path).toBe('string');
    expect(parsedRequest.path.length).toBe(33); // + 1 for /
    expect(parsedRequest.queryKey.t).toBe('api');
    expect(parsedRequest.queryKey.a).toBe('/loginViaQr');
    expect(typeof parsedRequest.queryKey.sig).toBe('string');
    expect(parsedRequest.queryKey.id).toBe(address);

    const verifyHeimdalId = new HeimdalId();
    verifyHeimdalId.requestFromUrl(request);
    expect(verifyHeimdalId.verifyRequest()).toBe(true);
  });

  test('short signed request', () => {
    const heimdalId = new HeimdalId(privateKey);
    heimdalId.newRequest('demo.heimdal.app');
    const request = heimdalId.getSignedRequest(true);
    const parsedRequest = parseUri(request);
    expect(parsedRequest.protocol).toBe('heimdal');
    expect(parsedRequest.authority).toBe('demo.heimdal.app');
    expect(typeof parsedRequest.path).toBe('string');
    expect(parsedRequest.path.length).toBe(33); // + 1 for /
    expect(typeof parsedRequest.queryKey.sig).toBe('string');
    expect(parsedRequest.queryKey.id).toBe(address);

    const verifyHeimdalId = new HeimdalId();
    verifyHeimdalId.requestFromUrl(request);
    expect(verifyHeimdalId.verifyRequest()).toBe(true);
  });
});

describe('responses', () => {
  test('new response', () => {
    const heimdalId = new HeimdalId(privateKey);
    const response = heimdalId.newResponse('https://demo.heimdal.app/', {
      challenge: 'QWp_PaPeBzQIqMdQB2_B~hIceHss4Jxw',
      time: 1615235601,
    });
    expect(response instanceof HeimdalResponse).toBe(true);
    expect(response.serverUrl).toBe('https://demo.heimdal.app');
    expect(response.challenge).toBe('QWp_PaPeBzQIqMdQB2_B~hIceHss4Jxw');
    expect(response.time).toBe(1615235601);
  });

  test('create response', () => {
    const heimdalId = new HeimdalId(privateKey);
    heimdalId.requestFromUrl('heimdal://demo.heimdal.app/testChallenge?t=api&a=/api/v1/loginViaQr');

    const fields = {
      name: 'Test name',
      email: 'test@example.com',
    };
    const response = heimdalId.createResponse(fields);
    expect(response instanceof HeimdalResponse).toBe(true);
    expect(response.serverUrl).toBe('https://demo.heimdal.app');
    expect(response.challenge).toBe('testChallenge');

    // will be automatically signed, as we passed in a private key to the Heimdal class
    expect(response.address).toBe(address);
    expect(typeof response.signature).toBe('string');

    // get the POST response URL
    expect(response.getResponseUrl()).toBe('https://demo.heimdal.app/api/v1/loginViaQr');
    const responseObject = response.getResponseBody();
    const responseOjectTest = Object.assign({...responseObject});

    delete responseOjectTest.time;
    delete responseOjectTest.signature;
    expect(responseOjectTest).toStrictEqual({
      address,
      challenge: 'testChallenge',
      fields: {
        email: 'test@example.com',
        name: 'Test name',
      },
    });

    const heimdalId2 = new HeimdalId();
    const heimdalIdResponse = heimdalId2.newResponse(response.serverUrl, responseObject);
    heimdalIdResponse.isValid()
    expect(heimdalIdResponse.isValid()).toBe(true);
  });
});
