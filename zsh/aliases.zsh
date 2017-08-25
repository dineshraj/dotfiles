alias reload!='. ~/.zshrc'

# tool micro-cuts
# alias git to g and let completions know
alias g='git'
compdef g=git

# alias rake to rk and let completions know
alias rake='bundle exec rake'
compdef rake=rake

alias cuke="bundle exec cucumber"
alias ll='ls -la'

alias stun="cd /usr/local/Cellar/stunnel/5.08/bin/ && stunnel"
alias ipup="cd $PROJECTS/tviplayer/ && git checkout master && git fetch origin && git rebase origin/master"
alias tipup="cd $PROJECTS/tviplayer-tip-html5/ && git checkout master && git fetch origin && git rebase origin/master"
alias bbup="cd $PROJECTS/bamboo/ && git checkout master && git fetch upstream && git rebase upstream/master"
alias stup="cd $PROJECTS/responsive-web-smoke-tests/ && git checkout master && git fetch upstream && git rebase upstream/master"

alias ip="cd $PROJECTS/tviplayer"

alias ..="cd .."
alias ...="cd ../.."

function sb() {
  open -a Docker
  docker attach $(docker ps -q)

  if [ $? -eq 1 ]; then
    cd $PROJECTS/tviplayer-docker/iplayer-sandbox && sh run.sh
  fi
}
