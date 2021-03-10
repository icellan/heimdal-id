import bsv from 'bsv';
import Message from 'bsv/message';
import moment from 'moment';
import { HeimdalResponse } from './response';
import { Random } from './random';
import { parseUri } from './utils';
import { DEFAULT_TYPE, DEFAULT_ACTION, ALLOWED_TYPES } from './constants';

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
    this.value = undefined;
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

    authority = authority.replace(/^https?:\/\//, ''); // remove protocol if applicable
    authority = authority.replace(/\/$/, ''); // remove trailing /
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

  /**
   * Set the type of response requested, see ALLOWED_TYPES
   *
   * @param type
   */
  setType(type) {
    if (!ALLOWED_TYPES.includes(type)) {
      throw new Error('This type is not allowed');
    }
    this.type = type;
  }

  /**
   * Set the action to perform when returning the login response
   *
   * For web (api) - always add as absolute url (with leading "/")
   * For mobile (app) - give the name of the intent
   *
   * @param action
   */
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

  addFields(fields) {
    fields.forEach((fieldName) => {
      if (!this.fields.includes(fieldName)) {
        this.fields.push(fieldName);
      }
    });
  }

  getFields() {
    return this.fields || [];
  }

  /**
   * This function cleans the fields of any /\*$/ present, indicating an optional field
   * @returns {[]}
   */
  getCleanFields() {
    return this.getFields().map((f) => { return f.replace('*', ''); });
  }

  setFields(fields) {
    this.fields = Array.isArray(fields) ? fields : [];
  }

  getValue() {
    return this.value;
  }

  getAction() {
    return this.action || '/loginViaQr';
  }

  getType() {
    return this.type || 'api';
  }

  getAuthority() {
    return this.authority || '';
  }

  getServerUrl() {
    return 'https://' + this.authority;
  }

  getId() {
    return this.id || null;
  }

  getSignature() {
    return this.signature || null;
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

  requestFromUrl(url) {
    // check url for illegal characters - stop processing if found
    // https://tc39.es/ecma262/#sec-encodeuricomponent-uricomponent
    if (!url.match(/^[;,/?:@&=+$-_.!~*'%()a-z0-9]+$/)) {
      throw new Error('Illegal characters found in QR Code');
    }

    const parsedUrl = parseUri(url);

    if (!parsedUrl.protocol || parsedUrl.protocol !== 'heimdal') {
      throw new Error('Not a valid protocol for Heimdal');
    }
    if (!parsedUrl.authority) {
      throw new Error('Domain authority could not be parsed');
    }

    this.checksum = this.getChecksum(url);

    this.source = parsedUrl.source;
    this.protocol = parsedUrl.protocol;
    this.host = parsedUrl.host;
    this.port = parsedUrl.port;
    this.authority = parsedUrl.authority;
    this.challenge = parsedUrl.path.substr(1);
    this.parameters = parsedUrl.queryKey;

    // type and action should always reflect the url that was posted
    this.type = this.parameters.t || '';
    this.action = this.parameters.a || '';

    if (this.parameters.hasOwnProperty('v')) this.value = decodeURIComponent(this.parameters.v);
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
   * @param action
   */
  newResponse(serverUrl, responseObject, action = false) {
    return new HeimdalResponse(serverUrl, responseObject, action || this.action || DEFAULT_ACTION);
  }

  /**
   * Create a new response object from the loaded parameters
   *
   * This can be used to send a response back to a server for verification for a login
   *
   * @param fields {array}
   */
  createResponse(fields) {
    const response = new HeimdalResponse(this.getServerUrl(), {
      challenge: this.getChallenge(),
      time: moment().unix(),
      fields,
    }, this.action || DEFAULT_ACTION);

    if (this.#privateKey) {
      // create a signature from the loaded private key
      const message = response.getSigningMessage();
      response.signature = this.signMessage(message);
      response.address = this.getAddress();
    }

    return response;
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
    if (!this.authority) {
      throw new Error('Domain authority has not been set');
    }
    if (!this.challenge) {
      throw new Error('Challenge key has not been set');
    }

    const fields = this.fields.map((f) => {
      return encodeURIComponent(f);
    });
    fields.sort();

    return this.protocol + '://'
      + this.authority
      + '/'
      + this.challenge
      + '?t=' + (this.type || DEFAULT_TYPE)
      + '&a=' + (this.action || DEFAULT_ACTION)
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
    return Message(Buffer.from(message)).sign(this.#privateKey);
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
