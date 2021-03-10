"use strict";var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports,"__esModule",{value:!0}),exports.jsonStableStringify=exports.parseUri=void 0;var _typeof2=_interopRequireDefault(require("@babel/runtime/helpers/typeof")),parseUri=function(a){for(var b={strictMode:!1,key:["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],q:{name:"queryKey",parser:/(?:^|&)([^&=]*)=?([^&]*)/g},parser:{strict:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,loose:/^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/}},c=b.parser[b.strictMode?"strict":"loose"].exec(a),d={},e=14;e--;)d[b.key[e]]=c[e]||"";return d[b.q.name]={},d[b.key[12]].replace(b.q.parser,function(a,c,e){c&&(d[b.q.name][c]=e)}),d};exports.parseUri=parseUri;var jsonStableStringify=function(a,b){b||(b={}),"function"==typeof b&&(b={cmp:b});var c=b.space||"";"number"==typeof c&&(c=Array(c+1).join(" "));var d=!("boolean"!=typeof b.cycles)&&b.cycles,e=b.replacer||function(a,b){return b},f=b.cmp&&function(c){return function(d){return function(e,a){var b={key:e,value:d[e]},f={key:a,value:d[a]};return c(b,f)}}}(b.cmp),g=[];return function a(b,h,j,l){var m=c?"\n"+Array(l+1).join(c):"",n=c?": ":":";if(j&&j.toJSON&&"function"==typeof j.toJSON&&(j=j.toJSON()),j=e.call(b,h,j),void 0!==j){if("object"!==(0,_typeof2["default"])(j)||null===j)return JSON.stringify(j);if(Array.isArray(j)){for(var o,p=[],q=0;q<j.length;q++)o=a(j,q,j[q],l+1)||JSON.stringify(null),p.push(m+c+o);return"["+p.join(",")+m+"]"}if(-1!==g.indexOf(j)){if(d)return JSON.stringify("__cycle__");throw new TypeError("Converting circular structure to JSON")}else g.push(j);for(var r=Object.keys(j).sort(f&&f(j)),s=[],t=0;t<r.length;t++){var u=r[t],k=a(j,u,j[u],l+1);if(k){var v=JSON.stringify(u)+n+k;s.push(m+c+v)}}return g.splice(g.indexOf(j),1),"{"+s.join(",")+m+"}"}}({"":a},"",a,0)};exports.jsonStableStringify=jsonStableStringify;