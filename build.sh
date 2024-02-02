rootPath=$(cd `dirname "$0"`; pwd)
docker build -f "$rootPath/Dockerfile" -t rubiks-cube:latest "$rootPath"
