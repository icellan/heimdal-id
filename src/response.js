import moment from 'moment';
import Message from 'bsv/message';
import { jsonStableStringify } from './utils';
import { DEFAULT_ACTION } from './constants';

/**
 * Heimdal response
 *
 * @type {HeimdalResponse}
 */
export const HeimdalResponse = class {
  constructor(serverUrl, responseObject, action = false) {
    // remove trailing slash if added by accident
    serverUrl = serverUrl.replace(/\/+$/, '');

    const {
      challenge,
      time,
      address,
      signature,
      fields,
      bap,
    } = responseObject;

    this.serverUrl = serverUrl;
    this.challenge = challenge;
    this.time = time;
    this.address = address;
    this.signature = signature;
    this.fields = fields || [];

    this.signed = null;

    this.bap = bap || [];

    // we need this from the heimdal object to create the response url
    this.action = action || DEFAULT_ACTION;

    this.errors = [];
  }

  isValid() {
    // pre-check
    if (!this.serverUrl || !this.challenge || !this.time || !this.address || !this.signature) {
      this.errors.push('Not all fields are filled in');
      return false;
    }

    const mTime = moment.unix(this.time);
    if (!mTime.isValid()) {
      this.errors.push('Invalid time');
      return false;
    }
    if (mTime.isAfter(moment())) {
      this.errors.push('Time is in the future');
      return false;
    }
    if (mTime.add(30, 'seconds').isBefore(moment())) {
      this.errors.push('Signature has expired');
      return false;
    }

    // check the signature from this user and validate the public key
    // server url includes the protocol, but not the trailing slash - https://demo.heimdal.app
    const messageBuffer = Buffer.from(this.getSigningMessage());
    try {
      if (!Message.verify(messageBuffer, this.address, this.signature)) {
        this.errors.push('Could not verify signature');
        return false;
      }
    } catch (e) {
      this.errors.push('Could not verify signature');
      return false;
    }

    return true;
  }

  getSigningMessage() {
    let signingMessage = this.serverUrl
      + '/'
      + this.challenge
      + '?time=' + this.time
      + '&f=' + encodeURIComponent(jsonStableStringify(this.fields));

    if (this.bap) {
      signingMessage += '&bap=' + encodeURIComponent(jsonStableStringify(this.bap));
    }

    return signingMessage;
  }

  setSignature(address, signature) {
    this.address = address;
    this.signature = signature;
  }

  getResponseUrl() {
    return `${this.serverUrl}${this.action}`;
  }

  getResponseBody() {
    if (!this.challenge || !this.time || !this.address || !this.signature) {
      this.errors.push('Missing one of the required fields');
      return false;
    }

    const responseBody = {
      challenge: this.challenge,
      time: this.time,
      address: this.address,
      signature: this.signature,
      fields: this.fields,
    };

    if (this.signed) {
      responseBody.signed = this.signed;
    }

    return responseBody;
  }

  getId() {
    return this.address;
  }

  getChallenge() {
    return this.challenge;
  }

  getFields() {
    return this.fields;
  }

  getFieldValue(fieldName) {
    return this.fields[fieldName];
  }

  setFieldValue(fieldName, fieldValue) {
    this.fields[fieldName] = fieldValue;
  }

  getVerifiedField(fieldName) {
    const verifiedFields = this.bap?.attributes;
    if (verifiedFields) {
      return verifiedFields[fieldName];
    }

    return undefined;
  }

  getVerifiedFieldValue(fieldName) {
    const field = this.getVerifiedField(fieldName);
    if (field) {
      return field?.value;
    }
    return undefined;
  }

  getVerifiedFieldNonce(fieldName) {
    const field = this.getVerifiedField(fieldName);
    if (field) {
      return field?.nonce;
    }
    return undefined;
  }
};
