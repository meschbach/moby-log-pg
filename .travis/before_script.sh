psql -c "create database 'dev-docker-logs' identified by 'dev-docker-logs';" -U postgres
psql -U dev-docker-logs <pg-01-base.sql