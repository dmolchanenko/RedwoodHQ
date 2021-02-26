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

RUN mkdir /redwoodhq
ADD src /redwoodhq
WORKDIR /redwoodhq
RUN npm config set ca ""
RUN npm i

#RUN mkdir -p /home/install
#WORKDIR /home/install
#ADD http://redwoodhq.com/download/RedwoodHQLinuxUbuntu_250.tar.gz /home/install
#RUN mkdir -p /home/RedwoodHQ
#RUN chmod o+w /home/RedwoodHQ
#RUN tar -xzf RedwoodHQLinuxUbuntu_250.tar.gz --directory /home 2> /dev/null; exit 0
#RUN rm RedwoodHQLinuxUbuntu_250.tar.gz
#
#WORKDIR /home/RedwoodHQ
#COPY rootstart.sh /
#RUN chmod +x /rootstart.sh
#RUN mkdir -p /data/supervisor
#COPY supervisord.conf /etc/supervisor/conf.d/redwoodhq.conf
#
#RUN chown -R root:root /home/RedwoodHQ
#RUN chmod -R 777 /home/RedwoodHQ
#
#EXPOSE 3000
#CMD "/usr/bin/supervisord"
