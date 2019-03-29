#!/usr/bin/env bash
set -ex

# Figure out the version
version=$(node -e 'process.stdout.write(require("./package.json").version)')
image="meschbach/moby-log-pg:$version"

# Build the Docker Image
docker build . --tag "$image"

# Build the plugin image
id=$(docker create --name plugin-image "$image" true)
mkdir -p moby-log-pg
docker export "$id" | tar -x -C moby-log-pg/rootfs
cp config.json moby-log-pg
docker plugin create "$image" moby-log-pg
