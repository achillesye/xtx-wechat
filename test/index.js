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
  host: 'localhost',
  db: 2
});
redisClient.auth('password');

app.use(function* (ctx, next) {
  let appid = 'appid',
    mch_id = 'mch_id',
    key = 'key',
    secret = 'secret',
    notify_url = 'notify_url';

  //构造支付函数
  let wxpay = new Payment({
    appid: 'appid',
    mch_id: 'mch_id',
    key: 'key',
    notify_url: 'notify_url'
  }, function* (ticket) {
    //缓存ticket jssdk 支付
    redisClient.setex('wechat:access_token:ticket', ticket.expires_in - 120, JSON.stringify(ticket));
  }, function* (openid) {
    //获取ticket
    let result = yield redisClient.getAsync('wechat:access_token:ticket');
    return JSON.parse(result);
  });

  创建订单（ 统一下单）
  let result = yield wxpay.createUnifiedOrder({
    body: 'zhifuceshi',
    total_fee: 1,
    out_trade_no: '123'
  });
  let result = yield wxpay.orderquery('123');



  let wechat_oauth = new OAuth({
      appid: 'appid',
      secret: 'secret'
    },
    function* (openid, data) {
      //access_token 缓存
      redisClient.setex('wechat:access_token:' + openid, ticket.expires_in - 120, JSON.stringify(data));
    },
    function* (openid) {
      let result = yield redisClient.getAsync('wechat:access_token:' + openid);
      return JSON.parse(result);
    },
    function* (data) {
      //公众号 token 缓存
      redisClient.setex('wechat:access_token:public', ticket.expires_in - 120, JSON.stringify(data));
    },
    function* () {
      let result = yield redisClient.getAsync('wechat:access_token:public');
      return JSON.parse(result);
    });
  //获取公众可token
  let public_token = yield wechat_oauth.getPublicAccessToken();
  //获取ticket
  let result_ticket = yield wxpay.getTicket(public_token.access_token);
  //h5 页面调用支付 jssdk
  //公共配置参数
  let config = yield wxpay.getConfig('http://mtest.xuetianxia.cn', result_ticket.ticket);
  let order = yield wxpay.createUnifiedOrder({
    out_trade_no: 'tsfdsfsafsa',
    body: '测试支付',
    trade_type: 'JSAPI',
    total_fee: 1
  });
  //支付配置参数
  let choose_pay = yield wxpay.chooseWXPay(order.xml.prepay_id);
  this.body = {
    config: config,
    wx_choose_pay: choose_pay
  }

  //获取code url
  let url = wechat_oauth.getOAuthorizeURL(redirect_uri);
  //根据code 获取token
  let access_token = yield wechat_oauth.getAccessToken(code);
  //刷新token
  let access_token = yield wechat_oauth.refreshAccessToken(access_token.access_token);

});

const server = require('http').createServer(app.callback());
server.listen(2000, function () {
  console.log('listen port at 2000');
});
