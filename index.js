const async = require('async');
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const TARGET_SELECTOR = 'html body div.bd.warp div.box div.main.fix div.content.left div.wifi-info table tbody tr.pwd td.info strong font';
// example url
// https://www.wifi4.cn/wifi/d-xiao/F4285327D934/

function inspect(s) {
  console.trace(JSON.stringify(s));  
}

function ask_question(question) {
  return (cb) => {
    rl.question(question, (answer) => {
      readline.moveCursor(process.stdout, 0, -1);
      readline.clearLine(process.stdout, 0);
      console.log(`${question}[${answer}]`);
      // inspect(answer);
      cb(null, answer);
    });
  };
}

function form_url(essid, bssid) {
  return `https://www.wifi4.cn/wifi/${essid}/${bssid}/`;
}

function action_read_from_user(cb) {
  async.series([
    ask_question('ESSID (str):'),
    ask_question('BSSID (mac):'),
  ], (err, results) => {
    let [essid, bssid] = results;
    bssid = bssid.toUpperCase().split('').filter((c) => /[0-9A-Z]/.test(c)).join('');
    if (bssid.length != 12) {
      return cb(new Error('Invalid BSSID'));
    }
    let url = form_url(essid, bssid);
    return cb(null, url);
  });
}

const request = require('request');
function action_get_from_network(url, cb) {
  console.log('Fetching...');
  request.get(url, (err, response, body) => {
    if (err)
      return cb(err);
    if (response && response.statusCode != 200)
      return cb(new Error(`wifi4.cn status error: ${response && response.statusCode}`));
    cb(null, body);
  });
}

const cheerio = require('cheerio')
function action_find_result(response_body, cb) {
  let doc = cheerio.load(response_body)
  let result = doc(TARGET_SELECTOR).text();
  if (result === "")
    cb(new Error("Exploit not found"));
  else
    cb(null, result);
}

module.exports = {
  query(essid, bssid, cb) {
   async.waterfall([
      (cb) => cb(null, form_url(essid, bssid)),
      action_get_from_network,
      action_find_result
    ], (err, result) => {
      if (err)
        return cb(err);
      else
        cb(null, result);
    }); 
  }
}

if (require.main === module) {
  function manual_mode() {
    async.waterfall([
      action_read_from_user,
      action_get_from_network,
      action_find_result
    ], (err, result) => {
      if (err)
        console.log(`Error: [${err.message}]`);
      else
        console.log(`Success: [${result}]`);
      console.log();
      setImmediate(manual_mode);
    });
  }
  manual_mode();
}
