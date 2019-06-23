'use strict';
const moment = require('moment');

/**
 * 增加一条记录
 */
exports.addBehaviorRecord = function (pool, record) {
  // 解析出数据库字段
  const pageId = record.pageId;
  const title = record.title;
  const behaviorId = record.behaviorId;
  const cityName = record.cityName;
  const ipAddr = record.ipAddr;
  const timestamp = record.timestamp;
  const displayTime = record.displayTime;

  // 插入 behavior_stat 表
  const sqlStr = `INSERT INTO behavior_stat ( pageId, behaviorId, cityName, ipAddr, timestamp, displayTime ) VALUES ( '${pageId}', '${behaviorId}', '${cityName}', '${ipAddr}', '${timestamp}', '${displayTime}' );`;
  pool.query(sqlStr, (error, results, fields) => {});

  // 插入 posts 表
  const postsSql = `REPLACE INTO posts ( pageId, title ) VALUES ( '${pageId}', '${title}' )`;
  pool.query(postsSql, (error, results, fields) => {});
};

/**
 * 查询行为数据
 * @param {string} displayTime 请求日期，如，2019-06-12
 * @param {number} prevDays 前若干天，如，10
 */
exports.queryStatisticData = function (pool, displayTime, prevDays) {
  return new Promise((resolve) => {
    const displayTimeArr = [];  // 需要查询的日期数组
    let timestamp = moment(displayTime).toDate().getTime(); // 初始时间戳
    let i = 0;
    while (i < prevDays) {
      // 计算出所有需要查询的日期
      const dateStr = moment(timestamp).utcOffset(8).format('YYYY-MM-DD');
      displayTimeArr.unshift(dateStr);

      timestamp -= 24 * 60 * 60 * 1000;
      i++;
    }

    const retVal = {};
    let num = 0;  // 记录完成检索的次数
    displayTimeArr.forEach(displayTime => {
      // 检索指定日期的访问量，以文章做分组，访问量从大到小排列
      const sqlStr = `SELECT count(*) as count, b.pageId, p.title FROM behavior_stat b JOIN posts p ON b.pageId = p.pageId WHERE b.displayTime='${displayTime}' GROUP BY b.pageId ORDER BY count DESC;`;

      // 执行 sql
      pool.query(sqlStr, (error, results, fields) => {
        // 解析检索结果
        const records = [];
        results && results.forEach(element => {
          const { count, pageId, title } = element;
          records.push({
            count,
            pageId,
            title,
          });
        });

        // 保存本次查询的结果
        retVal[displayTime] = records;

        num++;
        if (num >= displayTimeArr.length) {
          // 已完成所有检索，返回
          resolve(retVal);
        }
      });
    });
  });
};
