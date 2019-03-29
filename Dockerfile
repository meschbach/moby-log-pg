FROM node:11-alpine

WORKDIR /plugin
RUN mkdir -p /run/docker/plugins
ENV NODE_ENV production
ADD package.json /plugin/
RUN npm install
ADD *.js *.proto config.json /plugin/
