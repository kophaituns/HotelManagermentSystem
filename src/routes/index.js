const auth = require('./auth');
const site = require('./site');
const login = require('./login');
const admin = require('./admin');
function route(app) {
    app.use('/auth',auth);
    app.use('/login',login);
    app.use('/admin',admin);
    app.use('/',site);
}

module.exports = route;