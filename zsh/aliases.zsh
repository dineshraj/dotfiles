alias reload!='. ~/.zshrc'

# tool micro-cuts
# alias git to g and let completions know
alias g='git'
compdef g=git

# alias rake to rk and let completions know
alias rake='bundle exec rake'
compdef rake=rake

alias cuke="bundle exec cucumber"

alias cop="rubocop"

alias ll='ls -la'

alias stun="cd /usr/local/Cellar/stunnel/5.08/bin/ && stunnel"
alias ipup="cd $PROJECTS/tviplayer/ && git checkout master && git fetch upstream && git rebase upstream/master"
alias tipup="cd $PROJECTS/tip/ && git checkout master && git fetch upstream && git rebase upstream/master"
alias bbup="cd $PROJECTS/bamboo/ && git checkout master && git fetch upstream && git rebase upstream/master"
alias stup="cd $PROJECTS/responsive-web-smoke-tests/ && git checkout master && git fetch upstream && git rebase upstream/master"

alias sb="ssh root@192.168.192.10"

alias ip="cd $PROJECTS/tviplayer"
alias tip="cd $PROJECTS/tip"

alias ..="cd .."
alias ...="cd ../.."
