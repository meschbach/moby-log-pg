#!/usr/bin/env bash
docker rm test-driver-image 
docker rmi test-driver
rm -fR myplugin
mkdir -p myplugin/rootfs

docker build . --tag test-driver
id=$(docker create --name test-driver-image test-driver true)
docker export "$id" | tar -x -C myplugin/rootfs
cp config.json myplugin
./deploy-plugin.sh
