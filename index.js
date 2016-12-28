const OAuth = require('./lib/oauth');
const WxPay = require('./lib/payment');
const utils = require('./lib/utils');

module.exports = {
  OAuth: OAuth,
  WxPay: WxPay,
  utils: utils
}
