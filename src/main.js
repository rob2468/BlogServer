'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const domain = require('domain');
const mysql = require('mysql');
const moment = require('moment');
const express = require('express');
const path = require('path');
const { addComment, queryComments } = require('./comment');
const { addBehaviorRecord, queryStatisticData } = require('./statistic');
const { sendMail } = require('./util');

global.appRoot = path.resolve(__dirname + '/..'); // 解析出根目录

// 读取配置文件
const conf = fs.readFileSync(appRoot + '/config/conf.json', 'utf-8');
const confJSON = JSON.parse(conf);
const {
  mail: mailConf,
} = confJSON;

// Certificate
const privateKey = fs.readFileSync(confJSON.certificate.privateKeyFilePath, 'utf8');
const certificate = fs.readFileSync(confJSON.certificate.certificateFilePath, 'utf8');
const ca = fs.readFileSync(confJSON.certificate.caFilePath, 'utf8');
const credentials = {
  key: privateKey,
  cert: certificate,
  ca,
};

// 创建数据库连接池
const pool  = mysql.createPool(confJSON.mysql);

const app = express();

app.use(async (request, response) => {
  // 解析请求，包括文件名
  const parsedURL = url.parse(request.url, true);
  const pathname = parsedURL.pathname;
  const query = parsedURL.query;
  const method = request.method;

  // 输出请求的文件名
  console.log(`Request received.\n    Path: ${pathname}\n    Query: ${JSON.stringify(query)}\n    Method: ${method}`);

  // 服务器需要设置的响应头
  const responseHeaders = {'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'};

  if (method === 'OPTIONS') {
    response.writeHead(200, responseHeaders);
    response.end();
  } else if (method === 'GET') {
    if (pathname === '/index.html') {
      responseHeaders['Content-Type'] = 'text/html';
      response.writeHead(200, responseHeaders);
      const indexContent = fs.readFileSync('index.html', 'utf-8');
      response.write(indexContent);
      response.end();
    } else if (pathname.indexOf('/tmp') === 0) {
      // 不允许请求 tmp 内文件
      response.writeHead(404, responseHeaders);
      response.end();
    } else if (pathname.indexOf('/api/comments') === 0) {
      // 查询评论
      const pageID = query['page_id'];
      const comments = await queryComments(pool, pageID);

      response.writeHead(200, responseHeaders);
      response.write(JSON.stringify(comments));
      response.end();
    } else if (pathname.indexOf('/api/stat') === 0) {
      // 查询行为数据
      // display_time：请求日期，如，2019-06-12
      // prev_days：前若干天，如，10
      const { display_time, prev_days } = query;

      let success = true;
      let result = {};
      let resultView = '';

      if (!display_time) {
        success = false;
        resultView = '日期不对';
      } else if (prev_days > 20) {
        success = false;
        resultView = '请求的天数太长，目前一次请求最多允许20天';
      } else {
        // 检索数据库
        result = await queryStatisticData(pool, display_time, prev_days);
      }

      // 构造响应数据
      const responseData = {
        success,
        result,
        resultView,
      };

      // 请求响应
      response.writeHead(200, responseHeaders);
      response.write(JSON.stringify(responseData));
      response.end();
    }
  } else if (method === 'POST') {
    // domain
    const localDomain = domain.create();
    localDomain.on('error', function(err) {
      // 异常捕获
      response.writeHead(200, responseHeaders);
      response.write(JSON.stringify({
        success: false,
      }));
      response.end();
    });
    localDomain.run(function () {
      // run
      let body = '';
      request.on('data', chunk => {
        body += chunk.toString();
      });
      request.on('end', () => {
        if (body.length === 0) {
          throw new Error('body 读取失败');
        }
        let result = {};
        if (pathname.indexOf('/api/submitcomment') === 0) {
          // 客户端提交评论
          const comment = JSON.parse(body);
          addComment(pool, comment);

          // 邮件通知
          sendMail(mailConf.email, body);

          result = comment;
        } else if (pathname.indexOf('/api/addstat') === 0) {
          // 行为统计
          const record = JSON.parse(body);
          addBehaviorRecord(pool, record);
        }
        // 响应客户端请求
        response.writeHead(200, responseHeaders);
        response.write(JSON.stringify({
          success: true,
          result,
        }));
        response.end();
      }); // request on end
    }); // domain run
  }
});

// const httpServer = http.createServer(app);
// httpServer.listen(80, () => {
//   console.log('HTTP Server running on port 80');
// });

const httpsServer = https.createServer(credentials, app);
httpsServer.listen(443, () => {
  console.log('HTTPS Server running on port 443');
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason)
  // Recommended: send the information to sentry.io
  // or whatever crash reporting service you use
});
