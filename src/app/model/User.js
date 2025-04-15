const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const slug = require('mongoose-slug-generator');
const User = new Schema(
    {

        username: {
            type: String,
            required: true,
            minlength: 6,
            maxlength: 20,
            unique: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
            maxlength: 60,
        },
        email: {
            type: String,
            required: true,
            minlength: 6,
            maxlength: 20,
            unique: true,
        },
        admin: {
            type: Boolean,
            default: false,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

mongoose.plugin(slug);
module.exports = mongoose.model('User', User);
