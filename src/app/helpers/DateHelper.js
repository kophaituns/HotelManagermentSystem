// helpers/handlebars.js
module.exports = {
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toISOString().split('T')[0]; // yyyy-mm-dd
    },
    ifEquals(a, b, options) {
      return a === b ? options.fn(this) : options.inverse(this);
    },
    increment: function (value) {
      return parseInt(value) + 1;
    },
  };
  