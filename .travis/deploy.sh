#!/usr/bin/env bash
set -ex

# Figure out the version
version=$(node -e 'process.stdout.write(require("./package.json").version)')
image="meschbach/moby-log-pg:$version"

# Login
docker login -u "$DOCKER_USER" -p "$DOCKER_PASS"

# Build the Docker Image
docker build . --tag "$image"
docker push "$image"

# Build the plugin image
id=$(docker create --name plugin-image "$image" true)
mkdir -p $PWD/moby-log-pg/rootfs
docker export "$id" | tar -x -C $PWD/moby-log-pg/rootfs
cp config.json moby-log-pg
docker plugin create "$image" moby-log-pg
docker plugin push "$image"
