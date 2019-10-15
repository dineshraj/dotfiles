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


cat <<EOT >> ~/.ssh/config
Host ?.access.*.cloud.bbc.co.uk
  IdentityFile ~/.ssh/id_rsa

Host *,??-*-?
  User dineshraj.goomany@bbc.co.uk
  IdentityFile ~/.ssh/id_rsa
  ProxyCommand >&1; h="%h"; r=${h##*,}; i=${h%%,*}; v=$(($(cut -d. -f2 <<<$i) / 32)); exec ssh -q -p 22000 bastion-tunnel@$v.access.$r.cloud.bbc.co.uk nc $i %p
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
EOT

ssh-add -K ~/.ssh/id_rsa

curl -u "dineshraj" \
    --data "{\"title\":\"DevVm_`date +%Y%m%d%H%M%S`\",\"key\":\"`cat ~/.ssh/id_rsa.pub`\"}" \
    https://api.github.com/user/keys


mkdir ~/workspace && cd ~/workspace

npm install -g bbc/cosmos-cli

sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
