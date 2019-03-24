const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const domain = require('domain');
const exec = require('child_process').exec;
const mysql = require('mysql');
const moment = require('moment');

/**
 * 请求监听
 * @param {object} request
 * @param {object} response
 */
async function requestListener(request, response) {
  // 解析请求，包括文件名
  const parsedURL = url.parse(request.url, true);
  const pathname = parsedURL.pathname;
  const query = parsedURL.query;

  // 输出请求的文件名
  console.log(`Request received.\n    Path: ${pathname}\n    Query: ${JSON.stringify(query)}\n    Method: ${request.method}`);

  // 服务器需要设置的响应头
  const responseHeaders = {'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'};

  if (request.method === 'OPTIONS') {
    response.writeHead(200, responseHeaders);
    response.end();
  } if (pathname === '/index.html') {
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
    var localDomain = domain.create();
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
      var body = '';
      request.on('data', function (data) {
        body += data;
      });
      request.on('end', function () {
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
}

/**
 * 增加评论
 */
function addComment(comment) {
  // 连接数据库
  const dbConnection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '123456',
    database : 'Blog'
  });
  dbConnection.connect();

  // 解析出数据库字段
  const pageID = comment.pageID;
  const email = comment.email;
  let time = comment.time;
  time = moment(time).format('YYYY-MM-DD HH:mm:ss');
  const displayName = comment.displayName;
  const content = comment.content;

  // 构造 sql 语句
  const sqlStr = `insert into comments ( page_id, email, time, display_name, content ) VALUES ( '${pageID}', '${email}', '${time}', '${displayName}', '${content}' );`;

  // 执行 sql
  dbConnection.query(sqlStr, function (error, results, fields) {
  });
  dbConnection.end();
}

/**
 * 查询评论
 */
async function queryComments(pageID) {
  return new Promise((resolve, reject) => {
    // 连接数据库
    const dbConnection = mysql.createConnection({
      host     : 'localhost',
      user     : 'root',
      password : '123456',
      database : 'Blog'
    });
    dbConnection.connect();

    // 构造 sql 语句
    const sqlStr = `select * from comments where page_id = '${pageID}' order by time desc;`;

    // 执行 sql
    dbConnection.query(sqlStr, (error, results, fields) => {
      const comments = [];
      results.forEach(element => {
        const comment = {};
        comment.pageID = element['page_id'];
        comment.email = element['email'];
        const time = element['time'];
        comment.time = (new Date(time)).getTime();;
        comment.displayName = element['display_name'];
        comment.content = element['content'];
        comments.push(comment);
      });
      resolve(comments);
    });
    dbConnection.end();
  });
}

// 创建服务器
const server = http.createServer(requestListener);
const portNum = 8888;
server.listen(portNum);

// 控制台会输出以下信息
console.log('Server running at Port ' + portNum);

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason)
  // Recommended: send the information to sentry.io
  // or whatever crash reporting service you use
});
