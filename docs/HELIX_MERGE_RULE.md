# Merge / Rename Rule

Do not merge or rename based only on the presence of migration files. Require current CI evidence. Known RED results must be resolved on the branch first.

After a green merge, perform the repository rename as its own controlled operation and immediately re-run/inspect workflows and deployment behavior under the new repository name.
