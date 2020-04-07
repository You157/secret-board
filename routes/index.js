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

/* GET home page. */
router.get('/', function (req, res, next) {  
  if(req.user){
    // login済みのときtracking_idをｾｯﾄする  
    const userName = req.user.username;
    const cookies = new Cookies(req, res);
    const trackingId = addTrackingCookie(cookies, userName);
    // ﾜﾝﾀｲﾑﾄｰｸﾝ作成
    var oneTimeToken = crypto.randomBytes(8).toString('hex');
    oneTimeTokenMap.set(userName, oneTimeToken);
    console.info(
      `閲覧されました: user: ${userName}, ` +
      `trackingId: ${trackingId},` +
      `remoteAddress: ${req.connection.remoteAddress} ` +
      `oneTimeToken: ${oneTimeToken}`
    );
  }
  // DBから情報を取得
  Post.findAll().then((posts) => {
    res.render('index', {
      title: 'Express', 
      user: req.user,
      posts: posts,
      oneTimeToken: oneTimeToken
    });
  });
});

// ----- いろいろ変更中 ----- //
router.post('/', (req, res) => {
  Post.create({
    content: req.body.content,
    trackingCookie: cookies.get(trackingIdKey),
    postedBy: userName
  }).then(() => {
    console.info(`
      投稿されました。
      content: ${req.body.content}, 
      trackingCookie: ${trackingId}, 
      postedBy: ${userName} 
      requestedOneTimeToken: ${requestedOneTimeToken}
    `);
    oneTimeTokenMap.delete(requestedUserName);
    res.redirect('/post');
  });
 });

/** ----- 変更前 -----
router.post('/', (req, res) => {
  var requestedOneTimeToken = req.body.oneTimeToken;
  var requestedUserName = req.user.username;
  if (oneTimeTokenMap.get(requestedUserName) === requestedOneTimeToken) {
    Post.create({
      content: req.body.content,
      trackingCookie: trackingId,
      postedBy: userName
    }).then(() => {
      console.info(`
        投稿されました。
        content: ${req.body.content}, 
        trackingCookie: ${trackingId}, 
        postedBy: ${userName} 
        requestedOneTimeToken: ${requestedOneTimeToken}
      `);
      oneTimeTokenMap.delete(requestedUserName);
      res.redirect('/post');
    });
  } else {
    res.end('Error');
  }
 });
 */
 
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

// tracking_idの有無とﾊｯｼｭ値の成否を判定する
function isValidTrackingId(trackingId, userName) {
  if (!trackingId) {
    return false;
  }
  // ｵﾘｼﾞﾅﾙIDとﾊｯｼｭ値を分離
  const splitted = trackingId.split('_');
  // ｵﾘｼﾞﾅﾙID
  const originalId = splitted[0];
  // ﾊｯｼｭ値
  const requestedHash = splitted[1];
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
