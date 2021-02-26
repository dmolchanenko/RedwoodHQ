FROM ubuntu:16.04

# Initial config
ENV DEBIAN_FRONTEND noninteractive
ENV TERM xterm

RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y software-properties-common
RUN apt-get install -y locales apt-utils
RUN apt-get install -y gcc make build-essential
RUN apt-get install -y wget git curl libssl1.0.0 supervisor
RUN apt-get install -y python
RUN apt-get install -y npm
RUN npm install -g n
RUN n 0.8.6

# Set the locale
ENV LANG=en_US.UTF-8
RUN locale-gen en_US.UTF-8 && update-locale LANG=en_US.UTF-8

RUN mkdir /redwoodagent
ADD src /redwoodagent
WORKDIR /redwoodagent
