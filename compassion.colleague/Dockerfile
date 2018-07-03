FROM node:alpine
MAINTAINER Alan Gutierrez <alan@prettyrobots.com>

WORKDIR /home/bigeasy/addendum

COPY package*.json .
RUN npm install --no-package-lock --no-save --only=production

COPY ./ ./
