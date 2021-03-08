import { describe, expect, test } from '@jest/globals';
import { HeimdalId } from '../src';
import { parseUri } from '../src/utils';

const privateKey = '5Jpw5Ce49wLyxjN4StRp29HAUMxYN4nb7Xyb2PRYPs859oqxq2s';
const address = '1HeA4r8cBERrq2gJ8nzWs6NaQ3qEb9jqEg';

describe('basics', () => {
  test('init', () => {
    const heimdalId = new HeimdalId();
    expect(typeof heimdalId).toBe('object');
    expect(heimdalId instanceof HeimdalId).toBe(true);
  });

  test('parse heimdal url', () => {
    const heimdalId = new HeimdalId();
    heimdalId.fromUrl('heimdal://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05?t=api&a=/api/v1/loginViaQr');
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
    heimdalId.fromUrl('heimdal://demo.heimdal.app:3306/test?t=api&a=/api/loginViaQr');
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
    heimdalId.fromUrl('heimdal://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05?t=api&a=/api/v1/loginViaQr&f=name,email&sig=HCyn9ScK6IeGNwTBBQqPu%2F4i6T%2BaMj1wugryxEpRsNUSOVyusBZ%2BuQebpgP2QJRE4Uso9WxPGL75xK5PbqtOcOM%3D&id=1HJshh5r2e63CmL1wtvDBrncLVD9bbpXwS');
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

describe('url creation', () => {
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
    verifyHeimdalId.fromUrl(request);
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
    verifyHeimdalId.fromUrl(request);
    expect(verifyHeimdalId.verifyRequest()).toBe(true);
  });
});
