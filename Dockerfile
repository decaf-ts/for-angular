FROM node:20-alpine as builder

RUN apk update && apk upgrade

ENV WORKDIR="ts-workspace"

COPY ./src/ $WORKDIR/src/
COPY ./*.json $WORKDIR/

ARG TOKEN

RUN cd $WORKDIR && TOKEN=$TOKEN npm ci && npm run build:prod

FROM node:20-alpine as production

RUN apk update && apk upgrade
RUN apk --no-cache add htop less grep && apk add --no-cache --upgrade bash # optional but useful

ENV WORKDIR="ts-workspace"

ENV NODE_ENV="production"

COPY --from=builder --chown=node:node $WORKDIR/dist $WORKDIR/
COPY --from=builder --chown=node:node $WORKDIR/bin $WORKDIR/bin/
COPY --from=builder --chown=node:node $WORKDIR/package*.json $WORKDIR/

USER node

ARG TOKEN

RUN cd $WORKDIR && TOKEN=$TOKEN npm ci

WORKDIR $WORKDIR

# EXPOSE 3000/tcp

ENTRYPOINT ["node", "cli"]

LABEL name="TS Workspace" description="Template Dockerfile for "

