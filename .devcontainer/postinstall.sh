#!/bin/bash

echo 'eval "$(fzf --bash)"' >> /home/node/.bashrc

mkdir -p /home/node/.local/fzf

touch /home/node/.local/fzf/.bash_history

echo 'export HISTFILE=/home/node/.local/fzf/.bash_history' >> "/home/node/.bashrc"

cd /workspaces/webstudio
sudo corepack enable
corepack install

pnpm config set store-dir $HOME/.pnpm-store


find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +
find . -name 'lib' -type d -prune -exec rm -rf '{}' +
find . -name 'build' -type d -prune -exec rm -rf '{}' +
find . -name 'dist' -type d -prune -exec rm -rf '{}' +
find . -name '.cache' -type d -prune -exec rm -rf '{}' +
find . -name '.pnpm-store' -type d -prune -exec rm -rf '{}' +

pnpm install
pnpm run build
pnpm migrations migrate


cat << 'EOF' >> /home/node/.bashrc

alias gitclean="(git remote | xargs git remote prune) && git branch -vv | egrep '('\$(git remote | xargs | sed -e 's/ /|/g')')/.*: gone]' | awk '{print \$1}'  | xargs -r git branch -D"
alias gitrebase="git rebase --interactive main"
EOF


