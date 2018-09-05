const request = require('superagent');
const cheerio = require('cheerio');
const mysql = require('mysql');
const insertMap = require('./consts').insertMap;
const userAgents = require('./userAgent');

require('superagent-proxy')(request);
const proxy = 'http://117.28.97.182:808';
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'cc1212',
  database: 'jljulibrary' // 数据库
});

let i = 201648;

setInterval(() => {
  isHave(i++, 0);
}, 300);

function isHave(num, tick) {
  db.query(`SELECT num FROM hellomysql WHERE num = ${num}`, (err, res) => {
    console.log('res.length: ', res.length, ' num:', num);
    if (res.length !== 1) {
      getHtml(num);
    } else if (res.length === 1 && tick < 5) {
      console.log('-------------------------tick: ', tick);
      tick++;
      isHave(i++, tick);
    }
  })
}


function getHtml(num) {
  let userAgent = userAgents[parseInt(Math.random() * userAgents.length)];
  let str = num.toString();
  while (str.length < 6) {
    str = '0' + str;
  }
  request
    // .get(`http://58.155.179.60:8080/opac/item.php?marc_no=${'0000' + str}`)
    .get(
      `http://58.155.179.61:8081/search/bookDetail?xc=3&detailParam=%7B%22title%22%3A%22%22%2C%22marc_no%22%3A%22${'0000' + str}%22%7D`
    )
    .set({ 'User-Agent': userAgent })
    // .proxy(proxy)
    .then(res => {
      // insertSQL(res.text, num);
      insertSQLFromCX(res.text, num);
    })
    .catch(err => {
      console.log('error!!!');
      getHtml(num);
    });
}

function insertSQL(html, num) {
  const $ = cheerio.load(html);
  const info = [];
  const insertData = {};
  insertData.num = num;

  $('.booklist').each(function() {
    const v = filterData($(this).text()).split(':\n');
    if (v.length === 1) return;
    const result = {
      title: v[0],
      value: v[1]
    };
    info.push(result);
  });

  const bookStatus = [];
  const bookStatusData = [];
  $('td', '.whitetext').each(function() {
    bookStatus.push(
      $(this)
        .text()
        .replace(/\t+/g, '')
        .replace(/\n+/g, '')
        .replace(/\s+/g, '')
    );
  });

  const z = bookStatus.length / 6;
  for (let i = 0; i < z; i++) {
    bookStatusData[i] = {};
    bookStatusData[i].index = bookStatus.shift();
    bookStatusData[i].num = bookStatus.shift();
    bookStatusData[i].type = bookStatus.shift();
    bookStatusData[i].address = bookStatus.shift();
    bookStatus.shift();
    bookStatusData[i].status = bookStatus.shift();
  }

  info.forEach(item => {
    const { title, value } = item || {};
    if (title === '个人责任者') {
      if (insertData.publisher) {
        insertData.publisher.push(value);
        return;
      } else {
        insertData.publisher = [];
        insertData.publisher.push(value);
        return;
      }
    }
    if (insertMap[title]) {
      insertData[insertMap[title]] = value;
    } else {
      return;
    }
  });
  if (!insertData.series) return;
  insertData.series = insertData.series.replace(/\/.*/, '');
  if (insertData.publisher) {
    insertData.publisher.forEach((item, index) => {
      insertData.publisher[index] = filterPublisher(item);
    });
  }
  if (insertData.teampublisher) {
    insertData.teampublisher = filterPublisher(insertData.teampublisher);
  }
  insertData.publisher = JSON.stringify(insertData.publisher);
  insertData.status = JSON.stringify(bookStatusData);
  const dataName = Object.keys(insertData).join(', ');
  const dataArr = [];
  let dataNumbers = '';
  Object.keys(insertData).forEach(item => {
    dataArr.push(insertData[item]);
    dataNumbers += '?, ';
  });
  dataNumbers = dataNumbers.replace(/,\s$/, '');
  db.query(
    `INSERT INTO hellomysql (${dataName}) VALUES(${dataNumbers})`,
    dataArr
  );
  console.log('done', num);
}

function insertSQLFromCX(html, num) {
  const $ = cheerio.load(html);
  const info = [];
  const insertData = {};
  insertData.num = num;

  $('p', '.catalog').each(function() {
    const v = filterData($(this).text()).replace(/：/, '__|').split('__|');
    if (v.length === 1) return;
    const result = {
      title: v[0],
      value: v[1]
    };
    info.push(result);
  });

  const bookStatus = [];
  const bookStatusData = [];
  $('td', '.tableCon').each(function() {
    bookStatus.push(
      $(this)
        .text()
        .replace(/\s图书定位\s可借/, '')
        .replace(/\t+/g, '')
        .replace(/\n+/g, '')
        .replace(/\s+/g, '')
    );
  })

  const z = bookStatus.length / 7;
  for (let i = 0; i < z; i++) {
    bookStatusData[i] = {};
    bookStatusData[i].status = bookStatus.shift();
    bookStatusData[i].index = bookStatus.shift();
    bookStatusData[i].type = bookStatus.shift();
    bookStatusData[i].num = bookStatus.shift();
    bookStatus.shift();
    bookStatusData[i].address = bookStatus.shift();
    bookStatus.shift();
  }

  info.forEach(item => {
    const { title, value } = item || {};
    if (title === '个人责任者') {
      if (insertData.publisher) {
        insertData.publisher.push(value);
        return;
      } else {
        insertData.publisher = [];
        insertData.publisher.push(value);
        return;
      }
    }
    if (insertMap[title]) {
      insertData[insertMap[title]] = value;
    } else {
      return;
    }
  });
  if (!insertData.series) return;
  insertData.series = insertData.series.replace(/\/.*/, '');
  if (insertData.publisher) {
    insertData.publisher.forEach((item, index) => {
      insertData.publisher[index] = filterPublisher(item);
    });
  }
  if (insertData.teampublisher) {
    insertData.teampublisher = filterPublisher(insertData.teampublisher);
  }
  insertData.publisher = JSON.stringify(insertData.publisher);
  insertData.status = JSON.stringify(bookStatusData);
  const dataName = Object.keys(insertData).join(', ');
  const dataArr = [];
  let dataNumbers = '';
  Object.keys(insertData).forEach(item => {
    dataArr.push(insertData[item]);
    dataNumbers += '?, ';
  });
  dataNumbers = dataNumbers.replace(/,\s$/, '');
  db.query(
    `INSERT INTO hellomysql (${dataName}) VALUES(${dataNumbers})`,
    dataArr
  );
  console.log('done', num);
}

function filterData(e) {
  return e
    .replace(/^\s+/, '')
    .replace(/\s+$/, '')
    .replace(/\t+/, ''); //js去掉全换空格
}

function filterPublisher(e) {
  return e
    .replace(/(，)|(,)\s*\d+/g, '')
    .replace(/\d+/g, '')
    .replace(/-/g, '')
    .replace(/(\s编著)|(\s编)|(\s著)|(\s主编)|(\s本书主编)|(\s书)/, '');
}
