alias reload!='. ~/.zshrc'

# tool micro-cuts
# alias git to g and let completions know
alias g='git'
compdef g=git

# alias rake to rk and let completions know
alias rake='bundle exec rake'
compdef rake=rake

alias gr="grunt"
compdef gr=grunt

alias cuke="bundle exec cucumber"

alias cop="rubocop"

alias stun="cd /usr/local/Cellar/stunnel/4.56/var/run/stunnel/ && stunnel"
alias ipup="cd $PROJECTS/tviplayer/ && git fetch upstream && git rebase upstream/develop"
alias tipup="cd $PROJECTS/tip-git/ && git fetch upstream && git rebase upstream/master"
alias bbup="cd $PROJECTS/bamboo/ && git fetch upstream && git rebase upstream/develop"

alias ip="cd $PROJECTS/tviplayer"
alias tip="cd $PROJECTS/tip-git"

alias ..="cd .."
alias ...="cd ../.."