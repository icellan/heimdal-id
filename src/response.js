import moment from 'moment';
import Message from 'bsv/message';

/**
 * Heimdal response
 *
 * @type {HeimdalResponse}
 */
export const HeimdalResponse = class {
  constructor(serverUrl, responseObject) {
    const {
      challenge,
      time,
      address,
      signature,
      fields,
    } = responseObject;

    this.serverUrl = serverUrl;
    this.challenge = challenge;
    this.time = time;
    this.address = address;
    this.signature = signature;
    this.fields = fields || [];

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
    const message = this.serverUrl + this.challenge + '&time=' + this.time;
    const messageBuffer = Buffer.from(message);
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
