FROM node:lts
WORKDIR /home/app/
COPY package.json .
RUN npm install
ADD start.sh .
COPY . .
ENV PORT 3000
EXPOSE ${PORT}
RUN chmod +x ./start.sh
CMD ["./start.sh"]