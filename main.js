var http = require('http');
var https = require('https');
var fs = require('fs');
var url = require('url');
var domain = require('domain');
const exec = require('child_process').exec;

var requestListener = function (request, response) {
    // 解析请求，包括文件名
    var pathname = url.parse(request.url).pathname;

    // 输出请求的文件名
    console.log('Request received.\n    Path: ' + pathname + '\n    Method: ' + request.method);

    // 服务器需要设置的响应头
    var responseHeaders = {'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'};

    // 请求合法性检查
    if (request.method === 'OPTIONS') {
        response.writeHead(200, responseHeaders);
        response.end();
    } else if (pathname.indexOf('/tmp') === 0) {
        // 不允许请求 tmp 内文件
        response.writeHead(404, responseHeaders);
        response.end();
    } else if (pathname.indexOf('/api/submitcomment') === 0) {
        // 客户端提交评论
        // 常量
        var BRANCH_NAME = 'comments';
        var OWNER_NAME = 'rob2468';
        var REPO_NAME = 'rob2468.github.io';

        // 读取配置文件
        var conf = fs.readFileSync('conf.json', 'utf-8');
        var confJSON = JSON.parse(conf);
        var repoPath = confJSON.path;       // 博客仓库本地路径

        // domain
        var localDomain = domain.create();
        localDomain.on('error', function(err) {
            // 异常捕获
            response.writeHead(200, responseHeaders);
            var result = {
                'error': 1,
                'message': err.message
            };
            response.write(JSON.stringify(result));
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
                var postData = JSON.parse(body);
                var pageID = postData.page_id;
                var email = postData.email;
                var date = postData.date;
                var displayName = postData.display_name;
                var content = postData.content;
                // 评论数据模型
                var commentInfo = [{
                    'email': email,
                    'date': date,
                    'author': {
                        'display_name': displayName,
                    },
                    'content': content
                }];
                var comment = {
                    pageID : commentInfo
                };

                // 创建文件夹
                const commentFileDirectory = repoPath + '/_data/raw_comments/';
                if (!fs.existsSync(commentFileDirectory)) {
                    fs.mkdirSync(commentFileDirectory);
                }

                // 序列化，并写入文件
                const commentStr = JSON.stringify(comment);
                const commentFilePath = commentFileDirectory + 'comment_' + date;
                fs.writeFileSync(commentFilePath, commentStr);

                // 调用 shell 脚本，提交评论并推送到 GitHub
                exec('bash commit.sh ' + repoPath, function (error, stdout, stderr) {
                    console.log('stdout:');
                    console.log(stdout);

                    console.log('stderr:');
                    console.log(stderr);
                });

                // 响应客户端请求
                response.writeHead(200, responseHeaders);
                // var link = 'https://github.com/' + OWNER_NAME + '/' + REPO_NAME + "/commit/" + newHEADID;
                var link = '';
                var result = {
                    'error': 0,
                    'message': '成功',
                    'link': link
                };
                response.write(JSON.stringify(result));
                response.end();
            }); // request on end
        }); // domain run
    }
};
// 创建服务器
var server = http.createServer(requestListener);
var portNum = 8888;
server.listen(portNum);

// 控制台会输出以下信息
console.log('Server running at Port ' + portNum);
