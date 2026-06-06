variable "aws_region" {
  type        = string
  description = "The target AWS Region for all resources"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Name prefix applied to all provisioned infrastructure resources"
  default     = "cloud-deploy"
}

variable "environment" {
  type        = string
  description = "Target environment stage (e.g. staging, production)"
  default     = "production"
}

variable "instance_type" {
  type        = string
  description = "Size dimensions of the targeted AWS EC2 instance"
  default     = "t2.micro"
}

variable "allowed_ssh_cidr" {
  type        = list(string)
  description = "Allowed CIDR ranges for administrative SSH connection"
  default     = ["0.0.0.0/0"] # Broad fallback; in production, lock to target bastion or office IP
}

variable "public_key" {
  type        = string
  description = "Public SSH key text used for server authentication configurations"
}
