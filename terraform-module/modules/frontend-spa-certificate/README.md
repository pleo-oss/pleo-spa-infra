# Pleo SPA Terraform Module - Certificate

Provision a certificate for the app domain (with wildcard alternative name for
feature branch deployments in staging). AWS requires certificates for CloudFront
distributions to be created in the global AWS region (us-east-1)

## How to use

```hcl
module "certificate" {
  source = "./modules/frontend-spa-certificate"

  env         = "production"
  zone_domain = "example.com
  domain_name = "hello.example.com"

  providers = {
    aws.global = aws.global
  }
}
```

## AWS Providers

Note that there are two AWS providers, since we need to access two AWS regions

- all the CDN infra (lambdas, cert) lives in "us-east-1" region (this is
  required by AWS)
- the S3 bucket for origin lives in "eu-west-1" region

<!-- BEGIN_TF_DOCS -->

#### Requirements

| Name                                                   | Version   |
| ------------------------------------------------------ | --------- |
| <a name="requirement_aws"></a> [aws](#requirement_aws) | ~> 4.20.1 |

#### Providers

| Name                                                                  | Version   |
| --------------------------------------------------------------------- | --------- |
| <a name="provider_aws"></a> [aws](#provider_aws)                      | ~> 4.20.1 |
| <a name="provider_aws.global"></a> [aws.global](#provider_aws.global) | ~> 4.20.1 |

#### Modules

No modules.

#### Resources

| Name                                                                                                                                                | Type        |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [aws_acm_certificate.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate)                             | resource    |
| [aws_acm_certificate_validation.validation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation) | resource    |
| [aws_route53_record.records](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record)                            | resource    |
| [aws_route53_zone.public](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone)                              | data source |

#### Inputs

| Name                                                               | Description                                                                               | Type     | Default | Required |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | -------- | ------- | :------: |
| <a name="input_domain_name"></a> [domain_name](#input_domain_name) | Full domain name of the app                                                               | `string` | n/a     |   yes    |
| <a name="input_env"></a> [env](#input_env)                         | Environment (production/staging)                                                          | `string` | n/a     |   yes    |
| <a name="input_zone_domain"></a> [zone_domain](#input_zone_domain) | The domain where the app lives (e.g. 'example.com' if the app lives at hello.example.com) | `string` | n/a     |   yes    |

#### Outputs

| Name                                                                             | Description |
| -------------------------------------------------------------------------------- | ----------- |
| <a name="output_certificate_arn"></a> [certificate_arn](#output_certificate_arn) | n/a         |

<!-- END_TF_DOCS -->
