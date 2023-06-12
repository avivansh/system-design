const moment = require('moment');

const redis = require('redis');

const redisClient = redis.createClient();

redisClient.on('error', err => console.log('Redis Client Error', err));

const WINDOW_SIZE_IN_HOURS = 24;
const MAX_WINDOW_REQUEST_COUNT = 10;
const WINDOW_LOG_INTERVAL_IN_SECONDS = 120;

const customRedisRateLimiter = async (req, res, next) => {

  await redisClient.connect();

  try {

    // check that redis client exists
    if (!redisClient) {
      throw new Error('Redis client does not exist!');
      process.exit(1);
    }

    // fetch records of current user using IP address, returns null when no record is found
    const record = await redisClient.get(req.ip);
    const currentRequestTime = moment().clone();
    console.log('record is:- ', record);

    console.log('currentRequestTime', currentRequestTime.unix());
    console.log('currentRequestTime', currentRequestTime.unix());
    console.log('currentRequestTime', currentRequestTime.unix());

    //  if no record is found , create a new record for user and store to redis
    if (record == null) {
      console.log('record is null');
      let newRecord = [];
      let requestLog = {
        requestTimeStamp: currentRequestTime.unix(),
        requestCount: 1,
      };
      console.log('requestLog', requestLog);
      newRecord.push(requestLog);
      await redisClient.set(req.ip, JSON.stringify(newRecord));
      await redisClient.disconnect();
      next();
    }

    else{
      // if record is found, parse it's value and calculate number of requests users has made within the last window
      let data = JSON.parse(record);
      console.log('data', data);
      let windowStartTimestamp = moment().subtract(WINDOW_SIZE_IN_HOURS, 'hours').unix();
      let requestsWithinWindow = data.filter((entry) => {
        return entry.requestTimeStamp > windowStartTimestamp;
      });
      console.log('requestsWithinWindow', requestsWithinWindow);
      let totalWindowRequestsCount = requestsWithinWindow.reduce((accumulator, entry) => {
        return accumulator + entry.requestCount;
      }, 0);
      // if number of requests made is greater than or equal to the desired maximum, return error
      if (totalWindowRequestsCount >= MAX_WINDOW_REQUEST_COUNT) {
        await redisClient.disconnect();
        res.status(429).json({
          error: `You have exceeded the ${MAX_WINDOW_REQUEST_COUNT} requests in ${WINDOW_SIZE_IN_HOURS} hrs limit!`
        });

      } else {
        // if number of requests made is less than allowed maximum, log new entry
        let lastRequestLog = data[data.length - 1];
        console.log('Current Request Time', currentRequestTime.unix());
        let potentialCurrentWindowIntervalStartTimeStamp = currentRequestTime.subtract(WINDOW_LOG_INTERVAL_IN_SECONDS, 'seconds').unix();
        //  if interval has not passed since last request log, increment counter
        console.log('lastRequestLog', lastRequestLog);
        console.log('potentialCurrentWindowIntervalStartTimeStamp', potentialCurrentWindowIntervalStartTimeStamp);
        console.log(lastRequestLog.requestTimeStamp > potentialCurrentWindowIntervalStartTimeStamp);
        if (lastRequestLog.requestTimeStamp > potentialCurrentWindowIntervalStartTimeStamp) {
          lastRequestLog.requestCount++;
          data[data.length - 1] = lastRequestLog;
        } else {
          //  if interval has passed, log new entry for current user and timestamp
          data.push({
            requestTimeStamp: currentRequestTime.unix(),
            requestCount: 1,
          });
        }
        await redisClient.set(req.ip, JSON.stringify(data));
        await redisClient.disconnect();
        next();
      }
    }

  } catch (error) {
    await redisClient.disconnect();
    next(error);
  }
};

// Usage example with Express.js
const express = require('express');
const app = express();

// Apply the rate limiter middleware to specific routes
app.get('/api/v1/currentDay', customRedisRateLimiter, (req, res) => {
  res.send('Success! Your request was processed.');
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



// reference: https://blog.logrocket.com/rate-limiting-node-js/
