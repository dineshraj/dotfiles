#!/bin/sh

# set up Github ssh
# see https://unix.stackexchange.com/questions/136894/command-line-method-or-programmatically-add-ssh-key-to-github-com-user-account
ssh-keygen -t rsa -b 4096 -C "dineshraj.goomany@bbc.co.uk"
eval "$(ssh-agent -s)"

cat <<EOT >> ~/.ssh/config
Host *
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_rsa
EOT

ssh-add -K ~/.ssh/id_rsa

curl -u "dineshraj" \
    --data "{\"title\":\"DevVm_`date +%Y%m%d%H%M%S`\",\"key\":\"`cat ~/.ssh/id_rsa.pub`\"}" \
    https://api.github.com/user/keys




mkdir ~/workspace && cd ~/workspace
git clone git@github.com:bbc/iplayer-web-app-playback.git
git clone git@github.com:bbc/iplayer-web-app-playback-scripts.git

npm install -g bbc/cosmos-cli
