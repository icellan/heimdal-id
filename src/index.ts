import bsv, { Networks } from 'bsv';
// @ts-ignore
import Message from 'bsv/message';
import moment from 'moment';

import { HeimdalResponse } from './response';
import { Random } from './random';
import { parseUri } from './utils';
import {
  DEFAULT_TYPE,
  DEFAULT_ACTION,
  ALLOWED_TYPES,
  AIP_BITCOM_ADDRESS,
} from './constants';
import { ResponseBody } from "./interface";

/**
 * Heimdal
 *
 * @type {HeimdalId}
 */
export const HeimdalId = class {
  #privateKey: bsv.PrivateKey | undefined;
  #address = '';

  source?: string;
  protocol?: string;
  host?: string;
  port?: string | number;
  authority?: string;
  challenge?: string;
  parameters?: { [key: string]: string | number };
  type?: string;
  action?: string;
  fields: string[];
  value?: string | number;
  extension?: string;
  signData?: any;
  signature?: string;
  id?: string;

  checksum?: string;
  errors?: Error[];

  constructor(privateKey?: string) {
    if (privateKey) {
      this.setPrivateKey(privateKey);
    }
    this.fields = [];

    this.resetVariables();
  }

  /**
   * Set, or re-set, the private key to use during operations
   *
   * @param privateKey
   */
  setPrivateKey(privateKey: string): void {
    this.#privateKey = bsv.PrivateKey.fromWIF(privateKey);
    this.#address = this.#privateKey.toAddress(Networks.mainnet).toString();
  }

  getAddress(): string | undefined {
    return this.#address;
  }

  /**
   * Reset all internal variables to their defaults
   */
  resetVariables(): void {
    this.source = '';
    this.protocol = 'heimdal';
    this.host = '';
    this.port = '';
    this.authority = '';
    this.challenge = '';
    this.parameters = {};

    this.type = DEFAULT_TYPE;
    this.action = DEFAULT_ACTION;
    this.fields = [];
    this.value = undefined;
    this.extension = '';

    this.signData = '';

    this.signature = undefined;
    this.id = undefined;

    this.errors = [];
  }

  /**
   * Start a new Heimdal request
   * @param authority
   */
  newRequest(authority: string): void {
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
  setChallenge(challenge: string): void {
    this.challenge = challenge;
  }

  getChallenge(): string | undefined {
    return this.challenge;
  }

  /**
   * Set the type of response requested, see ALLOWED_TYPES
   *
   * @param type
   */
  setType(type: string): void {
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
  setAction(action: string): void {
    this.action = action;
  }

  getChecksum(url: string): string {
    const qrHex = bsv.crypto.Hash.sha256(Buffer.from(url));
    // @ts-ignore
    const address = bsv.PrivateKey.fromHex(qrHex)
      .publicKey
      .toAddress()
      .toString();
    return `${address.substr(-8, 4)}-${address.substr(-4)}`;
  }

  addField(fieldName: string): void {
    this.fields.push(fieldName);
  }

  addFields(fields: string[]): void {
    fields.forEach((fieldName) => {
      if (!this.fields.includes(fieldName)) {
        this.fields.push(fieldName);
      }
    });
  }

  getFields(): string[] {
    return this.fields;
  }

  /**
   * This function cleans the fields of any /\*$/ present, indicating an optional field
   * @returns {[]}
   */
  getCleanFields(): string[] {
    return this.getFields().map((f) => { return f.replace('*', ''); });
  }

  setFields(fields: string[]): void {
    this.fields = Array.isArray(fields) ? fields : [];
  }

  getValue(): string | number | undefined {
    return this.value;
  }

  getAction(): string {
    return this.action || '/loginViaQr';
  }

  getType(): string {
    return this.type || 'api';
  }

  getAuthority() {
    return this.authority || '';
  }

  getServerUrl(): string {
    return 'https://' + this.authority;
  }

  getId(): string | null {
    return this.id || null;
  }

  getSignature(): string | null {
    return this.signature || null;
  }

  getSigningData(): string | null {
    return this.signData || null;
  }

  setSigningData(signData: any) {
    this.signData = signData;
  }

  /**
   * Add a field value to the request
   *
   * This will overwrite any other fields set for this request + set the type to 'add' and unset action
   *
   * @param fieldName
   * @param fieldValue
   */
  addFieldValue(fieldName: string, fieldValue: string | number | undefined) {
    this.fields = [fieldName];
    this.value = fieldValue;

    this.setType('add');
    this.setAction('');
  }

  /**
   * Get the heimdal login url with the set parameters
   *
   * @param short {boolean} Whether to return a url that is as short as possible, with default values
   *
   * @throws Error on missing authority ot challenge
   * @returns {string}
   */
  getRequest(short = false): string {
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
   *
   * @throws Error on missing private key
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

  /**
   * Initialize a new request from a url
   *
   * @throws Error on illegal characters in url, not a valid Heimdal protocol string, missing authority
   * @param url
   */
  requestFromUrl(url: string): void {
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

    this.source = parsedUrl.source as string;
    this.protocol = parsedUrl.protocol;
    this.host = parsedUrl.host as string;
    this.port = parsedUrl.port;
    this.authority = parsedUrl.authority as string;
    const path = parsedUrl.path as string;
    this.challenge = path?.substr(1);
    this.parameters = parsedUrl.queryKey as unknown as { [key: string]: string | number };

    // type and action should always reflect the url that was posted
    this.type = this.parameters?.t as string || '';
    this.action = this.parameters?.a as string || '';

    if (this.parameters?.hasOwnProperty('v')) this.value = decodeURIComponent(this.parameters?.v as string);
    if (this.parameters?.id) this.id = this.parameters.id as string;
    if (this.parameters?.sig) this.signature = decodeURIComponent(this.parameters?.sig as string);

    if (this.parameters?.f) {
      const f = this.parameters.f as string;
      this.fields = f.split(',')
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
  newResponse(serverUrl: string, responseObject: any, action = '') {
    return new HeimdalResponse(serverUrl, responseObject, action || this.action || DEFAULT_ACTION);
  }

  /**
   * Create a new response object from the loaded parameters
   *
   * This can be used to send a response back to a server for verification for a login
   *
   * @param fields {array}
   */
  createResponse(fields: string[]): ResponseBody {
    const response = new HeimdalResponse(this.getServerUrl(), {
      challenge: this.getChallenge(),
      time: moment().unix(),
      fields,
    }, this.action || DEFAULT_ACTION);

    if (this.#privateKey) {
      // create a signature from the loaded private key
      const message = response.getSigningMessage();
      response.signature = this.signMessage(message);
      response.address = this.getAddress() || '';

      if (this.signData) {
        response.signed = this.getSignedData();
      }
    }

    return response;
  }

  /**
   * Verify whether the heimdal url is valid and has been signed properly (if applicable)
   *
   * @return boolean
   */
  verifyRequest(): boolean {
    if (this.protocol !== 'heimdal') return false;
    if (!this.authority) return false;

    if (this.signature) {
      const message = this.getSigningMessage();

      return this.verifyMessage(message, this.id as string, this.signature);
    }

    return true;
  }

  /**
   * Get the message string to sign with the private key
   *
   * @throws Error on missing authority ot challenge
   * @return string
   */
  getSigningMessage(): string {
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
   * Sign the set signData with the correct function
   */
  getSignedData() {
    if (this.signData?.message) {
      return {
        message: this.signData.message,
        signature: this.signMessage(this.signData.message),
        address: this.#address,
      };
    }

    if (this.signData?.op_return) {
      return {
        algorithm: 'AIP',
        op_return: this.signOpReturn(this.signData.op_return),
      };
    }

    if (this.signData?.tx) {
      return this.signTx(this.signData.tx);
    }

    return false;
  }

  /**
   * Sign the given op return data array
   *
   * @param opReturn
   */
  signOpReturn(opReturn: string[]) {
    const aipMessageBuffer = this.getAIPMessageBuffer(opReturn);
    // TODO is this correct ???
    const {
      // @ts-ignore
      address,
      // @ts-ignore
      signature,
    } = this.signMessage(aipMessageBuffer);

    return opReturn.concat([
      Buffer.from('|').toString('hex'),
      Buffer.from(AIP_BITCOM_ADDRESS).toString('hex'),
      Buffer.from('BITCOIN_ECDSA').toString('hex'),
      Buffer.from(address).toString('hex'),
      Buffer.from(signature, 'base64').toString('hex'),
    ]);
  }

  /**
   * get Message buffer for AIP
   *
   * @param opReturn
   * @returns {Buffer}
   */
  getAIPMessageBuffer(opReturn: string[]) {
    const buffers = [];
    if (opReturn[0].replace('0x', '') !== '6a') {
      // include OP_RETURN in constructing the signature buffer
      buffers.push(Buffer.from('6a', 'hex'));
    }
    opReturn.forEach((op) => {
      buffers.push(Buffer.from(op.replace('0x', ''), 'hex'));
    });
    // add a trailing "|" - this is the AIP way
    buffers.push(Buffer.from('|'));

    return Buffer.concat([...buffers]);
  }

  /**
   * Sign the given Bitcoin transaction
   *
   * @param tx
   *
   * @return boolean
   */
  signTx(tx: string) {
    // TODO
    console.log(tx);
    // const transaction = bsv.Transaction.fromString(tx);

    return false;
  }

  /**
   * Sign a message with the private key of this instance
   *
   * @param message
   *
   * @return Signature Messages signature object ( { address, signature } )
   */
  signMessage(message: string | Buffer): string {
    const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
    return Message(messageBuffer).sign(this.#privateKey);
  }

  /**
   * Verify the message given against the signature given
   *
   * @param message {string} String message to verify the signature for
   * @param address {string} Bitcoin address
   * @param signature {string} Signature in base64
   *
   * @return boolean
   */
  verifyMessage(message: string, address: string, signature: string) {
    try {
      return Message.verify(Buffer.from(message), address, signature);
    } catch (e) {
      return false;
    }
  }
};
