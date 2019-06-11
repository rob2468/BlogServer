'use strict';

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

