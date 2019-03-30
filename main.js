const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const domain = require('domain');
const mysql = require('mysql');
const moment = require('moment');
const express = require('express');

// 读取配置文件
const conf = fs.readFileSync('conf.json', 'utf-8');
const confJSON = JSON.parse(conf);

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
  } else if (pathname === '/index.html') {
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
    const comments = await queryComments(pageID);

    response.writeHead(200, responseHeaders);
    response.write(JSON.stringify(comments));
    response.end();
  } else if (pathname.indexOf('/api/submitcomment') === 0) {
    // 客户端提交评论
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
          throw new Error('评论读取失败');
        }
        // 前端发来的数据
        const postData = JSON.parse(body);
        const pageID = postData.pageID;
        const email = postData.email;
        const time = postData.time;
        const displayName = postData.displayName;
        const content = postData.content;
        const comment = {
          pageID,
          email,
          time,
          displayName,
          content,
        };
        addComment(comment);

        // 响应客户端请求
        response.writeHead(200, responseHeaders);
        response.write(JSON.stringify({
          success: true,
          result: comment,
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

/**
 * 增加评论
 */
function addComment(comment) {
  // 连接数据库

  // 解析出数据库字段
  const pageID = comment.pageID;
  const email = comment.email;
  let time = comment.time;
  time = moment(time).format('YYYY-MM-DD HH:mm:ss');
  const displayName = comment.displayName;
  const content = comment.content;

  // 构造 sql 语句
  const sqlStr = `insert into comments ( pageID, email, time, displayName, content ) VALUES ( '${pageID}', '${email}', '${time}', '${displayName}', '${content}' );`;

  // 执行 sql
  pool.query(sqlStr, function (error, results, fields) {
  });
}

/**
 * 查询评论
 */
function queryComments(pageID) {
  return new Promise((resolve, reject) => {
    // 构造 sql 语句
    const sqlStr = `select * from comments where pageID = '${pageID}' order by time desc;`;

    // 执行 sql
    pool.query(sqlStr, (error, results, fields) => {
      const comments = [];
      results.forEach(element => {
        const comment = {};
        comment.pageID = element['pageID'];
        comment.email = element['email'];
        const time = element['time'];
        comment.time = (new Date(time)).getTime();;
        comment.displayName = element['displayName'];
        comment.content = element['content'];
        comments.push(comment);
      });
      resolve(comments);
    });
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason)
  // Recommended: send the information to sentry.io
  // or whatever crash reporting service you use
});
