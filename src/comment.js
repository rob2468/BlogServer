'use strict';

/**
 * 增加评论
 */
exports.addComment = function (pool, comment) {
  // 解析出数据库字段
  const {
    pageId,
    title,
    email,
    displayName,
    content,
    timestamp,
    displayTime,
  } = comment;

  // 构造 sql 语句，更新 comments 表
  const commentsSql = `insert into comments ( pageID, email, displayName, content, timestamp, displayTime ) VALUES ( '${pageId}', '${email}', '${displayName}', '${content}', '${timestamp}', '${displayTime}' );`;

  // 执行 sql
  pool.query(commentsSql, function (error, results, fields) {
  });

  // 构造 sql 语句，更新 posts 表
  const postsSql = `replace into posts ( pageId, title ) values ( '${pageId}', '${title}' )`;
  pool.query(postsSql, (error, results, fields) => {});
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
      results && results.forEach(element => {
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
