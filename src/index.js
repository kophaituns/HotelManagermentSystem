const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const { engine } = require('express-handlebars');
const path = require('path');
const db = require('./config/db/index.js');
const route = require('./routes');
const morgan = require('morgan');
const AuthMiddleWare = require('./app/midleware/AuthMiddleWare.js');
const { helpers } = require('handlebars');
dotenv.config();

// Connect to DB
db.connect();

const app = express();
const port = 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.use(
    express.urlencoded({
        extended: true,
    }),
);
app.use(methodOverride('_method'));
// HTTP logger
app.use(morgan('combined'));

// Template engine
app.engine(
    'hbs',
    engine({
        extname: '.hbs',
        helpers: {
            eq: function (a, b) {
                return a === b;
            },
            sum: (a, b) => a + b,
        },
    }),
);
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources', 'views'));
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

// Routes init
route(app);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
