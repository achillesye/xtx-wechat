const urllib = require('urllib');
const crypto = require('crypto');
const co = require('co');
const xml2js = require('xml2js');

let utils = {};
utils.mergeObject = function (superObject, subObject) {
  if ((typeof superObject !== 'object') || (typeof subObject !== 'object')) {
    return superObject;
  }

  for (let key in subObject) {
    if (subObject.hasOwnProperty(key)) {
      if (typeof subObject[key] === 'object') {
        superObject[key] = (typeof superObject[key] === 'object') ?
          superObject[key] : {};
        utils.mergeObject(superObject[key], subObject[key]);
      } else {
        superObject[key] = subObject[key];
      }
    }
  }
  return superObject;
}

utils.generateNonceString = function (length) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var maxPos = chars.length;
  var noceStr = "";
  for (var i = 0; i < (length || 32); i++) {
    noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return noceStr;
};

utils.requestAsync = function (url, opts) {
    return new Promise(function (resolve, reject) {
      utils.request(url, opts, function (err, data, res) {
        if (err) {
          reject(err);
          throw new Error(err);
        }
        resolve(data);
      })
    });
    // return co(utils.request(url, opts));
    // .then(function (data) {
    //   return data;
    // }).catch(function (err) {
    //   throw new Error(err);
    // });
  }
  /**
   * http 同步请求
   * [request description]
   * @param  {[type]}   url  [description] ulr 地址
   * @param  {[type]}   opts [description] request 参数 https://www.npmjs.com/package/urllib
   * @param  {Function} fn   [description] 回调函数
   * @return {[type]}        [description]
   */
utils.request = function (url, opts, fn) {
  let options = {
    headers: {
      'Content-Type': 'application/json'
    },
    dataType: 'json'
  };
  if (typeof opts === 'function') {
    fn = opts;
    opts = {};
  }

  opts || (opts = {});
  for (var key in opts) {
    if (key !== 'headers') {
      options[key] = opts[key];
    } else {
      if (opts.headers) {
        options.headers = options.headers || {};
        utils.mergeObject(options.headers, opts.headers);
      }
    }
  }
  if (typeof fn !== 'function') {
    fn = function () {};
  }

  urllib.request(url, options, fn);
};


utils.genHash = (content, algorithm = 'sha1') => {
  const c = crypto.createHash(algorithm);
  c.update(content);
  return (c.digest('hex')).toLocaleUpperCase();
};
utils.paramsToString = (args) => {
  let keys = Object.keys(args);
  keys = keys.sort();
  const newArgs = {};
  keys.forEach((key) => {
    newArgs[key.toLowerCase()] = args[key];
  });

  let str = '';
  for (let k in newArgs) {
    if (newArgs.hasOwnProperty(k)) {
      str += '&' + k + '=' + newArgs[k];
    }
  }
  str = str.substr(1);
  return str;
};

utils.genSHA1 = content => utils.genHash(content, 'sha1');

utils.parserXML = function* (xml) {
  let parser = new xml2js.Parser();
  return new Promise(function (resolve, reject) {
    parser.parseString(xml, function (err, result) {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });

}

utils.buildXML = function (obj) {
  let builder = new xml2js.Builder({
    cdata: true
  });
  return builder.buildObject(obj);
}


module.exports = utils;;;;
