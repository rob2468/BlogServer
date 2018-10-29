#!/usr/bin/env bash
# 所有工作在目标仓库 comments 分支完成
# 遍历目标文件夹中的所有评论文件，每个评论文件创建一个提交
# 推送到远端

# 获取参数
repoDir=$1    # 仓库

cd ${repoDir}

# 获取所有未提交的评论文件
commentFiles=(`git ls-files --others --exclude-standard`)

for commentFile in ${commentFiles[@]}
do
    # 解析文件名，获取评论时间
    fileName=`basename ${commentFile}`
    oldIFS=$IFS
    IFS='_'
    fileNameComponents=($fileName)
    IFS=$oldIFS
    seconds=${fileNameComponents[1]}    # 毫秒
    seconds=$(( $seconds / 1000 ))      # 秒
    displayTime=`date -r ${seconds}`

    # 提交
    git add ${commentFile}
    git commit -m "comment on ${displayTime}"
done

# 推送到远端
git push origin comments
