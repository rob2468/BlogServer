var http = require('http');
var https = require('https');
var fs = require('fs');
var url = require('url');
var domain = require('domain');

var requestListener = function (request, response) {
    // 解析请求，包括文件名
    var pathname = url.parse(request.url).pathname;
 
    // 输出请求的文件名
    console.log("Request for " + pathname + " received.");

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
        
        // 读取 AuthorizationToken
        var token = fs.readFileSync('tmp/AuthorizationToken', 'utf-8');

        // 客户端数据
        var pageID;
        var email;
        var date;
        var displayName;
        var content;
        var comment;

        /* 函数定义 */
        // 获取 reference
        function getGitHubReference(callback) {
            var refOptions = {
                hostname: 'api.github.com',
                path: '/repos/' + OWNER_NAME + '/' + REPO_NAME + '/git/refs/heads/' + BRANCH_NAME,
                headers: {
                    'User-Agent': REPO_NAME,
                }
            };
            https.get(refOptions, function (refResponse) {
                var body = '';
                refResponse.on('data', function (data) {
                    body += data;
                });
                refResponse.on('error', function (err) {
                    console.log(err);
                });
                refResponse.on('end', function () {
                    // 解析 reference 信息
                    var responseJSON = JSON.parse(body);
                    var lastCommitID = responseJSON.object.sha;
                    if (typeof(callback) === 'function') {
                        callback(lastCommitID);
                    }
                });
            });
        }

        // 获取 commit
        function getGitHubCommit(lastCommitID, callback) {
            var commitOptions = {
                hostname: 'api.github.com',
                path: '/repos/' + OWNER_NAME + '/' + REPO_NAME + '/git/commits/' + lastCommitID,
                headers: {
                    'User-Agent': REPO_NAME,
                }   
            };
            https.get(commitOptions, function (commitResponse) {
                var body = '';
                commitResponse.on('data', function (data) {
                    body += data;
                });
                commitResponse.on('end', function () {
                    // 解析 commit 信息
                    var responseJSON = JSON.parse(body);
                    var treeID = responseJSON.tree.sha;
                    if (typeof(callback) === 'function') {
                        callback(treeID);
                    }
                });
            });
        }

        // 创建新的 tree 对象
        function postGitHubTree(treeID, callback) {
            var treeOptions = {
                hostname: 'api.github.com',
                path: '/repos/' + OWNER_NAME + '/' + REPO_NAME + '/git/trees',
                method: 'POST',
                headers: {
                    'User-Agent': REPO_NAME,
                    'Authorization': token,
                    'Content-Type': 'application/json;charset=utf-8'
                }
            };
            var treeRequest = https.request(treeOptions, function (treeResponse) {
                var body = '';
                treeResponse.on('data', function (data) {
                    body += data;
                });
                treeResponse.on('error', function (err) {
                    throw err;
                });
                treeResponse.on('end', function () {
                    var responseJSON = JSON.parse(body);
                    var newTreeID = responseJSON.sha;
                    if (typeof(callback) === 'function') {
                        callback(newTreeID);
                    }
                });
            });
            var newTreeJSON = {
                'tree': [{
                    'path': '_data/raw_comments/comment_' + new Date().getTime(),
                    'mode': '100644',
                    'type': 'blob',
                    'content': JSON.stringify(comment)
                }],
                "base_tree": treeID,
              };  
            treeRequest.write(JSON.stringify(newTreeJSON));
            treeRequest.end();
        }

        // 创建新的 commit
        function postGitHubCommit(lastCommitID, newTreeID, callback) {
            var newCommitOptions = {
                hostname: 'api.github.com',
                path: '/repos/' + OWNER_NAME + '/' + REPO_NAME + '/git/commits',
                method: 'POST',
                headers: {
                    'User-Agent': REPO_NAME,
                    'Authorization': token,
                    'Content-Type': 'application/json;charset=utf-8'
                }
            };
            var newCommitRequest = https.request(newCommitOptions, function (newCommitResponse) {
                var body = '';
                newCommitResponse.on('data', function (data) {
                    body += data;
                });
                newCommitResponse.on('end', function () {
                    var responseJSON = JSON.parse(body);
                    var newCommitID = responseJSON.sha;

                    if (typeof(callback) === 'function') {
                        callback(newCommitID);
                    }
                });
            });
            var newCommitJSON = {
                'message': 'comment by ' + displayName + ' on ' + date,
                'tree': newTreeID,
                'parents': [lastCommitID]
            };
            newCommitRequest.write(JSON.stringify(newCommitJSON));
            newCommitRequest.end();
        }

        // 修改 reference
        function postGitHubReference(newCommitID, callback) {
            var newHEADOptions = {
                hostname: 'api.github.com',
                path: '/repos/' + OWNER_NAME + '/' + REPO_NAME + '/git/refs/heads/' + BRANCH_NAME,
                 method: 'POST',
                headers: {
                    'User-Agent': REPO_NAME,
                    'Authorization': token,
                    'Content-Type': 'application/json;charset=utf-8'
                }
            };
            var newHEADRequest = https.request(newHEADOptions, function (newHEADResponse) {
                var body = '';
                newHEADResponse.on('data', function (data) {
                    body += data;
                });
                newHEADResponse.on('end', function () {
                    var responseJSON = JSON.parse(body);
                    var newHEADID = responseJSON.object.sha;

                    if (typeof(callback) === 'function') {
                        callback(newHEADID);
                    }
                });
            });
            var newHEADJSON = {
                "sha": newCommitID,
                "force": false
            };
            newHEADRequest.write(JSON.stringify(newHEADJSON));
            newHEADRequest.end();
        }
        
        /* */
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
                var postData = JSON.parse(body);
                pageID = postData.page_id;
                email = postData.email;
                date = postData.date;
                displayName = postData.display_name;
                content = postData.content;
                // 评论数据模型
                var commentInfo = [{
                    'email': email,
                    'date': date,
                    'author': {
                        'display_name': displayName,
                    },
                    'content': content
                }];
                comment = {};
                comment[pageID] = commentInfo;

                // 获取 reference
                getGitHubReference(function (lastCommitID) {
                    // 获取 commit
                    getGitHubCommit(lastCommitID, function (treeID) {
                        // 创建新的 tree 对象
                        postGitHubTree(treeID, function (newTreeID) {
                            // 创建新的 commit
                            postGitHubCommit(lastCommitID, newTreeID, function (newCommitID) {
                                // 修改 reference
                                postGitHubReference(newCommitID, function (newHEADID) {
                                    // 响应客户端请求
                                    response.writeHead(200, responseHeaders);
                                    var link = 'https://github.com/' + OWNER_NAME + '/' + REPO_NAME + "/commit/" + newHEADID;
                                    var result = {
                                        'error': 0,
                                        'message': '成功',
                                        'link': link
                                    };
                                    response.write(JSON.stringify(result));
                                    response.end();
                                });
                            });
                        });
                    });
                });

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
