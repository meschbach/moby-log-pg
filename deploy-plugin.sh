#!/usr/bin/env bash

cp config.json myplugin
docker plugin disable --force test-plugin:latest
docker plugin rm --force test-plugin:latest
docker plugin create test-plugin myplugin
docker plugin enable test-plugin:latest
