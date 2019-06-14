'use strict';
const exec = require('child_process').exec;
const fs = require('fs');

/**
 * 发送邮件
 */
exports.sendMail = function (email, content) {
  const tmpFile = `/tmp/mail_${Date.now()}`;  // 临时文件名
  fs.writeFileSync(tmpFile, content, 'utf8'); // 邮件正文写入临时文件

  const cmd = `mail ${email} < ${tmpFile}`; // 发送邮件的命令
  // 发送邮件
  exec(cmd, function (error, stdout, stderr) {
    // 删除临时文件
    exec(`rm ${tmpFile}`);
  });
};
