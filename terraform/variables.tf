# Variables are for documentation purposes only
# Your actual infrastructure is documented in main.tf

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "Smart Parking System"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}