#!/usr/bin/env bash -xe

cp config.json myplugin
docker plugin disable --force test-plugin:latest
docker plugin rm --force test-plugin:latest
docker plugin create test-plugin myplugin
docker plugin enable test-plugin:latest
