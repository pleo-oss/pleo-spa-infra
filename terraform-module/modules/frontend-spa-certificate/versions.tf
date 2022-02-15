# There are two AWS providers, since we need to access two AWS regions  -
#  - all the CDN infra (lambdas, cert) lives in "us-east-1" region (this is required by AWS)
#  - the S3 bucket for origin lives in "eu-west-1" region
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 3.8.0"
      configuration_aliases = [aws.global]
    }
  }
}
