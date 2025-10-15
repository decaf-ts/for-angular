#!/bin/bash -e

function ask_yes_or_no(){
    # Test if there are enough arguments
    if [[ $# -gt 2 ]]; then
        exit 1
    fi

    local message="${1}"
    local y="y"
    local n="N"

    # defaults to no if not otherwise specified
    [[ $2 == "yes" ]] && local default="yes" && y="Y" && n="n" || local default="no"

    read -p "$message ([$y]es or [$n]o): "
    case $(echo $REPLY | tr '[A-Z]' '[a-z]') in
        y|yes) local response="yes" ;;
        *)     local response="no" ;;
    esac
    if [[ $response == "$default" ]] || [[ -z $REPLY ]]; then
        echo $default
    else
        echo $response
    fi
}

function ask(){
    # Test if there are enough arguments
    if [[ $# -ne 1 ]]; then
        exit 1
    fi

    local answer
    local real_answer=""

    while [[ "" == "$real_answer" ]]; do
        read -p "Please type in $1: " answer
        [[ "yes" == $(ask_yes_or_no "Is $answer you final answer?") ]] \
                && real_answer="$answer"
    done

    echo "$real_answer"
}

if [[ $# -ne 0 ]];then
  TAG="$1"
  if [[ -n "$TAG" ]];then
    shift
  fi

  MESSAGE="$*"
fi

echo "Preparing release prerequisites..."
npm run prepare-release

if [[ -z "$TAG" ]];then
  echo "Listing existing tags..."
  git tag --sort=-taggerdate | head -n 5
  while [[ "$TAG" == "" || ! "${TAG}" =~ ^v[0-9]+\.[0-9]+.[0-9]+(\-[0-9a-zA-Z\-]+)?$ ]]; do
    TAG=$(ask "What should be the new tag? (accepts v*.*.*[-...])")
  done
fi

if [[ -z "$MESSAGE" ]];then
  MESSAGE=$(ask "Tag Message")
fi

if [[ $(git status --porcelain) ]]; then
  git add .
  git commit -m "$TAG - $MESSAGE - after release preparation"
fi

npm version "$TAG" -m "$MESSAGE"

GIT_USER=$(git config user.name)

REMOTE_URL=$(git remote get-url origin)

if [[ "$(cat .token)" ]]; then
  git push -u "https://${GIT_USER}:$(cat .token)@${REMOTE_URL#https://}" --follow-tags
else
  git push --follow-tags
fi

if [[ "$MESSAGE" =~ -no-ci$ ]]; then
  NPM_TOKEN=$(cat .npmtoken) npm publish --access public
fi
