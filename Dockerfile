FROM node:12.13.1 AS build

ADD . /nlu

WORKDIR /nlu

RUN apt update && \
	apt install -y wget ca-certificates

RUN yarn

RUN yarn build

RUN yarn package

FROM alpine:3.13

COPY --from=build /nlu/dist/nlu-linux /nlu

CMD ["/nlu"]
