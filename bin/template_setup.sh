#!/bin/bash -e

function ask_yes_or_no(){
    # Test if there are enough arguments
    if [[ $# > 2 ]]; then
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
    if [[ $response == $default ]] || [[ -z $REPLY ]]; then
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

# Flash Forward the dependencies
npx npm-check-updates -u

# Delete the preinstall script from package.json (we only need it the first run)
node<<EOF > _.json && mv _.json package.json
var o = $(cat package.json);
delete o["scripts"]["preinstall"];
console.log(JSON.stringify(o, null, 2));
EOF

# create the token file
touch .token

## Create the initial commit after this runs
if [[ $(git status --porcelain) ]]; then
  git config user.email "setup@automation.com"
  git config user.name "setup_automation"
  git add .
  git commit -m "refs #1 - initial commit"
  git push
  git config --unset user.name
  git config --unset user.email
fi

# delete this file
rm -f ./bin/template_setup.sh