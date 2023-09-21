const { createClient } = require('redis');

let redisClient;

(async () => {
  redisClient = createClient();

  redisClient.on('error', err => console.log('Redis Client Error', err));

  await redisClient.connect();
  console.log('redis connected successfully');
})();

module.exports = redisClient;
