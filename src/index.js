import bsv from 'bsv';
import Message from 'bsv/message';
import { HeimdalResponse } from './response';
import { parseUri, Random } from './utils';

const DEFAULT_TYPE = 'api';
const DEFAULT_ACTION = '/loginViaQr';
const ALLOWED_TYPES = ['api', 'app', 'add', 'fetch'];

/**
 * Heimdal
 *
 * @type {HeimdalId}
 */
export const HeimdalId = class {
  #privateKey = '';

  #address = '';

  constructor(privateKey) {
    if (privateKey) {
      this.setPrivateKey(privateKey);
    }

    this.resetVariables();
  }

  /**
   * Set, or re-set, the private key to use during operations
   *
   * @param privateKey
   */
  setPrivateKey(privateKey) {
    this.#privateKey = bsv.PrivateKey.fromWIF(privateKey);
    this.#address = this.#privateKey.toAddress()
      .toString();
  }

  getAddress() {
    return this.#address;
  }

  /**
   * Reset all internal variables to their defaults
   */
  resetVariables() {
    this.source = '';
    this.protocol = 'heimdal';
    this.host = '';
    this.port = '';
    this.authority = '';
    this.challenge = '';
    this.parameters = [];

    this.type = DEFAULT_TYPE;
    this.action = DEFAULT_ACTION;
    this.fields = [];
    this.value = '';
    this.extension = '';

    this.signature = null;
    this.id = null;

    this.errors = [];
  }

  /**
   * Start a new Heimdal request
   * @param authority
   */
  newRequest(authority) {
    if (!authority) {
      throw new Error('Authority is mandatory');
    }
    this.resetVariables();

    const [host, port] = authority.split(':');
    this.host = host;
    this.port = port;
    this.authority = authority;
    this.challenge = Random.secret(32);
  }

  /**
   * Allow setting of custom challenge, if for instance it was created earlier
   *
   * @param challenge
   */
  setChallenge(challenge) {
    this.challenge = challenge;
  }

  getChallenge() {
    return this.challenge;
  }

  setType(type) {
    if (!ALLOWED_TYPES.includes(type)) {
      throw new Error('This action is not allowed');
    }
    this.type = type;
  }

  setAction(action) {
    this.action = action;
  }

  getChecksum(url) {
    const qrHex = bsv.crypto.Hash.sha256(Buffer.from(url));
    const address = bsv.PrivateKey.fromHex(qrHex)
      .publicKey
      .toAddress()
      .toString();
    return `${address.substr(-8, 4)}-${address.substr(-4)}`;
  }

  addField(fieldName) {
    this.fields.push(fieldName);
  }

  /**
   * Add a field value to the request
   *
   * This will overwrite any other fields set for this request + set the type to 'add' and unset action
   *
   * @param fieldName
   * @param fieldValue
   */
  addFieldValue(fieldName, fieldValue) {
    this.fields = [fieldName];
    this.value = fieldValue;

    this.setType('add');
    this.setAction('');
  }

  /**
   * Get the heimdal login url with the set parameters
   *
   * @param short {boolean} Whether to return a url that is as short as possible, with default values
   * @returns {string}
   */
  getRequest(short = false) {
    if (!this.authority || !this.challenge) {
      throw new Error('Not initialized properly');
    }

    let url = this.protocol + '://'
      + this.authority
      + '/'
      + this.challenge;

    let first = true;
    if (!short || this.type !== DEFAULT_TYPE) {
      url += (first ? '?' : '&') + 't=' + this.type;
      first = false;
    }

    if (!short || this.action !== DEFAULT_ACTION) {
      url += (first ? '?' : '&') + 'a=' + this.action;
      first = false;
    }

    if (this.fields.length) {
      url += (first ? '?' : '&') + 'f=' + this.fields.map((f) => {
        return encodeURIComponent(f);
      })
        .join(',');
      first = false;
    }

    if (this.value) {
      url += (first ? '?' : '&') + 'v=' + encodeURIComponent(this.value);
    }

    return url;
  }

  /**
   * Get a signed request url
   *
   * @param short
   * @returns {string}
   */
  getSignedRequest(short = false) {
    if (!this.#privateKey) {
      throw new Error('No private key set for signing');
    }

    let request = this.getRequest(short);

    const message = this.getSigningMessage();
    const signature = this.signMessage(message);

    const first = !request.match(/\?/);
    request += (first ? '?' : '&') + 'sig=' + encodeURIComponent(signature);
    request += '&id=' + this.#address;

    return request;
  }

  fromUrl(url) {
    const parsedUrl = parseUri(url);
    this.checksum = this.getChecksum(url);

    this.source = parsedUrl.source;
    this.protocol = parsedUrl.protocol;
    this.host = parsedUrl.host;
    this.port = parsedUrl.port;
    this.authority = parsedUrl.authority;
    this.challenge = parsedUrl.path.substr(1);
    this.parameters = parsedUrl.queryKey;

    if (this.parameters.t) this.type = this.parameters.t;
    if (this.parameters.a) this.action = decodeURIComponent(this.parameters.a);
    if (this.parameters.v) this.action = decodeURIComponent(this.parameters.v);

    if (this.parameters.id) this.id = this.parameters.id;
    if (this.parameters.sig) this.signature = decodeURIComponent(this.parameters.sig);

    if (this.parameters.f) {
      this.fields = this.parameters.f.split(',')
        .map((f) => {
          return decodeURIComponent(f);
        });
      this.fields.sort();
    }
  }

  /**
   * Handle a new response from a request
   *
   * The response object should contain these fields:
   *   challenge - the challenge string from the request
   *   time - the time the user signed the message
   *   address - the address corresponding to the signing key
   *   signature - the signature in base64
   *   fields - any data fields that were sent across
   *
   * @param serverUrl
   * @param responseObject
   */
  newResponse(serverUrl, responseObject) {
    return new HeimdalResponse(serverUrl, responseObject);
  }

  /**
   * Verify whether the heimdal url is valid and has been signed properly (if applicable)
   */
  verifyRequest() {
    if (this.protocol !== 'heimdal') return false;
    if (!this.authority) return false;

    if (this.signature) {
      const message = this.getSigningMessage();

      return this.verifyMessage(message, this.id, this.signature);
    }

    return true;
  }

  getSigningMessage() {
    const fields = this.fields.map((f) => {
      return encodeURIComponent(f);
    });
    fields.sort();

    return this.protocol + '://'
      + this.authority
      + '/'
      + this.challenge
      + '?t=' + this.type
      + '&a=' + this.action
      + '&f=' + fields.join(',')
      + '&v=' + (this.value || '')
      + '&x=' + (this.extension || '');
  }

  /**
   * Sign a message with the private key of this instance
   *
   * @param message
   */
  signMessage(message) {
    return Message(Buffer.from(message))
      .sign(this.#privateKey);
  }

  /**
   * Verify the message given against the signature given
   *
   * @param message {string} String message to verify the signature for
   * @param address {string} Bitcoin address
   * @param signature {string} Signature in base64
   */
  verifyMessage(message, address, signature) {
    try {
      return Message.verify(Buffer.from(message), address, signature);
    } catch (e) {
      return false;
    }
  }
};
