"use strict";var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports,"__esModule",{value:!0}),exports.HeimdalId=void 0;var _privateKey,_address,_temp,_slicedToArray2=_interopRequireDefault(require("@babel/runtime/helpers/slicedToArray")),_classCallCheck2=_interopRequireDefault(require("@babel/runtime/helpers/classCallCheck")),_createClass2=_interopRequireDefault(require("@babel/runtime/helpers/createClass")),_classPrivateFieldLooseBase2=_interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldLooseBase")),_classPrivateFieldLooseKey2=_interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldLooseKey")),_bsv=_interopRequireDefault(require("bsv")),_message=_interopRequireDefault(require("bsv/message")),_moment=_interopRequireDefault(require("moment")),_response=require("./response"),_random=require("./random"),_utils=require("./utils"),_constants=require("./constants"),HeimdalId=(_temp=(_privateKey=(0,_classPrivateFieldLooseKey2["default"])("privateKey"),_address=(0,_classPrivateFieldLooseKey2["default"])("address"),function(){function a(b){(0,_classCallCheck2["default"])(this,a),Object.defineProperty(this,_privateKey,{writable:!0,value:""}),Object.defineProperty(this,_address,{writable:!0,value:""}),b&&this.setPrivateKey(b),this.resetVariables()}return(0,_createClass2["default"])(a,[{key:"setPrivateKey",value:function setPrivateKey(a){(0,_classPrivateFieldLooseBase2["default"])(this,_privateKey)[_privateKey]=_bsv["default"].PrivateKey.fromWIF(a),(0,_classPrivateFieldLooseBase2["default"])(this,_address)[_address]=(0,_classPrivateFieldLooseBase2["default"])(this,_privateKey)[_privateKey].toAddress().toString()}},{key:"getAddress",value:function getAddress(){return(0,_classPrivateFieldLooseBase2["default"])(this,_address)[_address]}},{key:"resetVariables",value:function resetVariables(){this.source="",this.protocol="heimdal",this.host="",this.port="",this.authority="",this.challenge="",this.parameters=[],this.type=_constants.DEFAULT_TYPE,this.action=_constants.DEFAULT_ACTION,this.fields=[],this.value=void 0,this.extension="",this.signature=null,this.id=null,this.errors=[]}},{key:"newRequest",value:function newRequest(a){if(!a)throw new Error("Authority is mandatory");this.resetVariables(),a=a.replace(/^https?:\/\//,""),a=a.replace(/\/$/,"");var b=a.split(":"),c=(0,_slicedToArray2["default"])(b,2),d=c[0],e=c[1];this.host=d,this.port=e,this.authority=a,this.challenge=_random.Random.secret(32)}},{key:"setChallenge",value:function setChallenge(a){this.challenge=a}},{key:"getChallenge",value:function getChallenge(){return this.challenge}},{key:"setType",value:function setType(a){if(!_constants.ALLOWED_TYPES.includes(a))throw new Error("This type is not allowed");this.type=a}},{key:"setAction",value:function setAction(a){this.action=a}},{key:"getChecksum",value:function getChecksum(a){var b=_bsv["default"].crypto.Hash.sha256(Buffer.from(a)),c=_bsv["default"].PrivateKey.fromHex(b).publicKey.toAddress().toString();return"".concat(c.substr(-8,4),"-").concat(c.substr(-4))}},{key:"addField",value:function addField(a){this.fields.push(a)}},{key:"addFields",value:function addFields(a){var b=this;a.forEach(function(a){b.fields.includes(a)||b.fields.push(a)})}},{key:"getFields",value:function getFields(){return this.fields||[]}},{key:"getCleanFields",value:function getCleanFields(){return this.getFields().map(function(a){return a.replace("*","")})}},{key:"setFields",value:function setFields(a){this.fields=Array.isArray(a)?a:[]}},{key:"getValue",value:function getValue(){return this.value}},{key:"getAction",value:function getAction(){return this.action||"/loginViaQr"}},{key:"getType",value:function getType(){return this.type||"api"}},{key:"getAuthority",value:function getAuthority(){return this.authority||""}},{key:"getServerUrl",value:function getServerUrl(){return"https://"+this.authority}},{key:"getId",value:function getId(){return this.id||null}},{key:"getSignature",value:function getSignature(){return this.signature||null}},{key:"addFieldValue",value:function addFieldValue(a,b){this.fields=[a],this.value=b,this.setType("add"),this.setAction("")}},{key:"getRequest",value:function getRequest(){var a=!!(0<arguments.length&&void 0!==arguments[0])&&arguments[0];if(!this.authority||!this.challenge)throw new Error("Not initialized properly");var b=this.protocol+"://"+this.authority+"/"+this.challenge,c=!0;return a&&this.type===_constants.DEFAULT_TYPE||(b+=(c?"?":"&")+"t="+this.type,c=!1),a&&this.action===_constants.DEFAULT_ACTION||(b+=(c?"?":"&")+"a="+this.action,c=!1),this.fields.length&&(b+=(c?"?":"&")+"f="+this.fields.map(function(a){return encodeURIComponent(a)}).join(","),c=!1),this.value&&(b+=(c?"?":"&")+"v="+encodeURIComponent(this.value)),b}},{key:"getSignedRequest",value:function getSignedRequest(){var a=!!(0<arguments.length&&void 0!==arguments[0])&&arguments[0];if(!(0,_classPrivateFieldLooseBase2["default"])(this,_privateKey)[_privateKey])throw new Error("No private key set for signing");var b=this.getRequest(a),c=this.getSigningMessage(),d=this.signMessage(c),e=!b.match(/\?/);return b+=(e?"?":"&")+"sig="+encodeURIComponent(d),b+="&id="+(0,_classPrivateFieldLooseBase2["default"])(this,_address)[_address],b}},{key:"requestFromUrl",value:function requestFromUrl(a){if(!a.match(/^[;,/?:@&=+$-_.!~*'%()a-z0-9]+$/))throw new Error("Illegal characters found in QR Code");var b=(0,_utils.parseUri)(a);if(!b.protocol||"heimdal"!==b.protocol)throw new Error("Not a valid protocol for Heimdal");if(!b.authority)throw new Error("Domain authority could not be parsed");this.checksum=this.getChecksum(a),this.source=b.source,this.protocol=b.protocol,this.host=b.host,this.port=b.port,this.authority=b.authority,this.challenge=b.path.substr(1),this.parameters=b.queryKey,this.parameters.t&&(this.type=this.parameters.t),this.parameters.a&&(this.action=decodeURIComponent(this.parameters.a)),this.parameters.v&&(this.value=decodeURIComponent(this.parameters.v)),this.parameters.id&&(this.id=this.parameters.id),this.parameters.sig&&(this.signature=decodeURIComponent(this.parameters.sig)),this.parameters.f&&(this.fields=this.parameters.f.split(",").map(function(a){return decodeURIComponent(a)}),this.fields.sort())}},{key:"newResponse",value:function newResponse(a,b){var c=!!(2<arguments.length&&void 0!==arguments[2])&&arguments[2];return new _response.HeimdalResponse(a,b,c||this.action)}},{key:"createResponse",value:function createResponse(a){var b=new _response.HeimdalResponse(this.getServerUrl(),{challenge:this.getChallenge(),time:(0,_moment["default"])().unix(),fields:a},this.action);if((0,_classPrivateFieldLooseBase2["default"])(this,_privateKey)[_privateKey]){var c=b.getSigningMessage();b.signature=this.signMessage(c),b.address=this.getAddress()}return b}},{key:"verifyRequest",value:function verifyRequest(){if("heimdal"!==this.protocol)return!1;if(!this.authority)return!1;if(this.signature){var a=this.getSigningMessage();return this.verifyMessage(a,this.id,this.signature)}return!0}},{key:"getSigningMessage",value:function getSigningMessage(){if(!this.authority)throw new Error("Domain authority has not been set");if(!this.challenge)throw new Error("Challenge key has not been set");var a=this.fields.map(function(a){return encodeURIComponent(a)});return a.sort(),this.protocol+"://"+this.authority+"/"+this.challenge+"?t="+this.type+"&a="+this.action+"&f="+a.join(",")+"&v="+(this.value||"")+"&x="+(this.extension||"")}},{key:"signMessage",value:function signMessage(a){return(0,_message["default"])(Buffer.from(a)).sign((0,_classPrivateFieldLooseBase2["default"])(this,_privateKey)[_privateKey])}},{key:"verifyMessage",value:function verifyMessage(a,b,c){try{return _message["default"].verify(Buffer.from(a),b,c)}catch(a){return!1}}}]),a}()),_temp);exports.HeimdalId=HeimdalId;