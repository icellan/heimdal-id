import cryptoRandomString from 'crypto-random-string';

export const Random = {
  secret(length = 32) {
    return cryptoRandomString({
      length,
      type: 'url-safe',
    });
  },
  hexString(length = 32) {
    return cryptoRandomString({ length });
  },
};

// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
// http://blog.stevenlevithan.com/archives/parseuri
export const parseUri = function (str) {
  /* eslint-disable max-len */
  const o = {
    strictMode: false,
    key: ['source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'],
    q: {
      name: 'queryKey',
      parser: /(?:^|&)([^&=]*)=?([^&]*)/g,
    },
    parser: {
      strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
      loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,
    },
  };

  const m = o.parser[o.strictMode ? 'strict' : 'loose'].exec(str);
  const uri = {};
  let i = 14;

  while (i--) uri[o.key[i]] = m[i] || '';

  uri[o.q.name] = {};
  uri[o.key[12]].replace(o.q.parser, ($0, $1, $2) => {
    if ($1) uri[o.q.name][$1] = $2;
  });

  return uri;
};

// https://github.com/substack/json-stable-stringify/commit/e43ca2a1dcfc39bf1514684492767ef6040d1f3e
// MIT License
/* eslint-disable */
export const jsonStableStringify = function (obj, opts) {
  if (!opts) opts = {};
  if (typeof opts === 'function') opts = { cmp: opts };
  let space = opts.space || '';
  if (typeof space === 'number') {
    space = Array(space + 1).join(' ');
  }

  const cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;
  const replacer = opts.replacer || function (key, value) { return value; };

  const cmp = opts.cmp && (function (f) {
    return function (node) {
      return function (a, b) {
        const aobj = {
          key: a,
          value: node[a],
        };
        const bobj = {
          key: b,
          value: node[b],
        };
        return f(aobj, bobj);
      };
    };
  })(opts.cmp);

  const seen = [];
  return (function stringify(parent, key, node, level) {
    const indent = space ? ('\n' + new Array(level + 1).join(space)) : '';
    const colonSeparator = space ? ': ' : ':';

    if (node && node.toJSON && typeof node.toJSON === 'function') {
      node = node.toJSON();
    }

    node = replacer.call(parent, key, node);

    if (node === undefined) {
      return;
    }
    if (typeof node !== 'object' || node === null) {
      return JSON.stringify(node);
    }
    if (Array.isArray(node)) {
      const out = [];
      for (let i = 0; i < node.length; i++) {
        const item = stringify(node, i, node[i], level + 1) || JSON.stringify(null);
        out.push(indent + space + item);
      }
      return '[' + out.join(',') + indent + ']';
    } else {
      if (seen.indexOf(node) !== -1) {
        if (cycles) return JSON.stringify('__cycle__');
        throw new TypeError('Converting circular structure to JSON');
      } else {
        seen.push(node);
      }

      const keys = Object.keys(node).sort(cmp && cmp(node));
      const out = [];
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const value = stringify(node, k, node[k], level + 1);

        if (!value) continue;

        const keyValue = JSON.stringify(k)
          + colonSeparator
          + value;
        out.push(indent + space + keyValue);
      }
      seen.splice(seen.indexOf(node), 1);
      return '{' + out.join(',') + indent + '}';
    }
  })({ '': obj }, '', obj, 0);
};
