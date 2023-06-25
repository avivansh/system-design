const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());

const MAPPING = {};

const randomNumberGenerator = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const constructMapping = () => {
  for (let i = 0; i < 10; i++) {
    MAPPING[i] = i;
  }

  for (let i = 0; i < 26; i++) {
    MAPPING[i + 10] = String.fromCharCode(97 + i);
  }

  for (let i = 0; i < 26; i++) {
    MAPPING[i + 36] = String.fromCharCode(65 + i);
  }
};

const printMapping = () => {
  console.log("MAPPING", MAPPING);
};

const convertIdToBase62 = (id) => {
  let base62 = "";
  while (id > 0) {
    base62 += MAPPING[id % 62];
    id = Math.floor(id / 62);
  }

  console.log("base62", base62);

  // reverse the base62 string
  base62 = base62.split("").reverse().join("");
  return base62;
};

app.get("/", (req, res) => {
  // from request body extract the key name "id"
  const { id } = req.body;
  console.log("id", id);

  // generate a random number between 1000000 and 9999999999
  const randomId = randomNumberGenerator(100000, 9999999999);

  console.log("randomId", randomId);
  console.log("base62 of randomId", convertIdToBase62(randomId));

  res.send(`Base 62 of ${id} is ${convertIdToBase62(id)}`);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  constructMapping();

  printMapping();
});
