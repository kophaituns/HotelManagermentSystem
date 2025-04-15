const mongoose = require('mongoose');

async function connect() {
    try {
        await mongoose.connect('mongodb://localhost:27017/HotelManagermentSystem', {
        });
        console.log(' Connect successfully!!!');
    } catch (error) {
        console.error(' Connect failure!!!', error);
    }
}

module.exports = { connect };
