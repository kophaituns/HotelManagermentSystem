const auth = require('./auth');
const site = require('./site');
const login = require('./login');
const admin = require('./admin');
const search = require('./search');
const book = require('./book');
const staff = require('./staff');
const setUser = require('../app/midleware/setUser');
const router = require('express').Router();
const ErrorController = require('../app/controllers/ErrorrController');

function route(app) {

    app.use(setUser);
    app.use('/auth',auth);
    app.use('/search',search);
    app.use('/login',login);
    app.use('/admin',admin);
    app.use('/book',book);
    app.use('/staff', staff);
    app.use('/',site);

    app.use((req, res, next) => {
        ErrorController.handleError(req, res);
      });
}

module.exports = route;