'use strict';

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
// 外部認証のためのモジュール OAuth 
var passport = require('passport');
var session = require('express-session');
var GitHubStrategy = require('passport-github2').Strategy;

var GITHUB_GLIENT_ID = '26a121690a9f80f9ab24';
var GITHUB_CLIENT_SECRET = '7e4ee954e84b95ce1d664707ad14a26e1aafa158';

// Passport session setup.
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

//Use GitHubStrategy within Passport.
passport.use(new GitHubStrategy({
  clientID: GITHUB_GLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: "http://localhost:8000/auth/github/callback"
},
  (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => {
      return done(null, profile);
    });
  }
));

// Router import
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// OAuth setup
app.use(session({ secret: '804986edd5013c4a', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// CSRF 対策
app.use((req, res, next) => {
  if (req.user || req.url.indexOf('/login') === 0 || req.url.indexOf('/auth') === 0) {
    next();
  } else {
    req.url = '/';
    next();
  }
});

// Router setup
app.use('/', indexRouter);
app.use('/users', usersRouter);

// OAuth Route handler
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
  function (req, res) {
  });
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/');
  });
app.get('/login', function (req, res) {
  res.render('login');
});
app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
