const auth = require('./auth');
function route(app) {
    app.use('/auth',auth);
}

module.exports = route;