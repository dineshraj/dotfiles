export EDITOR='atom'
export SIKULIX_HOME="~/workspace/tip/features/libs/sikuli-java.jar"

export code='open /Applications/Visual\ Studio\ Code.app'

# always use color output for ls
export CLICOLOR=1

# tell grep to highlight matches
export GREP_OPTIONS='--color=auto'


# For BBC Browserstack Automate stuff (nightwatch)
export BROWSERSTACK_BASE_URL='http://www.bbc.co.uk'
export BROWSERSTACK_USER='dineshrajgoomany1'
export BROWSERSTACK_KEY='jBmyAGpAz4WjsWEyqnmq'

# For BBC Cosmos stuff
export COSMOS_CERT='/Users/dineshraj/workspace/dev.bbc.co.uk.pem'

export MAVEN_OPTS="-Xms256m -Xmx512m
    -Djavax.net.ssl.trustStore=/Users/dineshraj/workspace/jssecacerts \
    -Djavax.net.ssl.keyStore=/Users/dineshraj/workspace/dev.bbc.co.uk.p12 \
    -Djavax.net.ssl.keyStorePassword=Rsj96961! \
    -Djavax.net.ssl.keyStoreType=PKCS12"

export JAVA_HOME=$(/usr/libexec/java_home)

export NVM_DIR="$HOME/.nvm"
  . "$(brew --prefix nvm)/nvm.sh"
