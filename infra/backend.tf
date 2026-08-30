# SKELETON — review before production.
# Remote state in Azure Storage (with blob-lease locking).
#
# CHICKEN-AND-EGG: this backend's storage account + container must already exist before
# `terraform init` can use it. Bootstrap it ONCE (see infra/README.md) — either a small `az` script
# or a separate local-state config — then fill in the values below and run `terraform init`.
#
# Values can also be passed at init time instead of hard-coding:
#   terraform init -backend-config="resource_group_name=..." -backend-config="storage_account_name=..." ...

# ⚠️ ONE STATE FILE PER ENVIRONMENT.
#
# `key` below is the DEFAULT only. Every environment must use its own state
# file, or a `terraform apply` aimed at preview will read production's state,
# see resources that "should not exist", and plan to destroy them. This is the
# single most damaging mistake available in this directory.
#
# Pass the key per environment at init time:
#
#   terraform init -reconfigure -backend-config="key=change-mgmt-preview.tfstate"
#   terraform apply -var-file=envs/preview.tfvars
#
#   terraform init -reconfigure -backend-config="key=change-mgmt-prod.tfstate"
#   terraform apply -var-file=envs/prod.tfvars
#
# `-reconfigure` matters: without it Terraform reuses the previously cached
# backend settings and silently keeps pointing at the last environment used.
#
# Workspaces are the alternative (`terraform workspace select preview`), which
# namespaces state as `env:/<workspace>/<key>` automatically. Either is fine —
# but pick one and use it consistently. Mixing them is how state gets lost.

terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"     # the bootstrap state RG
    storage_account_name = "tfstateXXXXXX"  # globally unique; created during bootstrap
    container_name       = "tfstate"
    key                  = "change-mgmt-prod.tfstate" # OVERRIDE per environment — see above
    use_azuread_auth     = true             # auth to the state account via Entra, not a key
  }
}
