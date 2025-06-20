#!/bin/bash

if ! command -v emerge >/dev/null 2>&1; then
   echo "emerge command does not exist. Installing."
    apt-get install graphviz graphviz-dev
    pip install emerge-viz
fi

mkdir -p ./.emerge-vis-output/rws-server

emerge -c ./.emerge-typescript-template.yaml