'use strict';

const Sequelize = require('sequelize');
// データベースの設定
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost/secret_board',
  {
    loggin: false,
    operatorsAliases: false
  }
);
// テーブルの設定
const Post = sequelize.define('Post', {
  // カラムの設定
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  content: {
    type: Sequelize.TEXT
  },
  postedBy: {
    type: Sequelize.STRING
  },
  trackingCookie: {
    type: Sequelize.STRING
  }
}, {
  // テーブル全体の設定
  freezeTableName: true,
  timestamps: true
});
// データベースと同期する
Post.sync();

module.exports = Post;