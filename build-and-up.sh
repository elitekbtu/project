#!/usr/bin/env bash
set -e

cd frontend
npm install
npm run build
cd ..

mkdir -p nginx/html
rm -rf nginx/html/*
cp -r frontend/dist/* nginx/html/

exec docker compose up --build -d 