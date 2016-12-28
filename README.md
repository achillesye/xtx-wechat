# xtx-wechat

#### 参考资料

* 集成微信支付，用户认证，h5 页面支付功能 for nodejs
* https://github.com/JasonBoy/wechat-jssdk/blob/master/test/JSSDK.test.js
* https://github.com/perzy/co-wechat-payment
* https://pay.weixin.qq.com/wiki/doc/api/jsapi.php
* http://mp.weixin.qq.com/wiki/7/aaa137b55fb2e0456bf8dd9148dd613f.html


#### 构造支付函数

```javascript
  const WxPay = require('WxPay');

  let wxpay = new WxPay({
    appid: 'appid',
    mch_id: 'mch_id',
    key: 'key',
    notify_url: 'notify_url',
    //设置商户证书 （退款需要）
    apiclient_key: 'apiclient_key',
    apiclient_cert: 'apiclient_cert'

  }, function* (ticket) {
    //缓存ticket jssdk 支付
  }, function* (openid) {
    //获取ticket
  });
```
####  创建订单（ 统一下单）
```javascript
  let result = yield wxpay.createUnifiedOrder({
    body: 'body',
    total_fee: 1,
    out_trade_no: 'out_trade_no'
  });
```
#### 微信用户认证
```javascript
  const OAuth = require('OAuth');

  let wechat_oauth = new OAuth({
      appid: 'appid',
      secret: 'secret'
    },
    function* (openid, data) {
      //access_token 缓存
    },
    function* (openid) {
      //从缓存中获取 access_token
    },
    function* (data) {
      //公众号 access_token 缓存
    },
    function* () {
      //从缓存中获取公众号 access_token
    });

  //获取code
  let url = wechat_oauth.getOAuthorizeURL(redirect_uri);
  //根据code 获取token
  wechat_oauth.getAccessToken(code);
  //刷新token
  wechat_oauth.refreshAccessToken(refresh_access_token);

```
#### h5 页面调用支付 (jssdk)
  ```javascript
  //获取公众可token
  let public_token = yield wechat_oauth.getPublicAccessToken();
  //获取ticket
  let result_ticket = yield wxpay.getTicket(public_token.access_token);
  //公共配置参数
  let config = yield wxpay.getConfig(url, result_ticket.ticket);
  //创建支付订单
  let order = yield wxpay.createUnifiedOrder({
    out_trade_no: 'out_trade_no',
    body: '测试支付',
    trade_type: 'JSAPI',
    total_fee: 1
  });
  //支付配置参数
  let wx_choose_pay = yield wxpay.chooseWXPay(order.xml.prepay_id);

```
### 订单管理
```javascript
//订单查询
yield wxpay.orderquery(out_trade_no);
//关闭订单
yield wxpay.closeorder(out_trade_no);
//退款
yield wxpay.refund(out_trade_no);
//退款查询
yield wxpay.refundquery(out_trade_no);
//回调签名验证
yield wxpay.verifySign(return_body, sign);
```
