# Heimdal login protocol
> [Heimdal](https://en.wikipedia.org/wiki/Heimdallr) is a god who keeps watch for invaders and the onset of Ragnarök from his dwelling Himinbjörg, where the burning rainbow bridge Bifröst meets the sky.

Heimdal is a login protocol that utilizes Bitcoin key pairs to create a fully self-sovereign online identity for users to safely and easily log on to any supported website or app, without leaving a trace of anything like an email or password behind.

A user could be presented with a QR code on a website to scan to log in. When the user scans the QR code with a compatible app, a simple request is sent directly from the app to the site, which is then verified, and the user is immediately logged in.

Unlike other protocols, like oAuth, there is no handshake between the client and server necessary, which makes Heimdal both simpler and faster than those other protocols.

Heimdal also optionally allows a website to request information from the user when logging in, for instance his name or email address. This is also sent across with the same single request, creating a much simpler login and onboarding experience.

Heimdal apps that support the BAP extension will also be able to share attested attributes, like third party KYC checks, which can be verified on the Bitcoin blockchain by any third party.

## Logging in

A user is presented with a QR code and a checksum, for simple visual validation by the user, with the following link:

```
heimdal://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05?t=api&a=/api/v1/loginViaQr
```    

Where the path of the url is the challenge key, the `t` url parameter is the type of requested response, and the `a` (api) parameter points to the api endpoint on the server.

The paramters `t` and `a` can be left out, if the default values are being used. The default value for `t` is `api`, and the default value for `a` is `/loginWithQr`.

A simplified version of a Heimdal login uri, using the defaults, would look like this:

```
heimdal://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05
```    

The checksum is calculated from the complete url as follows:

```javascript
// hash the qrCode
const qrHex = bsv.crypto.Hash.sha256(Buffer.from(qrCode));

// create an address from the public key of the private key of the qrHex
const address = bsv.PrivateKey.fromHex(qrHex).publicKey.toAddress().toString();

// take the last 2 blocks of 4 characters of the address
return address.substr(-8,4) + '-' + address.substr(-4);
```

The user scans the QR code. The Heimdal client extracts the different parts of the url and creates a response request for the website:

```javascript
const request = {
  "query": "a=/api/v1/loginViaQr",
  "path": "/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05",
  "host": "demo.heimdal.app",
  "authority": "demo.heimdal.app", // authority will include the port if applicable
  "protocol": "heimdal",
  "queryKey": {
    "a": "/api/v1/loginViaQr"
  }
}
```

Response:

```javascript
const url = 'https://' + request.authority + (request.queryKey.a || '/');
const challenge = request.path.substr(1); // remove the leading /
const privateKey = bsv.PrivateKey.fromWIF(...); // the private key used for the idenfication
const address = privateKey.publicKey.toAddress().toString();
const time = moment.unix();

// https://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05&time=1231006505
const responseMessage = 'https://' + request.authority + '/' + challenge + '&time=' + time;

const _signature_ = bsv.Message(responseMessage).sign(privateKey);
const fields = {};
const request = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    challenge,
    time,
    address,
    signature,
    fields,
  }),
};

fetch(url, request).then(() => ...);
```

The receiving server should verify all the information that was sent and log the user in. The server should also take care of only accepting challenge keys that were created recently on the server.

**NOTE: The server address (`authority`) of the message is not sent in the request, only the challenge key and time.**

### Requesting information from the user

The Heimdal protocol follows the schema.org definition of attributes that are available to be requested.

When a site wants to request some information from the user, an `f` (fields) url attribute needs to be added to the login request.

```
heimdal://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05?t=api&a=/api/v1/loginViaQr&f=name,email
```

In this case `name` and `email` are being requested. The Heimdal app should populate the `fields` response variable with those fields with the user's information, like this:

```javascript
const fields = {
  name: 'Satoshi Nakamoto',
  email: 'satoshin@gmx.com'
}
```

**NOTE: Attribute names can never contain a comma `,` or a semi-colon `;`.**

By default, all fields that are requested are mandatory. When a field being requested is not mandatory, add a `*` at the end of the field to signal to the Heimdal application that the field does not necessarily have to be returned.

```
heimdal://demo.heimdal.app/...&f=name,email,#employeeId*
```

The `*` should not be returned when the response request is sent.

### Verifying on the server

The receiving server will get a request object with the following JSON data:

```json
{
  "challenge": "F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05",
  "time": 1231006505,
  "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "signature": "<...>",
  "fields": {
    "name": "Satoshi Nakamoto",
    "email": "satoshin@gmx.com"
  }
}
```

**NOTE: The `fields` attributes are not verified or validated at all. They should be treated as preference values by the receiving application.**

## Authenticating login request from sites

A site can add authentication to the request url to increase the security of the data interchange. In this way, it is almost impossible for a third party to create a valid login request on behalf of the website.

The login URLs for a secure request are quite long, but should be readable on a generated QR code by most scanners on the market today.

```
heimdal://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05?t=api&a=/api/v1/loginViaQr&f=name,email&sig=HCyn9ScK6IeGNwTBBQqPu%2F4i6T%2BaMj1wugryxEpRsNUSOVyusBZ%2BuQebpgP2QJRE4Uso9WxPGL75xK5PbqtOcOM%3D&id=1HJshh5r2e63CmL1wtvDBrncLVD9bbpXwS
```

The signature is a standard Bitcoin message signature of the url, including the `t`, `a` and `f` parameters, in that order, or in this example `heimdal://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05?t=api&a=/api/v1/loginViaQr&f=`. The `f` (fields) should be sorted alphabetically for the signing.

**NOTE: even if the `t`, `a` or `f` parameters were left off the initial request, for instance for a shorter url and smaller QR code, they should be added when signing the url.**

The Heimdal client should verify the signature in the request and store the `id` (address) of the site for subsequent visits. From then on, any requests from that site should always (!) be verified against that address.

## Handling larger requests

Since a QR code is a limited way of transmitting data, it is also possible to tell the Heimdal client to fetch the needed request information from a url. This is done by settings the `t` variable to `fetch`.

Example:

```
heimdal://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05?t=fetch&a=/api/v1/dataForQrLogin
```

The challenge key should still be added to the URL, and now the api endpoint given in `a` will be used to get the request data needed. A POST request will be made by the client as follows:

```javascript
const url = 'https://demo.heimdal.app/api/v1/dataForQrLogin';
const request = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    challenge,
  }),
};

fetch(url, request).then(() => ...);
```

This should return a json data package with all the information needed for the login, that otherwise would have been added in the query part of the url.

```json
{
  "t": "api",
  "a": "/api/v1/loginViaQr",
  "f": "name,email,bap[employeeId]",
  "x": "bap",
  "sig": "<...>",
  "id": "1HJshh5r2e63CmL1wtvDBrncLVD9bbpXwS"
}
```

The process after this step is exactly the same as normally.

## Adding attributes from a site

Any website or application, like an employer or partner, can ask the user to add an attribute to his profile, related to that application, which can then be requested by that application back.

A data addition request would look like this:

```
heimdal://demo.heimdal.app/?t=add&f=[attribute]&v=[value]
```

Example:

```
heimdal://demo.heimdal.app/?t=add&f=#employeeId&v=2423422
```

This would be telling the Heimdal client to add a field `#employeeId` with a value of `2423422` to the user's identity attributes. This data should only be available for the site `demo.heimdal.app` and not be returned when any other site would make a request for the attribute. The attributes should always be prefixed with a `#`.

```
https://.../?...&f=bap[name;email;#employeeId]
```

The `#` should (!) be returned when the response request is sent.

This can also be done in a more secure manner, when the site identifies itself with a Bitcoin key pair.

```
heimdal://demo.heimdal.app/?t=add&f=[attribute]&v=[value]&sig=[Signature]&id=[address]
```

The signature is a standard Bitcoin message signature of the attribute and value concatenated like `[attribute]:[value]`, or in this example like `#employeeId:2423422`.

Example:

```
heimdal://demo.heimdal.app/?t=add&f=#employeeId&v=2423422&sig=HCyn9ScK6IeGNwTBBQqPu%2F4i6T%2BaMj1wugryxEpRsNUSOVyusBZ%2BuQebpgP2QJRE4Uso9WxPGL75xK5PbqtOcOM%3D&id=1HJshh5r2e63CmL1wtvDBrncLVD9bbpXwS
```

The site now always has to sign any request to the client, using the same key pair, otherwise the information should not be returned.

**NOTE: The key pair used for this data interchange does not have to be the same as the key pair used for the login authentication. It is encouraged that sites (deterministically) create a separate key pair for every user on their site.**

**NOTE: Make sure the values in the URL are encoded correctly to be able to be picked up by the Heimdal application. You can, for instance, use `encodeURIComponent` for this in Javascript.**

## Hardening the login procedure

Instead of relying only on the key pairs for authenticating users, it is also possible for a website to require the user to register an account before logging in with Heimdal. Subsequently, when the user is logging in, the user firsts needs to fill in a username, after which he is presented with a QR code for scanning. The site has linked the QR code (and the challenge) to the user account and now only accepts a login attempt from that user, using the keys on file.

This increases the security slightly, but at a cost of the user experience.

## Using Heimdal as a 2FA

It is also possible to use Heimdal as a two-factor-authentication alone, triggered after a username / password login. Since Heimdal works with cryptographic keys, it is also more secure than traditional 2FA, where the site and the user have a shared secret for the authentication.

The procedure for this would be exactly the same as the login procedure. On the Heimdal side no changes are needed to be able to use it as a 2FA device. On the website side, the site would need to store the address of the key pair being used for the 2FA, instead of a shared secret.

## Query parameters in requests

| Parameter | Name       | Description                                    |
| --------- | ---------- | ---------------------------------------------- |
| t         | type       | Type of request (`api`, `app`, `add`, `fetch`) |
| a         | action     | What url / applicationId to call as resonse    |
| f         | fields     | The fields to include in the response          |
| x         | extension  | The Heimdal extension to use for the request   |
| sig       | signature  | Verification signature of the site             |
| id        | id address | Address corresponding to the site signature    |

Type of request:

| Type   | Description                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------- |
| api    | A request to an api endpoint, given in `a` should be done with the response data                        |
| app    | An internal app link should be called ([`a`]://...) with the response data                              |
| add    | Data is being added to the profile of the user / No response required.                                  |
| fetch  | A fetch request should be done to get the data for this request. Should be used for very large requests |

## Working with verified identities and attributes

The Heimdal protocol can be extended to work with full identities as defined by the Bitcoin Attestation Protocol (BAP). BAP allows more advanced forms of identity, with attested attributes and rotation of signing keys as important examples.

To request a login response from a full BAP identity, the `x` (extension) attribute would be added to the request url (QR code), like this:

```
heimdal://demo.heimdal.app/F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05?t=api&a=/api/v1/loginViaQr&x=bap&f=name,email
```

This signals to the heimdal application to handle the login with the `bap` extension, if available. If the extension is not available, the application should stop and not process the login.

The response from the client is almost the same as before, but the `message` should now also be signed by a full BAP identity that has been attested for on the blockchain. This signature, and corresponding address, will be found in the `bap` part of the response.

The receiving server should validate both the heimdal signature, aswell as the bap signature, and verify that the bap address belongs to a BAP identity. The BAP identity key can then be looked up from a blockchain indexer, or a BAP API service. If the identity key exists, and the address is a valid address for signing at this time, the response will be accepted. See BAP for further information about BAP identities.

### Working with attested attributes

Unlike the attributes in the regular Heimdal requests, attested attributes contain a secret nonce, and a hash of the attributes has been published to the blockchain. The receiving server can then verify that the attributes have been attested to by a trusted service, and that the information is real and valid.

A request for BAP attested attributes should be encapsulated in a `bap[...]` block and looks like this:

```
https://.../?...&f=bap[name;email;over21]
```

**NOTE: In this case the requested attributes are separated by a semi-colon `;` to allow easily parsable mixing and matching of BAP and un-attested attributes. (`alternateName` is the schema org attribute for nickname).**

The response of such a request would look like this:

```json
{
  "challenge": "F8mkHwQu8-B8SClgugXBY1hTsWhS6casjbNLjGTShYSBXItuVLNbJ1_NWCtNlw05",
  "time": 1231006505,
  "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "signature": "<...>",
  "fields": {},
  "bap": {
    "address": "1bap9SLgBu5WuT5ERNPp785QqELGnfu9s",
    "signature": "<...>",
    "attributes": {
      "name": {
        "value": "Satoshi Nakamoto",
        "nonce": "1149b3e9002e49f73b6aae16d3b27d105b18f5f1d084a6a0daad07598e416bad"
      },
      "email": {
        "value": "satoshin@gmx.com",
        "nonce": "ca822b23cf4ca72023847fcffa7776969053cdb56cfe29e4d6485a0c098cb1ec"
      },
      "over21": {
        "value": 1,
        "nonce": "ca822b23cf4ca72023847fcffa7776969053cdb56cfe29e4d6485a0c098cb1ec"
      }
    }
  }
}
```

**NOTE: Even though a user would only share a very limited set of BAP attributes in a request, there is an issue of privacy, because the unique BAP identity key has been shared (via the address). Colluding sites can now piece together information about the user by joining data they have separately on the BAP identity.**

```
https://.../?...&f=alternateName,bap[over21]
```

See the [BAP documentation](https://github.com/icellan/bap) for further information about BAP identities and attestations.

## On login keys

Any Heimdal application will need to take care of creating the deterministic keys that are needed for the user to log in to various sites. These keys should not be re-used across sites, both for security, but also for privacy reasons. A method should be used to deterministically generate a different key pair for each site visited.

## Security considerations

Although using a Bitcoin key pair is a very powerful and secure way to let users login to a website, there are some important security considerations that need to be made, and a developer needs to be aware of.

### Phishing and Man in the Middle attacks

Like normal username / password logins, Heimdal is also susceptible to phishing attacks.

An attacker could trick the user to click on a link to a website with a similar looking url and request a login via QR code. The attacker would initiate a login session on the real site, passing along the QR code presented by the real site, but for the login session of the attacker. When the user scans the QR code on the attackers fake website and completes the login, the attacker would be successfully logged in on the real site.

Although this is a serious security threat, it is less so of a threat than if the user is logging in with a username and password. In the case the user is using Heimdal, the attacker never gets possession of the user's credentials. He is only capable of logging in that 1 time and if the website implements verifications via Heimdal for updating personal data, the attacker cannot do anything with the user's account.

A solution to the phishing problem can be found in the work done by the FIDO alliance. Combining a Heimdal login with a hardware USB login token, would make the login process a lot safer. This is not the end-all solution, however, as studies have shown this also to be susceptible to phishing attacks (https://eprint.iacr.org/2020/1298.pdf).

Another solution that needs to be explored is to use a browser plugin that takes care of the actual login procedure, while allowing the user to own and control their identity and keys on a mobile phone. The browser plugin with a mobile phone combination is a solution that is a lot more economical than requiring all users to have hardware tokens.

### Stolen keys and revoking

A real problem with giving users self-sovereign control of a key pair for identity purposes, is that users frequently lose their credentials, or lose access to their devices (through theft or loss). At least 2 problems arise out of this.

First, a user needs to be able to restore their identity after loss. This should be handled fully by the Heimdal client application. A good backup strategy should be required of the user, or preferably offered by the application provider.

Secondly, the user's keys could be compromised and get in the hands of an attacker, which would allow the attacker full access to all identities and logins. For logins using BAP, this is less of an issue, as the user can just rotate the signing keys for his identities, making it impossible for the attacker to login, even when in possession of the old keys. For pure Heimdal logins, this is an issue of updating the logins at all sites to new keys, which needs to be done in cooperation with the site owners.

## Extending the Heimdal protocol for other uses

By adding the `&x=...` url parameter to the login uri, it is possible to create very different processing packages that handle data very differently than currently described. Any Heimdal client should check for the `x` url paramater and verify whether it supports the extension. For the default Heimdal login, the `x` parameter should be left out of the url.
