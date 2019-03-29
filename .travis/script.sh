#!/usr/bin/env bash
set -ex

export PGHOST=127.0.0.1
export PGUSER=logger
export PGPASSWORD=logger
export PGDATABASE=logger
npm test
