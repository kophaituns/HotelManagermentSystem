const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String }, // nên có
  note: { type: String }, // ghi chú
});
module.exports = mongoose.model('Customer', customerSchema);
