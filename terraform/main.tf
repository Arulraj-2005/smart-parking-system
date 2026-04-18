terraform {
  required_version = ">= 1.0"
  
  # Use local backend
  backend "local" {
    path = "terraform.tfstate"
  }
}

# This is a local-only Terraform configuration
# It does NOT require any external providers
# It simply documents your existing infrastructure

# Create a local file that documents your infrastructure
resource "local_file" "infrastructure_documentation" {
  filename = "${path.module}/infrastructure.txt"
  
  content = <<EOF
========================================
Smart Parking System - Infrastructure
========================================

PROJECT OVERVIEW:
-----------------
Name: Smart Parking System
Repository: https://github.com/Arulraj-2005/smart-parking-system
Description: Full-stack parking management system with DevOps practices

DEPLOYMENT URLs:
----------------
Frontend (Vercel):     https://smart-parking-system-pearl.vercel.app
Backend API (Render):  https://smart-parking-api-zbno.onrender.com
Health Check:          https://smart-parking-api-zbno.onrender.com/api/health

DATABASE:
---------
Platform: Supabase (PostgreSQL)
Region: ap-northeast-1 (Tokyo)
Status: Active

CI/CD PIPELINE:
---------------
Platform: GitHub Actions
Trigger: Push to master/main branch
Stages:
  - Checkout code
  - Setup Node.js
  - Install dependencies
  - Build Docker images
  - Run containers
  - Test API health
  - Cleanup

CONTAINERIZATION:
----------------
Dockerfile: Parking_frontend/Dockerfile
Dockerfile.backend: Parking_frontend/Dockerfile.backend
Docker Compose: docker-compose.yml

INFRASTRUCTURE AS CODE:
----------------------
Terraform: Infrastructure documentation
GitHub Actions: CI/CD pipeline
Docker Compose: Container orchestration

ENVIRONMENT VARIABLES:
---------------------
Backend (Render):
  - PORT: 5000
  - DB_HOST: aws-1-ap-northeast-1.pooler.supabase.com
  - DB_PORT: 5432
  - DB_NAME: postgres
  - NODE_ENV: production
  - JWT_SECRET: [configured in Render secrets]

Frontend (Vercel):
  - VITE_API_URL: https://smart-parking-api-zbno.onrender.com/api

========================================
EOF
}

# Create a JSON output file for machine-readable infrastructure info
resource "local_file" "infrastructure_json" {
  filename = "${path.module}/infrastructure.json"
  
  content = jsonencode({
    project = {
      name = "Smart Parking System"
      repository = "https://github.com/Arulraj-2005/smart-parking-system"
    }
    deployment = {
      frontend = "https://smart-parking-system-pearl.vercel.app"
      backend = "https://smart-parking-api-zbno.onrender.com"
      health = "https://smart-parking-api-zbno.onrender.com/api/health"
    }
    database = {
      platform = "Supabase PostgreSQL"
      region = "ap-northeast-1"
    }
    ci_cd = {
      platform = "GitHub Actions"
      trigger = "push to master"
    }
    containerization = {
      docker_compose = "docker-compose.yml"
      backend_dockerfile = "Parking_frontend/Dockerfile.backend"
      frontend_dockerfile = "Parking_frontend/Dockerfile"
    }
  })
}

# Output the infrastructure summary
output "infrastructure_summary" {
  value = <<EOF
========================================
Smart Parking System - Infrastructure
========================================
Frontend:    https://smart-parking-system-pearl.vercel.app
Backend:     https://smart-parking-api-zbno.onrender.com
Health:      https://smart-parking-api-zbno.onrender.com/api/health
Database:    Supabase PostgreSQL (ap-northeast-1)
CI/CD:       GitHub Actions
Container:   Docker + Docker Compose
Repository:  https://github.com/Arulraj-2005/smart-parking-system

 Documentation files created:
   - infrastructure.txt (human readable)
   - infrastructure.json (machine readable)
========================================
EOF
}