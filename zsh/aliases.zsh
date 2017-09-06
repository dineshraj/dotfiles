alias reload!='. ~/.zshrc'

# tool micro-cuts
# alias git to g and let completions know
alias g='git'
compdef g=git


alias ll='ls -la'
alias rmd='rm -rf'

alias stun="cd /usr/local/Cellar/stunnel/5.08/bin/ && stunnel"

alias ..="cd .."
alias ...="cd ../.."

function sb() {
  open -a Docker
  docker attach $(docker ps -q)

  if [ $? -eq 1 ]; then
    cd $PROJECTS/tviplayer-docker/iplayer-sandbox && sh run.sh
  fi
}


alias git='hub'
