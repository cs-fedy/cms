#!/bin/bash

npx prisma db push
npx prisma generate

if [ "$NODE_ENV" == "production" ] ; then
  npm run start
else
  npm run dev
fi