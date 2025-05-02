// src/jobs/restoreRemaining.js
const cron = require('node-cron');
const Room = require('../app/model/Room');

cron.schedule('0 0 * * *', async () => {
  console.log('Running restoreRemaining job');
  await Room.restoreRemainingAfterCheckout();
});