FROM node:12.13.1

ADD . /nlu

WORKDIR /nlu

RUN apt update && \
	apt install -y wget ca-certificates

RUN yarn

RUN yarn build

ENTRYPOINT ["yarn", "start"]
