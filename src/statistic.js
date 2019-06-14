'use strict';
const moment = require('moment');

/**
 * 增加一条记录
 */
exports.addBehaviorRecord = function (pool, record) {
  // 解析出数据库字段
  const pageID = record.pageID;
  const title = record.title;
  const behaviorId = record.behaviorId;
  const cityName = record.cityName;
  const ipAddr = record.ipAddr;
  const timestamp = record.timestamp;
  const displayTime = record.displayTime;

  // 构造 sql 语句
  const sqlStr = `insert into behavior_stat ( pageID, title, behaviorId, cityName, ipAddr, timestamp, displayTime ) VALUES ( '${pageID}', '${title}', '${behaviorId}', '${cityName}', '${ipAddr}', '${timestamp}', '${displayTime}' );`;

  // 执行 sql
  pool.query(sqlStr, function (error, results, fields) {
  });
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
      const sqlStr = `select count(*) as count, pageID, title from behavior_stat where displayTime='${displayTime}' group by pageID, title order by count desc`;

      // 执行 sql
      pool.query(sqlStr, (error, results, fields) => {
        // 解析检索结果
        const records = [];
        results && results.forEach(element => {
          const { count, pageID, title } = element;
          records.push({
            count,
            pageId: pageID,
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
