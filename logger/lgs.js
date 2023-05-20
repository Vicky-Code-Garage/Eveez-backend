function logger() {
  let now = new Date();
  let datetime = now.toUTCString();
  return datetime;
}

function logroute(req) {
  console.log(
    `Request : ${req.route.path}, IP Address : ${req.ip}, (Time : ${logger()})`
  );
}

module.exports = {
  logger,
  logroute,
};
