alias reload!='. ~/.zshrc'

# alias git to g and let completions know
alias g='git'
compdef g=git

alias ll='ls -la'
alias rmd='rm -rf'

alias ..="cd .."
alias ...="cd ../.."

alias begin="git checkout master && git pull && npm ci && npm t"
