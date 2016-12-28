/**
 * 微信支付
 */

'use strict';

const utils = require('./utils');

function Payment(opts, saveTicket, getTicket) {
  this.appid = opts.appid;
  this.mch_id = opts.mch_id;
  this.key = opts.key;
  this.notify_url = opts.notify_url;
  this.apiclient_key = opts.apiclient_key || '';
  this.apiclient_cert = opts.apiclient_cert || '';

  this.store = {};
  this.saveTicketCache = saveTicket || function* (ticket) {
    this.store['public_ticket'] = ticket;
  };

  this.getTicketCache = getTicket || function* () {
    return this.store['public_ticket'];
  }

  this.noncestr = function () {
    return utils.generateNonceString();
  };
  this.timestamp = function () {
    let date = new Date();
    return date.getTime().toString().substr(0, 10);
  }

}

/**
 * 获取并且保存ticket
 * [jsapiTicket description]
 * @param  {[type]}    openid       [description]
 * @param  {[type]}    access_token [description]
 * @return {Generator}              [description]
 */
Payment.prototype._jsapiTicket = function* (access_token) {
  let url = 'https://api.weixin.qq.com/cgi-bin/ticket/getticket';

  let info = {
    access_token: access_token,
    type: 'jsapi'
  };
  let args = {
    data: info,
    key: this.apiclient_key,
    cert: this.apiclient_cert,
    dataType: 'json'
  };

  var data = yield utils.requestAsync(url, args);
  if (!data.errcode) {
    yield this.saveTicketCache(data);
  }

  return data;
}

/**
 * 获取ticket
 * [getTicket description]
 * @param  {[type]}    openid       [description]
 * @param  {[type]}    access_token [description]
 * @return {Generator}              [description]
 */
Payment.prototype.getTicket = function* (access_token) {
  let ticket_cache = yield this.getTicketCache();

  if (ticket_cache) {
    return ticket_cache;
  }
  let ticket = yield this._jsapiTicket(access_token);

  return ticket;
}

/**
 * 发送请求
 * [request description]
 * @param  {[type]}    url     [description]
 * @param  {[type]}    options [description]
 * @return {Generator}         [description]
 */
Payment.prototype.request = function* (url, options) {

  let sign_str = utils.genHash(utils.paramsToString(options) + '&key=' + this.key, 'md5');
  options.sign = sign_str;
  options = {
    xml: options
  }

  let parmas = {
    method: 'post',
    data: utils.buildXML(options),
    headers: {
      "Content-Type": 'application/xml'
    },
    dataType: 'text'
  };

  let result = yield utils.requestAsync(url, parmas);

  return yield utils.parserXML(result);
}

/**
 * 统一下单
 * [createUnifiedOrder description]
 * @param  {[type]}    opts [description]
 * @return {Generator}      [description]
 */
Payment.prototype.createUnifiedOrder = function* (opts) {

  let url = 'https://api.mch.weixin.qq.com/pay/unifiedorder';

  let options = {
    appid: this.appid,
    mch_id: this.mch_id,
    nonce_str: this.noncestr(),
    trade_type: 'NATIVE', //JSAPI--公众号支付、NATIVE--原生扫码支付、APP--app支付,MICROPAY--刷卡支付
    body: '',
    out_trade_no: '',
    total_fee: '',
    notify_url: this.notify_url
      // spbill_create_ip: '',
  }
  options = utils.mergeObject(options, opts);

  return yield this.request(url, options);
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
 * --签名用的noncestr和timestamp必须与wx.config中的nonceStr和timestamp相同。
 * --签名用的url必须是调用JS接口页面的完整URL。
 * [getConfig description]
 * @return {[type]} [description]
 *
 * 校验工具 http://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=jsapisign
 */
Payment.prototype.getConfig = function (url, ticket) {
  let params = {
    jsapi_ticket: ticket,
    noncestr: this.noncestr(),
    timestamp: this.timestamp(),
    url: url
  };
  console.log('params -- ' + JSON.stringify(params));
  let signature = utils.genSHA1(utils.paramsToString(params));

  return {
    appId: this.appid,
    timestamp: params.timestamp,
    nonceStr: params.noncestr,
    signature: signature
  };
}

/**
 *
 * timestamp: 0, // 支付签名时间戳，注意微信jssdk中的所有使用timestamp字段均为小写。但最新版的支付后台生成签名使用的timeStamp字段名需大写其中的S字符
 * nonceStr: '', // 支付签名随机串，不长于 32 位
 * package: '', // 统一支付接口返回的prepay_id参数值，提交格式如：prepay_id=***）
 * signType: '', // 签名方式，默认为'SHA1'，使用新版支付需传入'MD5'
 * paySign: '', // 支付签名
 * [chooseWXPay description]
 * @return {Generator} [description]
 */
Payment.prototype.chooseWXPay = function* (prepay_id) {
  let params = {
    appId: this.appid,
    package: "prepay_id=" + prepay_id,
    nonceStr: this.noncestr(),
    timeStamp: this.timestamp(),
    signType: 'md5'
  };
  let pay_sign = utils.genHash(utils.paramsToString(params), 'md5');

  return {
    appId: this.appid,
    timestamp: params.timeStamp,
    nonceStr: params.nonceStr,
    package: params.package,
    signType: params.signType,
    paySign: pay_sign
  };
}

/**
 * 订单查询
 * [orderquery description]
 * @param  {[type]}    out_trade_no [description]
 * @return {Generator}              [description]
 */
Payment.prototype.orderquery = function* (out_trade_no) {
  let url = 'https://api.mch.weixin.qq.com/pay/orderquery';
  let options = {
    appid: this.appid,
    mch_id: this.mch_id,
    nonce_str: this.noncestr(),
    out_trade_no: out_trade_no
      //transaction_id 微信的订单号，建议优先使用
  }

  return yield this.request(url, options);
}

/**
 * 关闭订单
 * [closeorder description]
 * @param  {[type]}    out_trade_no [description]
 * @return {Generator}              [description]
 */
Payment.prototype.closeorder = function* (out_trade_no) {
  let url = 'https://api.mch.weixin.qq.com/pay/closeorder';
  let options = {
    appid: this.appid,
    mch_id: this.mch_id,
    nonce_str: this.noncestr(),
    out_trade_no: out_trade_no
  }

  return yield this.request(url, options);
}

/**
 * 退款
 * [refund description]
 * @param  {[type]}    opts [description]
 * @return {Generator}      [description]
 */
Payment.prototype.refund = function* (opts) {
  let url = 'https://api.mch.weixin.qq.com/pay/refund';
  let options = {
    appid: this.appid,
    mch_id: this.mch_id,
    nonce_str: this.noncestr(),
    out_trade_no: ''
  }
  options = utils.mergeObject(options, opts);

  return yield this.request(url, options);
}

/**
 * 退款查询
 * [refundquery description]
 * @param  {[type]}    out_trade_no [description]
 * @return {Generator}              [description]
 */
Payment.prototype.refundquery = function* (out_trade_no) {
  let url = 'https://api.mch.weixin.qq.com/pay/refundquery';
  let options = {
    appid: this.appid,
    mch_id: this.mch_id,
    nonce_str: this.noncestr(),
    out_trade_no: out_trade_no
  }

  return yield this.request(url, options);
}

Payment.prototype.callback = function* () {

}

/**
 * 签名验证
 * [verifySign description]
 * @param  {[type]} data [description]
 * @param  {[type]} sign [description]
 * @return {[type]}      [description]
 */
Payment.prototype.verifySign = function (data, sign) {
  let sign_str = utils.genHash(utils.paramsToString(data) + '&key=' + this.key, 'md5');
  if (sign_str === sign) {
    return true;
  }
  return false;
}

module.exports = Payment;
