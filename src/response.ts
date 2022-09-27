import moment from 'moment';
// @ts-ignore
import Message from 'bsv/message';
import { jsonStableStringify } from './utils';
import { DEFAULT_ACTION } from './constants';
import { ResponseBody } from "./interface";

/**
 * Heimdal response
 *
 * @type {HeimdalResponse}
 */
export const HeimdalResponse = class {
  serverUrl: string;
  challenge: string;
  time: number;
  address: string;
  signature: string;
  fields: {[key: string]: string | number};
  action: string;

  errors: any;
  signed: any;
  bap: any;

  constructor(serverUrl: string, responseObject: any, action = '') {
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

  isValid(): boolean {
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

    if (this.bap && this.bap.length) {
      try {
        // BAP uses the same message for signing as the normal request
        if (!Message.verify(messageBuffer, this.bap.address, this.bap.signature)) {
          this.errors.push('Could not verify BAP signature');
          return false;
        }
      } catch (e) {
        this.errors.push('Could not verify BAP signature');
        return false;
      }
    }

    return true;
  }

  /**
   * Get the string message to sign for the verification
   *
   * This does not include the BAP data, as BAP also needs to include a signature of the data to be
   * validated (using this function), which creates a circular dependency. BAP is signed separately
   * and all the BAP data can be verified with on chain attestations.
   *
   * @returns {string}
   */
  getSigningMessage(): string {
    return this.serverUrl
      + '/'
      + this.challenge
      + '?time=' + this.time
      // @ts-ignore
      + '&f=' + encodeURIComponent(jsonStableStringify(this.fields));
  }

  setSignature(address: string, signature: string): void {
    this.address = address;
    this.signature = signature;
  }

  getResponseUrl(): string {
    return `${this.serverUrl}${this.action}`;
  }

  getResponseBody(): ResponseBody | null {
    if (!this.challenge || !this.time || !this.address || !this.signature) {
      this.errors.push('Missing one of the required fields');
      return null;
    }

    const responseBody: ResponseBody = {
      challenge: this.challenge,
      time: this.time,
      address: this.address,
      signature: this.signature,
      fields: this.fields,
    };

    if (this.bap) {
      responseBody.bap = this.bap;
    }

    if (this.signed) {
      responseBody.signed = this.signed;
    }

    return responseBody;
  }

  getId(): string {
    return this.address;
  }

  getChallenge(): string {
    return this.challenge;
  }

  getFields(): { [key: string]: string | number } {
    return this.fields;
  }

  getFieldValue(fieldName: string): string | number | undefined {
    return this.fields[fieldName];
  }

  setFieldValue(fieldName: string, fieldValue: string | number): void {
    this.fields[fieldName] = fieldValue;
  }

  getVerifiedField(fieldName: string): any | undefined {
    const verifiedFields = this.bap?.attributes;
    if (verifiedFields) {
      return verifiedFields[fieldName];
    }

    return undefined;
  }

  getVerifiedFieldValue(fieldName: string): string | number | undefined {
    const field = this.getVerifiedField(fieldName);
    if (field) {
      return field?.value;
    }
    return undefined;
  }

  getVerifiedFieldNonce(fieldName: string): string | undefined {
    const field = this.getVerifiedField(fieldName);
    if (field) {
      return field?.nonce;
    }
    return undefined;
  }
};
