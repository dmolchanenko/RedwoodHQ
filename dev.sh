#!/usr/bin/env bash
echo "Starting local DEV environment"

tput rmam
docker-compose up
tput smam

