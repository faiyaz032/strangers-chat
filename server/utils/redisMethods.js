const redisClient = require('../config/redisConnection');

exports.setItem = async (key, value) => {
  redisClient.set(key, JSON.stringify(value));
};

exports.getItem = async key => {
  const data = await redisClient.get(key);
  return JSON.parse(data);
};
