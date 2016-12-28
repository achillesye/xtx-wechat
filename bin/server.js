'use strict';
require("babel-register");

const Koa = require('koa');
const app = new Koa();

const utils = require('../lib/utils');
const OAuth = require('../lib/oauth');
const Redis = require('redis');
const bluebird = require('bluebird');
const Payment = require('../lib/Payment');


bluebird.promisifyAll(Redis.RedisClient.prototype);
bluebird.promisifyAll(Redis.Multi.prototype);

const redisClient = Redis.createClient({
  host: '192.168.1.100',
  db: 2
});
redisClient.auth('1-100pubserver@winhu');

app.use(function* (ctx, next) {
  redisClient.setex('wechat:access_token_cccc', 15, 'test_name');
  return;
  let wxpay = new Payment({
    appid: 'wx78153ec6b464390c',
    mch_id: '1365399402',
    key: 'hEP1sDtdA0lVG2DLoakWcb2z4c4l1lpb',
    notify_url: 'http://www.11121013.com/callback.php'
  }, function* (ticket) {
    redisClient.set('wechat:access_token:ticket', JSON.stringify(ticket));
  }, function* (openid) {
    let result = yield redisClient.getAsync('wechat:access_token:ticket');
    return JSON.parse(result);
  });

  // let result = yield wxpay.createUnifiedOrder({
  //   body: 'zhifuceshi',
  //   total_fee: 1,
  //   out_trade_no: '123fdsa'
  // });
  // let result = yield wxpay.orderquery('123fdsa');

  // console.log('result ----- ' + JSON.stringify(result));
  //{"xml":{"return_code":["SUCCESS"],"return_msg":["OK"],"appid":["wx78153ec6b464390c"],"mch_id":["1365399402"],"nonce_str":["qCR5jT90HDkgnzY1"],"sign":["038CCAC90E48654CCFCD386DD4AC4B64"],"result_code":["SUCCESS"],"prepay_id":["wx201612262033308148efd3400647367163"],"trade_type":["NATIVE"],"code_url":["weixin://wxpay/bizpayurl?pr=3PJjdal"]}}
  // console.log('result ----- ' + JSON.stringify(result));
  let appid = 'wx78153ec6b464390c',
    mch_id = '1365399402',
    key = 'hEP1sDtdA0lVG2DLoakWcb2z4c4l1lpb',
    secret = 'fa276d333a0d4bfaf1b82d859d17162f',
    notify_url = 'http://www.xuetianxia.cn/marketing/red_packet/callback';

  let wechat_oauth = new OAuth({
      appid: 'wx78153ec6b464390c',
      secret: 'fa276d333a0d4bfaf1b82d859d17162f'
    },
    function* (openid, data) {
      redisClient.set('wechat:access_token:' + openid, JSON.stringify(data));
    },
    function* (openid) {
      return yield redisClient.getAsync('wechat:access_token:' + openid);
    },
    function* (data) {
      redisClient.set('wechat:access_token:public', JSON.stringify(data));
    },
    function* () {
      let result = yield redisClient.getAsync('wechat:access_token:public');
      return JSON.parse(result);
    });

  let public_token = yield wechat_oauth.getPublicAccessToken();
  // console.log('public_token -- ' + JSON.stringify(public_token));
  // console.log(public_token.access_token);
  let result_ticket = yield wxpay.getTicket(public_token.access_token);
  // console.log('result_ticket -- ' + JSON.stringify(result_ticket));
  let config = yield wxpay.getConfig('http://mtest.xuetianxia.cn', result_ticket.ticket);
  let order = yield wxpay.createUnifiedOrder({
    out_trade_no: 'tsfdsfsafsa',
    body: '测试支付',
    trade_type: 'JSAPI',
    total_fee: 1
  });
  let choose_pay = yield wxpay.chooseWXPay(order.xml.prepay_id);
  this.body = {
    config: config,
    wx_choose_pay: choose_pay
  }
  console.log('config -- ' + JSON.stringify(config));
  console.log('choose_pay -- ' + JSON.stringify(choose_pay));
  console.log('order -- ' + JSON.stringify(order.xml.prepay_id));
  // let result_ticket = yield wxpay.getTicket(public_token.access_token);
  // console.log('result_ticket  -- ' + JSON.stringify(result_ticket));
  // let redirect_uri = 'http://mtest.xuetianxia.cn';

  // let url = wechat_oauth.getOAuthorizeURL(redirect_uri);
  // console.log('url --- ' + url);
  // // let access_token = yield wechat_oauth.getAccessToken('001Pau0V0Mm7JW1Muo2V0Ofx0V0Pau0a');
  //
  // let refresh = 'LkU5y05fjJssHOJ9lKkq5HQJCE4ymS8V_s7Q0P1XiiXCm1Db1pCU5WW3Bmx9SHimdLO-8aBcH_lYCGhMzoFvcf9tt_bVB1mPSLh2XZ0RUs';
  // let public_token = yield wechat_oauth.getPublicAccessToken();
  // let access_token = yield wechat_oauth.refreshAccessToken('2_R9GNkhvVeHwwqBlB5gY-zsJazRH3e4p0NqBCSl9NT6_DpFQkF-7fWSOk38ubkZSI62vhyN-ORbjjuQEKo3rZtNdX_M1NLfVTULvkcD-2o');

  // console.log('access_token ' + JSON.stringify(access_token));
  //
  // let openid = 'o8JlMv475v3FPnomC6_B8Xouy1NI';
  // // let access_token = 'vsIf7U4ZO10ZlYNNsx0kb9HDEEinkNX2X_zWp8dzZB0alY2Z6gXKyScoMsROiNe5s73qs-rNePUgG0-w3YNP1mXyfCifzokuLdNCgIfDCbM';
  // console.log('access_token --- ' + access_token.access_token);
  // let result = yield wxpay.getTicket(openid, access_token.access_token);
  // console.log(result);

  // let access_token = "rQ4hyDSgWAuzkuFsP8YgTfxc6vcYCcM9kaBwEND05ox1MPpcQKONUIJQRJ3jh2EkIAlf0CCEHWUhE8cPV3R7ezdaH2bakq3mVXX6uNCeacU";
  // let refresh_token = "POHJanTKfqVXFyNCeFODp1t2z0gRASZVjP4yHI30F7mqoqn-q4Xu1otdfer6n0VcYG7iKgq7KThgX_i3yUroLKhnjn0QUX28VvmNRPpJLuo";
  // let openid = "o8JlMv475v3FPnomC6_B8Xouy1NI";
  // let unionid = "oJ-dowNnZzaH1Fyl7UXj7HXQmioE";
  // // console.log('wechat_oauth ' + JSON.stringify(wechat_oauth.store));
  // let get_user_info = yield wechat_oauth._getUserInfo(openid, access_token);
  // console.log('get_user_info---- ' + JSON.stringify(get_user_info));
  // let user_info = yield wechat_oauth.getUser('o8JlMv475v3FPnomC6_B8Xouy1NI');
  // let user_info = yield redisClient.getAsync('wechat:access_token:o8JlMv475v3FPnomC6_B8Xouy1NI');
  // redisClient.get('access_token:o8JlMv475v3FPnomC6_B8Xouy1NI', function (er, res) {
  //   console.log('------ ' + res);
  //   console.log('-er----- ' + er);
  //
  // });
  // console.log('user_info---- ' + JSON.stringify(user_info));
  // console.log('user_info---- ' + JSON.stringify(user_info));

  // let url = 'http://www.baidu.com';
  //
  // let result = yield utils.requestAsync(url, {
  //   dataType: 'text'
  // });
  // console.log(result);
  // this.body = result;


});

const server = require('http').createServer(app.callback());
server.listen(2000, function () {
  console.log('listen port at 2000');
});
