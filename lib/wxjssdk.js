/**
 * 在微信浏览器里面打开H5网页中执行JS调起支付
 * http://mp.weixin.qq.com/wiki/7/aaa137b55fb2e0456bf8dd9148dd613f.html
 *
 */

'use strict';

const utils = require('./utils');

function WXJSSDK(opts, saveTicket) {
  this.appid = opts.appid;
  this.store = {};
  this.saveTicket = saveTicket || function* (openid, ticket) {
    this.store[openid] = ticket;
  };

  this.getTicket = getTicket || function* (openid) {
    return this.store[openid];
  }

  this.noncestr = function () {
    return utils.generateNonceString();
  };
  this.timestamp = function () {
    let date = new Date();
    return date.getTime();
  }
}

/**
 * 获取并且保存ticket
 * [jsapiTicket description]
 * @param  {[type]}    openid       [description]
 * @param  {[type]}    access_token [description]
 * @return {Generator}              [description]
 */
WXJSSDK.prototype.jsapiTicket = function* (openid, access_token) {
  let url = 'https://api.weixin.qq.com/cgi-bin/ticket/getticket';

  let info = {
    access_token: access_token,
    type: 'jsapi'
  };
  let args = {
    data: info,
    dataType: 'json'
  };

  var data = yield utils.requestAsync(url, args);
  yield this.saveTicket(openid, data);
  return data;
}

/**
 * 获取ticket
 * [getTicket description]
 * @param  {[type]}    openid       [description]
 * @param  {[type]}    access_token [description]
 * @return {Generator}              [description]
 */
WXJSSDK.prototype.getTicket = function* (openid, access_token) {
  if (this.getTicket(openid)) {
    return yield this.getTicket(openid);
  }
  let ticket = this.jsapiTicket(openid, access_token);

  return ticket;
}

/**
 *
 * [signature description]
 * @param  {[type]}    opts [description]
 * @return {Generator}      [description]
 */
WXJSSDK.prototype.signature = function* (opts) {
  let sign_str = {
    noncestr: opts.noncestr,
    jsapi_ticket: opts.ticket,
    timestamp: opts.timestamp,
    url: opts.url
  }

  return yield utils.genSHA1(sign_str);
}

/**
 * 所有需要使用JS-SDK的页面必须先注入配置信息，否则将无法调用（同一个url仅需调用一次，对于变化url的SPA的web app可在每次url变化时进行调用,
 * 目前Android微信客户端不支持pushState的H5新特性，
 * 所以使用pushState来实现web app的页面会导致签名失败，此问题会在Android6.2中修复）。
 * debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
 * appId: '', // 必填，公众号的唯一标识
 * timestamp: , // 必填，生成签名的时间戳
 * nonceStr: '', // 必填，生成签名的随机串
 * signature: '', // 必填，签名，见附录1
 * jsApiList: [] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
 *
 * [getConfig description]
 * @return {[type]} [description]
 */
WXJSSDK.prototype.getConfig = function () {
  let params = {
    noncestr: this
  }

}

WXJSSDK.prototype.chooseWXPay = function () {
  timestamp: 0, // 支付签名时间戳，注意微信jssdk中的所有使用timestamp字段均为小写。但最新版的支付后台生成签名使用的timeStamp字段名需大写其中的S字符
  nonceStr: '', // 支付签名随机串，不长于 32 位
  package: '', // 统一支付接口返回的prepay_id参数值，提交格式如：prepay_id=***）
  signType: '', // 签名方式，默认为'SHA1'，使用新版支付需传入'MD5'
  paySign: '', // 支付签名
}

WXJSSDK.prototype.payConfig = function* (opts) {
  let timestamp = this.timestamp(),
    nonce_str = this.noncestr(),
    appid = this.appid,
    jsapi_ticket = yield this.getTicket(opts.openid, opts.access_token);

  let config = yield this.getConfig({
    appid: appid
    timestamp: timestamp,
    nonce_str: nonce_str,
    jsapi_ticket: jsapi_ticket,
    url: opts.url
  });
  let chooseWXPay = yield this.chooseWXPay({
    ppid: appid
    timestamp: timestamp,
    nonce_str: nonce_str,
    jsapi_ticket: jsapi_ticket
  });
}

module.exports = WXJSSDK;
