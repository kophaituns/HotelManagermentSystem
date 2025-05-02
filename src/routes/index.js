const auth = require('./auth');
const site = require('./site');
const login = require('./login');
const admin = require('./admin');
const search = require('./search');
const book = require('./book');
const staff = require('./staff');
function route(app) {

    app.use('/auth',auth);
    app.use('/search',search);
    app.use('/login',login);
    app.use('/admin',admin);
    app.use('/book',book);
    app.use('/staff', staff);
    app.use('/',site);
}

module.exports = route;