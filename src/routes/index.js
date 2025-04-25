const auth = require('./auth');
const site = require('./site');
const login = require('./login');
const admin = require('./admin');
const search = require('./search');
function route(app) {

    app.use('/auth',auth);
    app.use('/search',search);
    app.use('/login',login);
    app.use('/admin',admin);

    app.use('/',site);
}

module.exports = route;