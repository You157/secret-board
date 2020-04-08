var express = require('express');
var router = express.Router();
// DBを設定したﾌｧｲﾙ
const Post = require('../models/post');
// Tracking_cookie操作
const Cookies = require('cookies');
const trackingIdKey = 'tracking_id';
// ハッシュ関数を利用するためのモジュール
const crypto = require('crypto');
// Key(ﾕｰｻﾞ名)：Value(ﾄｰｸﾝ)とした連想配列
const oneTimeTokenMap = new Map();
// 投稿Dateを見やすく編集する関数
const moment = require('moment-timezone');

/* GET home page. */
router.get('/', function (req, res, next) {
  if (req.user) {
    // login済みのときtracking_idをｾｯﾄする  
    const userName = req.user.username;
    // const cookies = new Cookies(req, res);
    // const trackingId = addTrackingCookie(cookies, userName);

    // --- cookiesﾓｼﾞｭｰﾙを使わずにtrackingCookieを利用するﾃｽﾄ --- //
    const trackingId_test = addTrackingCookie_test(req, res, userName);

    // ﾜﾝﾀｲﾑﾄｰｸﾝ作成
    var oneTimeToken = crypto.randomBytes(8).toString('hex');
    oneTimeTokenMap.set(userName, oneTimeToken);
    console.info(`
      閲覧されました: user: ${userName}, 
      trackingId: ${trackingId},　
      remoteAddress: ${req.connection.remoteAddress}　
      oneTimeToken: ${oneTimeToken}
    `);
  }
  // DBから情報を取得
  Post.findAll().then((posts) => {
    posts.forEach((post) => {
      post.formattedCreatedAt = moment(post.createdAt).tz('Asia/Tokyo').format('YYYY年MM月DD日 HH時mm分ss秒');
    });
    res.render('index', {
      title: 'Express',
      user: req.user,
      posts: posts,
      oneTimeToken: oneTimeToken
    });
  });
});

// POST processing
router.post('/', (req, res) => {
  if (req.user) {
    const requestedOneTimeToken = req.body.oneTimeToken;
    const requestedUserName = req.user.username;
    const cookies = new Cookies(req, res);
    if (oneTimeTokenMap.get(requestedUserName) === requestedOneTimeToken) {
      // postﾘｸｴｽﾄしたﾕｰｻﾞとﾄｰｸﾝの組み合わせを検証する
      Post.create({
        content: req.body.content,
        trackingCookie: cookies.get(trackingIdKey),
        postedBy: requestedUserName
      }).then(() => {
        console.info(`
          投稿されました。
          content: ${req.body.content}, 
          trackingCookie: ${cookies.get(trackingIdKey)}, 
          postedBy: ${requestedUserName} 
          requestedOneTimeToken: ${requestedOneTimeToken}
        `);
        oneTimeTokenMap.delete(requestedUserName);
        res.redirect('/');
      });
    } else {
      // oneTimeTokenが一致しない
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('未対応のリクエストです');
    }
  } else {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('loginしてください');
  }
});

// ----- cookiesﾓｼﾞｭｰﾙを使わずにtracking_cookieを利用する ----- //
// cookieにtracking_idをｾｯﾄして、console.log用にidをﾘﾀｰﾝする
function addTrackingCookie_test(req, res, userName) {
  // tracking_idというｷｰがcookieに存在するかﾁｪｯｸ
  const requestedTrackingId = req.cookies.tracking_id;
  if (isValidTrackingId(requestedTrackingId, userName)) {
    // trackingIdが存在する && IDとﾊｯｼｭ値が合致する場合
    return requestedTrackingId;
  }else{
    // trackingIdが存在しない or 合致しない場合
    var originalTrackingId = parseInt(crypto.randomBytes(8).toString('hex'), 16);
    var trackingId = `${originalTrackingId}_${createValidHash(originalTrackingId, userName)}`;
    // var tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    // cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
    // responseにcookieをｾｯﾄする
    res.cookie(trackingIdKey, trackingId, {
      // 有効期限1日
      maxAge: 24*60*60*1000
    });
    return trackingId;
  }
}

/**
// Cookieにtracking_idがない場合作成しセットする関数です
function addTrackingCookie(cookies, userName) {
  const requestedTrackingId = cookies.get(trackingIdKey);
  // trackingIdが存在する && IDとﾊｯｼｭ値が合致する場合
  if (isValidTrackingId(requestedTrackingId, userName)) {
    return requestedTrackingId;
    // trackingIdが存在しない or 合致しない場合
  } else {
    var originalTrackingId = parseInt(crypto.randomBytes(8).toString('hex'), 16);
    var trackingId = `${originalTrackingId}_${createValidHash(originalTrackingId, userName)}`;
    var tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
    return trackingId;
  }
}
 */

// tracking_idの有無とﾊｯｼｭ値の成否を判定する
function isValidTrackingId(trackingId, userName) {
  if (!trackingId) {
    return false;
  }
  const splitted = trackingId.split('_'); // ｵﾘｼﾞﾅﾙIDとﾊｯｼｭ値を分離
  const originalId = splitted[0]; // ｵﾘｼﾞﾅﾙID
  const requestedHash = splitted[1]; // ﾊｯｼｭ値
  return createValidHash(originalId, userName) === requestedHash;
}

// IDとreq.userからﾊｯｼｭを作成しﾘﾀｰﾝする
function createValidHash(originalId, userName) {
  const sha1sum = crypto.createHash('sha1');
  // sha1sum.update(String(originalId) + userName + secretKey);
  sha1sum.update(String(originalId) + userName);
  return sha1sum.digest('hex');
}

module.exports = router;
