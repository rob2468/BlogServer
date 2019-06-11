'use strict';

/**
 * 增加评论
 */
exports.addComment = function (pool, comment) {
  // 连接数据库

  // 解析出数据库字段
  const pageID = comment.pageID;
  const email = comment.email;
  const displayName = comment.displayName;
  const content = comment.content;
  const timestamp = comment.timestamp;
  const displayTime = comment.displayTime;

  // 构造 sql 语句
  const sqlStr = `insert into comments ( pageID, email, displayName, content, timestamp, displayTime ) VALUES ( '${pageID}', '${email}', '${displayName}', '${content}', '${timestamp}', '${displayTime}' );`;

  // 执行 sql
  pool.query(sqlStr, function (error, results, fields) {
  });
};

/**
 * 查询评论
 */
exports.queryComments = function (pool, pageID) {
  return new Promise((resolve, reject) => {
    // 构造 sql 语句
    const sqlStr = `select * from comments where pageID = '${pageID}' order by timestamp desc;`;

    // 执行 sql
    pool.query(sqlStr, (error, results, fields) => {
      const comments = [];
      results.forEach(element => {
        const comment = {};
        comment.pageID = element['pageID'];
        comment.email = element['email'];
        comment.displayName = element['displayName'];
        comment.content = element['content'];
        comment.timestamp = element['timestamp'];
        comment.displayTime = element['displayTime'];
        comments.push(comment);
      });
      resolve(comments);
    });
  });
};
