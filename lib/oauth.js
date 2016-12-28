/**
 * 微信用户认证
 */
'use strict';

const utils = require('./utils');
const querystring = require('querystring');

//http://mp.weixin.qq.com/wiki/17/c0f37d5704f0b64713d5d2c37b468d75.html
//
const AccessToken = function (data) {
  if (!(this instanceof AccessToken)) {
    return new AccessToken(data);
  }
  this.data = data;
};

/**
 * access_token 是否过期
 * [isValid description]
 * @return {Boolean} [description]
 */
AccessToken.prototype.isValid = function () {
  return !!this.data.access_token && (new Date().getTime()) < (this.data.create_at + this.data.expires_in * 1000);
};
/**
 * [OAuth description]
 * * 根据appid和appsecret创建OAuth接口的构造函数
 * 如需跨进程跨机器进行操作，access token需要进行全局维护
 * 使用使用token的优先级是：
 *
 * 1. 使用当前缓存的token对象
 * 2. 调用开发传入的获取token的异步方法，获得token之后使用（并缓存它）。
 *
 * @param {[type]} appid     [description]
 * @param {[type]} appsecret [description]
 * @param {[type]} getToken  [description] 获取token
 * @param {[type]} saveToken [description] 存储token
 */
let OAuth = function (opts, saveToken, getToken, savePublicToken, getPublicToken) {
  this.appid = opts.appid;
  this.secret = opts.secret;
  this.store = {};

  this.saveToken = saveToken || function* (openid, token) {
    this.store[openid] = token;
  };
  this.getToken = getToken || function* (openid) {
    return this.store[openid];
  };

  this.savePublicToken = savePublicToken || function* (token) {
    this.store['public_token'] = token;
  };
  this.getPublicToken = getPublicToken || function* () {
    return this.store['public_token'];
  };

}

/**
 * 设置urllib 参数
 * [setOpts description]
 * @param {[type]} opts [description]
 */
OAuth.prototype.setOpts = function (opts) {
  this.defaults = opts;
};

/**
 * access_token是公众号的全局唯一票据，公众号调用各接口时都需使用access_token
 * http://mp.weixin.qq.com/wiki/15/54ce45d8d30b6bf6758f68d2e95bc627.html
 * [getPublicAccessToken description]
 * @return {Generator} [description]
 */
OAuth.prototype.getPublicAccessToken = function* () {
  let public_token = yield this.getPublicToken();

  if (public_token) {
    return public_token;
  }

  let url = 'https://api.weixin.qq.com/cgi-bin/token';
  let info = {
    appid: this.appid,
    secret: this.secret,
    grant_type: 'client_credential'
  };
  let args = {
    data: info,
    dataType: 'json'
  };

  var data = yield utils.requestAsync(url, args);

  if (!data.errcode) {
    yield this.savePublicToken(data);
  }

  return data;
}

/**
 * 获取授权页面的URL地址
 * @param {String} redirect 授权后要跳转的地址
 * @param {String} state 开发者可提供的数据
 * @param {String} scope 作用范围，值为snsapi_userinfo和snsapi_base，前者用于弹出，后者用于跳转
 * snsapi_base （不弹出授权页面，直接跳转，只能获取用户openid），
 * snsapi_userinfo （弹出授权页面，可通过openid拿到昵称、性别、所在地。并且，即使在未关注的情况下，只要用户授权，也能获取其信息）unionid
 */
OAuth.prototype.getOAuthorizeURL = function (redirect, scope, state) {
  let url = 'https://open.weixin.qq.com/connect/oauth2/authorize';
  let info = {
    appid: this.appid,
    redirect_uri: redirect,
    response_type: 'code',
    scope: scope || 'snsapi_userinfo',
    state: state || ''
  };

  return url + '?' + querystring.stringify(info) + '#wechat_redirect';
};

/**
 * 获取授权页面的URL地址
 * @param {String} redirect 授权后要跳转的地址
 * @param {String} state 开发者可提供的数据
 * @param {String} scope 作用范围，值为snsapi_login，前者用于弹出，后者用于跳转
 */
OAuth.prototype.getOAuthorizeURLForWebsite = function (redirect, scope, state) {
  let url = 'https://open.weixin.qq.com/connect/qrconnect';
  let info = {
    appid: this.appid,
    redirect_uri: redirect,
    response_type: 'code',
    scope: scope || 'snsapi_login',
    state: state || ''
  };

  return url + '?' + querystring.stringify(info) + '#wechat_redirect';
};
/**
 * 获取accesstoken 并缓存
 * [getAccessToken description]
 * @param  {[type]}    code [description]
 * @return {Generator}      [description]
 */
OAuth.prototype.getAccessToken = function* (code) {

  let url = 'https://api.weixin.qq.com/sns/oauth2/access_token';
  let info = {
    appid: this.appid,
    secret: this.secret,
    code: code,
    grant_type: 'authorization_code'
  };
  let args = {
    data: info,
    dataType: 'json'
  };

  var data = yield utils.requestAsync(url, args);
  yield this.processToken(data);
  return data;
};
/**
 * 缓存用户access token
 * [processToken description]
 * @param  {[type]}    data [description]
 * @return {Generator}      [description]
 */
OAuth.prototype.processToken = function* (data) {

  data.create_at = new Date().getTime();
  if (!data.openid) {
    return false;
  }

  yield this.saveToken(data.openid, data);

  return AccessToken(data);
}

/**
 * 刷新access_token
 * [refreshAccessToken description]
 * @param  {[type]}    refreshToken [description]
 * @return {Generator}              [description]
 */
OAuth.prototype.refreshAccessToken = function* (refreshToken) {
  var url = 'https://api.weixin.qq.com/sns/oauth2/refresh_token';
  var params = {
    appid: this.appid,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  };
  var args = {
    data: params,
    dataType: 'json'
  };

  var data = yield utils.requestAsync(url, args);
  yield this.processToken(data);

  return data;
};

/**
 *  从微信端获取用户信息
 * [_getUserInfo description]
 * @param  {[type]}    options [description]
 * @return {Generator}         [description]
 */
OAuth.prototype._getUserInfo = function* (openid, access_token) {
  let url = 'https://api.weixin.qq.com/sns/userinfo';
  let params = {
    access_token: access_token,
    openid: openid,
    lang: 'zh_CN'
  };
  let args = {
    data: params,
    dataType: 'json'
  };

  return yield utils.requestAsync(url, args);
}

/**
 * 获取用户信息
 * [getUser description]
 * @param  {[type]}    openid [description]
 * @return {Generator}        [description]
 */
OAuth.prototype.getUser = function* (openid) {

  let access_cache_token = yield this.getToken(openid);
  try {
    access_cache_token = JSON.parse(access_cache_token);
  } catch (e) {
    // access_token = access_token;
    throw new Error(e);
  }

  let Token = AccessToken(access_cache_token);
  let access_token;

  if (Token.isValid()) {
    access_token = Token.data.access_token;
  } else {
    let new_token = yield this.refreshAccessToken(Token.data.refresh_token);
    if (new_token.data) {
      access_token = new_token.data.access_token;
    }
  }

  return yield this._getUserInfo(openid, access_token);
}


module.exports = OAuth;
