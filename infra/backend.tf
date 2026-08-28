# SKELETON — review before production.
# Remote state in Azure Storage (with blob-lease locking).
#
# CHICKEN-AND-EGG: this backend's storage account + container must already exist before
# `terraform init` can use it. Bootstrap it ONCE (see infra/README.md) — either a small `az` script
# or a separate local-state config — then fill in the values below and run `terraform init`.
#
# Values can also be passed at init time instead of hard-coding:
#   terraform init -backend-config="resource_group_name=..." -backend-config="storage_account_name=..." ...

terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"          # the bootstrap state RG
    storage_account_name = "tfstateXXXXXX"        # globally unique; created during bootstrap
    container_name       = "tfstate"
    key                  = "next-azure-postgres.tfstate"
    use_azuread_auth     = true                   # auth to the state account via Entra, not a key
  }
}
