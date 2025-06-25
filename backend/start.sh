#!/bin/bash

trap 'exit 0' SIGTERM SIGINT

waitress-serve --port=8000 backend.wsgi:application &

wait $!