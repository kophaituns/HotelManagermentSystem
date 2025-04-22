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
    eq: function (a, b) {
      return a === b;
    },
    statusClass: function (status) {
      switch (status) {
        case 'available': return 'available';
        case 'booked': return 'booked';
        case 'occupied': return 'occupied';
        case 'unavailable': return 'unavailable';
        default: return 'secondary';
      }
      
    },
    array: (...args) => args.slice(0, -1),
  };
  