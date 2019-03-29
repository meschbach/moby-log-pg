#!/usr/bin/env bash
set -ex

## Setup Postgres
# Based on https://github.com/doctrine/dbal/blob/master/tests/travis/install-postgres-11.sh


echo "Preparing Postgres 11"

sudo service postgresql stop || true
sudo docker run -d --name postgres11 -p 5432:5432 postgres:11.1
sudo docker exec -i postgres11 bash <<< 'until pg_isready -U postgres > /dev/null 2>&1 ; do sleep 1; done'

echo "Postgres 11 ready"

# Add the user
psql -c 'CREATE USER "dev-docker-logs" WITH PASSWORD "dev-docker-logs"' -U postgres -h 127.0.0.1
psql -c 'CREATE DATABASE "dev-docker-logs" OWNER "dev-docker-logs"' -U postgres -h 127.0.0.1

export PGPASSWORD=dev-docker-logs
psql  -h 127.0.0.1 -U dev-docker-logs dev-docker-logs <pg-01-base.sql
