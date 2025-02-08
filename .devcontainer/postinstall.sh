#!/bin/bash

echo "Running postinstall.sh"

# Configure FZF and bash history
echo 'eval "$(fzf --bash)"' >> /home/node/.bashrc
sudo mkdir -p /home/node/.local/fzf
touch /home/node/.local/fzf/.bash_history
echo 'export HISTFILE=/home/node/.local/fzf/.bash_history' >> "/home/node/.bashrc"

# Aggressively clean npm and corepack caches
npm cache clean -f
sudo rm -rf /tmp/corepack-cache
sudo rm -rf /usr/local/lib/node_modules/corepack # Manually remove global corepack

# Reinstall corepack globally via npm
npm install -g corepack@latest --force # Install latest corepack version
sudo corepack enable # Re-enable corepack

# Check corepack version after reinstall
corepack --version

# Prepare pnpm (again, after corepack reinstall)
corepack prepare pnpm@9.14.4 --activate

# Go to workspace directory
cd /workspaces/webstudio

# Configure pnpm store directory
pnpm config set store-dir $HOME/.pnpm-store

# Clean up directories (optional)
find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +
find . -name 'lib' -type d -prune -exec rm -rf '{}' +
find . -name 'build' -type d -prune -exec rm -rf '{}' +
find . -name 'dist' -type d -prune -exec rm -rf '{}' +
find . -name '.cache' -type d -prune -exec rm -rf '{}' +
find . -name '.pnpm-store' -type d -prune -exec rm -rf '{}' +

# Install dependencies, build, and migrate
pnpm install
pnpm build
pnpm migrations migrate

# Add git aliases
cat << 'EOF' >> /home/node/.bashrc
alias gitclean="(git remote | xargs git remote prune) && git branch -vv | egrep '('\$(git remote | xargs | sed -e 's/ /|/g')')/.*: gone]' | awk '{print \$1}'  | xargs -r git branch -D"
alias gitrebase="git rebase --interactive main"
EOF


echo "postinstall.sh finished"