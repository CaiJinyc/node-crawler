const request = require('superagent');
const cheerio = require('cheerio');
const mysql = require('mysql');
const insertMap = require('./consts').insertMap;
const userAgents = require('./userAgent');

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'cc1212',
  database: 'jljulibrary' // 数据库
});

