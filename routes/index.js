var express = require('express');
var router = express.Router();
// DBを設定したﾌｧｲﾙ
const Post = require('../models/post');
// Tracking_cookie操作
const Cookies = require('cookies');
const trackingIdKey = 'tracking_id';
// ハッシュ関数を利用するためのモジュール
const crypto = require('crypto');
// Key(ﾕｰｻﾞ名)：Value(ﾄｰｸﾝ)
const oneTimeTokenMap = new Map();

/* GET home page. */
router.get('/', function (req, res, next) {
  // request userを取得
  // userName = req.user.username;
  // ﾜﾝﾀｲﾑﾄｰｸﾝ作成
  // var oneTimeToken = crypto.randomBytes(8).toString('hex');
  // oneTimeTokenMap.set(userName, oneTimeToken);
  // tracking_idを作成
  const cookies = new Cookies(req, res);
  addTrackingCookie(cookies);
  // trackingId = addTrackingCookie(cookies, userName);
  console.info(
      `閲覧されました: user: ${req.user}, ` +
      `trackingId: ${cookies.get(trackingIdKey) },` +
      `remoteAddress: ${req.connection.remoteAddress} `
  );
  /**
  console.info(
    `
    remoteAddress: ${req.connection.remoteAddress}, 
    oneTimeToken: ${oneTimeToken}
    `
  );
   */
  // DBから情報を取得
  Post.findAll().then((posts) => {
    res.render('index', {
      title: 'Express', 
      user: req.user,
      posts: posts,
      // oneTimeToken: oneTimeToken
    });
  });
});

// ----- いろいろ変更中 -----
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
 
 /**
 * req Cookieにtracking_idがない場合作成する
 * @param {Cookies} cookies 
 * @param {String} userName
 * @return {String} trackingId
 */
function addTrackingCookie(cookies, userName) {
  const requestedTrackingId = cookies.get(trackingIdKey);
  // trackingIdが存在し&&IDとﾊｯｼｭ値が合致する場合
  if (isValidTrackingId(requestedTrackingId, userName)) {
    return requestedTrackingId;
    // trackingIdが存在しない、あるいは合致しない場合
  } else {
    var originalTrackingId = parseInt(crypto.randomBytes(8).toString('hex'), 16);
    var trackingId = `${originalTrackingId}_${createValidHash(originalTrackingId)}`;
    var tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
    return trackingId;
  }
}

// -------------------------------- //
function addTrackingCookie(cookies) {
  if (!cookies.get(trackingIdKey)) {
    const trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
  }
}
// -------------------------------- //

// -------------------------------- //
/**
 * tracking_idの有無およびﾊｯｼｭ値の成否を判定する
 * @param {String} trackingId
 * @param {String} req.user
 * @return {Boolean} false: trackingIdがない
 * @return {Boolean} false: ﾊｯｼｭ[ID + req.user]!=ﾊｯｼｭ値のとき
 * @return {Boolean} true: ﾊｯｼｭ[ID + req.user]==ﾊｯｼｭ値のとき
 */
function isValidTrackingId(trackingId, userName) {
  if (!trackingId) {
    return false;
  }
  // ｵﾘｼﾞﾅﾙIDとﾊｯｼｭ値を分離
  const splitted = trackingId.split('_');
  // ｵﾘｼﾞﾅﾙID
  const originalId = splitted[0];
  // ﾊｯｼｭ値
  const requestedHach = splitted[1];
  return createValidHash(originalId, userName) === requestedHach;
}

/**
 * IDとreq.userからﾊｯｼｭを作成しﾘﾀｰﾝする
 * @param {String} originalId
 * @param {String} userName: req.user
 * @return {String} ﾊｯｼｭ[ID + userName]
 */
function createValidHash(originalId, userName) {
  const sha1sum = crypto.createHash('sha1');
  sha1sum.update(String(originalId) + userName + secretKey);
  return sha1sum.digest('hex');
}
// -------------------------------- //

module.exports = router;
