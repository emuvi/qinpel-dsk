const express = require("express");
const server = express();
const cors = require('cors');
const port = 36549;

function start() {
  server.use(cors());

  server.get("/ping", (req, res) => {
    res.send("pong");
  });

  server.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

module.exports = {
  start
}
