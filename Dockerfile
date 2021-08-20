FROM node:12.13.1 AS build

ADD . /nlu

WORKDIR /nlu

RUN apt update && \
	apt install -y wget ca-certificates

RUN yarn

RUN yarn build

RUN yarn package

FROM ubuntu:18.04

COPY --from=build /nlu/dist/nlu-v0_1_4-linux-x64 /nlu

CMD ["/nlu"]
