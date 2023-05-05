FROM node:12.13.1 AS build

ADD . /nlu

WORKDIR /nlu

# See https://stackoverflow.com/a/76095392
# Update stretch repositories
RUN sed -i s/deb.debian.org/archive.debian.org/g /etc/apt/sources.list
RUN sed -i 's|security.debian.org|archive.debian.org/|g' /etc/apt/sources.list
RUN sed -i '/stretch-updates/d' /etc/apt/sources.list

RUN apt update && \
	apt install -y wget ca-certificates

RUN yarn

RUN yarn build

RUN yarn package

FROM ubuntu:18.04

COPY --from=build /nlu/dist/nlu-v0_1_9-linux-x64 /nlu

CMD ["/nlu"]
