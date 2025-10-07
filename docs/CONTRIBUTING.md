# How to contribute

## Initial Steps

* Install python 3.9 or higher (python 3.12 reccomended) from python website or system package manager
* Check python version: `python3 --version'

* Call 225-975-5921 if you are unsure or have questions. 

### 1. Clone repo
```bash
git clone https://github.com/algoflow-quant/algoflow.git
cd algoflow
```

### 2. Install dependencies

#### Frontend Setup:
N/A Contact Caden Lund for more

#### Backend Setup:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate # On windows this is: venv\Scripts\activate   
pip install -r requirements.txt
```
* Windows users should use WSL for development

### 3. Setup commit tools

#### Install commitizen for easy guided commits:
```bash
# Exit virtual environment
deactivate
# Install pipx for global python packages
sudo apt install pipx # brew install pipx
# Install commitizen for guided commits
pipx install commitizen
pipx ensurepath

# Now use the following in place of git commit
cz commit # Provides interactive helper for formatting
```

#### Install pre-commit hooks (Optional but reccommended, catch commit errors before pushing to online repo):

**IMPORTANT**
* You will have to redo commit messages if they are in the wrong format!!!
* Note that github actions will prevent you from committing improper messages to the repo. 

```bash
# Install pre-commit
pipx install pre-commit
# Install the git hook
pre-commit install --hook-type commit-msg
# Now bad commits get blocked locally (faster feedback)
```

## Commit message formatting rules

All commits must follow the Conventional Commits format:

`type(scope): description`

Can also have a body and footer

### Types (Required)
- **feat**: New feature for the user
- **fix**: Bug fix for the user
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, semicolons, etc)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scope (Optional)
The scope should indicate what part of the codebase changed:
- `backend`, `frontend`, `api`, `db`, `auth`, `ui`, etc.

### Description Rules
- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Keep under 72 characters

### Examples

**Good commits:**
```
feat(auth): add OAuth2 login with Google
fix(api): resolve timeout on stock api
docs: update stock database installation instructions in README
```

### Other stuff

For breaking changes, add ! after type/scope and explain in body:

`feat(api)!: change user endpoint response format`

For complex changes, add a body:
```bash
git commit -m "feat(backtest): integrate backtesting queue" -m "
- Addded priority queue for backtest nodes
- Created installation scripts to deploy multiple backtest nodes
- Added a load balancer to route backtests
- Update database schema"
```

## Branch workflow

### Protected Branches
- **main**: Production-ready code (protected, requires PR + review)
- **dev**: Integration branch for features (protected, requires PR + review)
- **Never push directly to main or dev!**

### Branch Naming Convention

Use descriptive branch names with these prefixes:

- `feature/` - New features or enhancements
- `bugfix/` - Bug fixes (non-urgent)
- `hotfix/` - Urgent production fixes
- `docs/` - Documentation only changes
- `refactor/` - Code refactoring (no functionality change)
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

**Examples:**
- feature/user-authentication
- feature/portfolio-analytics
- bugfix/chart-rendering-error

### Creating a Branch

**Always start from dev:**
```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

### Working on your branch

**After Changes**
```bash
git add .
git commit -m "feat: add new feature" 

# Keep branch updated with dev
git fetch origin
git rebase origin/dev  # or merge if you prefer

git push origin feature/your-feature-name
```

## Pull Request Process

### 1. Push branch to GitHub
```bash
git push origin feature/your-feature # Make sure you branch off of dev
```

### 2. Create Pull request

On GitHub:
- Click "Compare & pull request" button
- Base: dev (NEVER directly to main)
- Compare: your feature branch

PR Title:
- Use clear, descriptive title
- Example: "Add portfolio analytics dashboard"