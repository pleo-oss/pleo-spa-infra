# Pleo SPA Terraform Module - DNS

Provision a certificate for the app domain (with wildcard alternative name for
feature branch deployments in staging). AWS requires certificates for CloudFront
distributions to be created in the global AWS region (us-east-1)

## How to use

```hcl
module "dns" {
  source = "./modules/frontend-spa-dns"
  env    = "production"

  zone_domain = "example.com"
  domain_name = "hello.example.com"

  cf_hosted_zone_id = module.cdn.cf_hosted_zone_id
  cf_domain_name    = module.cdn.cf_domain_name
}
```

<!-- BEGIN_TF_DOCS -->

#### Requirements

| Name                                                   | Version   |
| ------------------------------------------------------ | --------- |
| <a name="requirement_aws"></a> [aws](#requirement_aws) | ~> 4.20.1 |

#### Providers

| Name                                             | Version   |
| ------------------------------------------------ | --------- |
| <a name="provider_aws"></a> [aws](#provider_aws) | ~> 4.20.1 |

#### Modules

No modules.

#### Resources

| Name                                                                                                                        | Type        |
| --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [aws_route53_record.dns_record](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record) | resource    |
| [aws_route53_zone.private](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone)     | data source |
| [aws_route53_zone.public](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone)      | data source |

#### Inputs

| Name                                                                                 | Description                                                                               | Type     | Default | Required |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | -------- | ------- | :------: |
| <a name="input_cf_domain_name"></a> [cf_domain_name](#input_cf_domain_name)          | The domain name corresponding to the CloudFront distribution.                             | `string` | n/a     |   yes    |
| <a name="input_cf_hosted_zone_id"></a> [cf_hosted_zone_id](#input_cf_hosted_zone_id) | The CloudFront Distribution Route 53 zone ID                                              | `string` | n/a     |   yes    |
| <a name="input_domain_name"></a> [domain_name](#input_domain_name)                   | App domain name                                                                           | `string` | n/a     |   yes    |
| <a name="input_env"></a> [env](#input_env)                                           | Environment (production/staging)                                                          | `string` | n/a     |   yes    |
| <a name="input_zone_domain"></a> [zone_domain](#input_zone_domain)                   | The domain where the app lives (e.g. 'example.com' if the app lives at hello.example.com) | `string` | n/a     |   yes    |

#### Outputs

No outputs.

<!-- END_TF_DOCS -->
