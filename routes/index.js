var express = require('express');
var router = express.Router();
const Post = require('../models/post');　// DB設定したﾌｧｲﾙ
const crypto = require('crypto');　// ﾊｯｼｭ関数を利用するためのﾓｼﾞｭｰﾙ
const oneTimeTokenMap = new Map();　// Key(ﾕｰｻﾞ名)：Value(ﾄｰｸﾝ)とした連想配列
const moment = require('moment-timezone');　// Dateを見やすく編集するﾓｼﾞｭｰﾙ
const trackingIdKey = 'tracking_id';　// cookieのｷｰ
const secretKey = 'cd609e534e6e396261b09336f4a36fd673c5e819f527c7745a8eedfb2bfef366b13e93559cf6173e21721223039f076ee3e76cba5666a8d463c97d123dd75dadb0c40ee8b50af92d804f5c626fe232657f2262bc6a4e0778d44b8e4ea12a42f46ec52895e5d9bc21b2386278a934503b67b3f5becfc4ee562e0966c0213cbc34f7e62aa9ed575f1f2faf43e86e3381f086bf3d19d7840e3f4ab8aafa19436a80f161d841b51fcc74f75d1cf4cb97cc0ff0fb655c990aceeab4f632634342cec3d7b58702a3f94fbff0b18b1fed424e15c9db09f45e24f2cd9b7398362456d3b9dc5bdf107be528e0a93a0d6d5d8cd250fe047f6326631d61479e1155018f984d';

/* GET home page. */
router.get('/', function (req, res, next) {
  if (req.user) {
    const userName = req.user.username;
    const trackingId = addTrackingCookie(req, res, userName);
    // ﾜﾝﾀｲﾑﾄｰｸﾝ作成
    var oneTimeToken = crypto.randomBytes(8).toString('hex');
    oneTimeTokenMap.set(userName, oneTimeToken);
    console.info(`
      閲覧されました: user: ${userName}, 
      trackingId: ${trackingId}, 
      remoteAddress: ${req.connection.remoteAddress}, 
      oneTimeToken: ${oneTimeToken}
    `);
  }
  Post.findAll().then((posts) => { // DBから情報を取得
    posts.forEach((post) => {
      post.formattedCreatedAt = moment(post.createdAt).tz('Asia/Tokyo').format('YYYY年MM月DD日 HH時mm分ss秒');
    });
    res.render('index', {
      title: '秘密の匿名掲示板',
      user: req.user,
      posts: posts,
      oneTimeToken: oneTimeToken
    });
  });
});

// POST processing
router.post('/', (req, res) => {
  const requestedOneTimeToken = req.body.oneTimeToken;
  const requestedUserName = req.user.username;
  if (oneTimeTokenMap.get(requestedUserName) === requestedOneTimeToken) {
    // req.userとoneTimeTokenの組み合わせが一致する場合
    Post.create({
      content: req.body.content,
      trackingCookie: req.cookies.tracking_id,
      postedBy: requestedUserName
    }).then(() => {
      console.info(`
        投稿されました。
        content: ${req.body.content}, 
        trackingCookie: ${req.cookies.tracking_id}, 
        postedBy: ${requestedUserName} 
        requestedOneTimeToken: ${requestedOneTimeToken}
      `);
      oneTimeTokenMap.delete(requestedUserName);
      res.redirect('/');
    });
  } else { // 一致しない場合
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('未対応のリクエストです');
  }
});

// post delete req このﾊﾝﾄﾞﾗで取得できるかﾃｽﾄ
router.post('/?delete=1', (req, res) => {
  const id = req.body.id;
  console.log(`☆==--${id}`);
  res.end();
  /**
  Post.findByPk(id).then((post)=>{
    console.log(`${post.id}:${post.content}`);
    post.destroy().then(()=>{
      res.redirect('/');
    })
  });
   */
});

function deletePost(id, done, err) {
  Post.findByPk(id).then((post) => {
    console.log(`${post.id}:${post.content}`);
    post.destroy().then(()=>{
      
    });
  });
}

// cookieにtracking_idをｾｯﾄして、console.log用にidをﾘﾀｰﾝする
function addTrackingCookie(req, res, userName) {
  const requestedTrackingId = req.cookies.tracking_id;
  if (isValidTrackingId(requestedTrackingId, userName)) {
    // trackingIdが存在する && IDとﾊｯｼｭ値が合致する場合
    return requestedTrackingId;
  } else { // trackingIdが存在しない or 合致しない場合
    var originalTrackingId = parseInt(crypto.randomBytes(8).toString('hex'), 16);
    var trackingId = `${originalTrackingId}_${createValidHash(originalTrackingId, userName)}`;
    res.cookie(trackingIdKey, trackingId, {
      maxAge: 24 * 60 * 60 * 1000 // 有効期限1日
    });
    return trackingId;
  }
}

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
  sha1sum.update(String(originalId) + userName + secretKey);
  return sha1sum.digest('hex');
}

module.exports = router;
