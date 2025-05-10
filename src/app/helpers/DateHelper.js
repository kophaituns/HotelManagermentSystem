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

    toString: function (value) {
      return value.toString();
    },
    log: (context) => {
      console.log('Context:', context);
    },
    add: function (value, increment = 1) {
      return Number(value) + Number(increment);
  },
  json : function (context) {
    return JSON.stringify(context);

  },
  formatNumber(value) {
    console.log('formatNumber input:', value, typeof value);
    const cleanedValue = String(value).replace(/[^0-9.-]/g, ''); // Loại bỏ ký tự không phải số
    const num = Number(cleanedValue);
    return isNaN(num) ? '0 ₫' : num.toLocaleString('vi-VN', {
      style: 'currency',
      currency: 'VND',
    });
  },

  formatNumberWithoutCurrency(value) {
    const cleanedValue = String(value).replace(/[^0-9.-]/g, ''); // Loại bỏ ký tự không phải số
    const num = Number(cleanedValue);
    return isNaN(num) ? '0' : num.toLocaleString('vi-VN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  },

  getByIndex(array, index) {
    if (!Array.isArray(array) || index == null) return '';
    return array[index];
  }

  };
  