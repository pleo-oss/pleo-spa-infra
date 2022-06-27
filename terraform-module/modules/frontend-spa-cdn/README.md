# Pleo SPA Terraform Module - CDN

Creates a CloudFront CDN distribution for an SPA app.

## How to use

```hcl
module "cdn" {
  source      = "./modules/frontend-spa-cdn"
  app_name    = "hello-app"
  env         = "production"
  domain_name = "hello.example.com"
  bucket_name = module.s3.bucket_name

  bucket_regional_domain_name     = module.s3.bucket_regional_domain_name
  cloudfront_access_identity_path = module.s3.cloudfront_access_identity_path
  edge_lambdas = [
    for event_type, lambda in module.lambdas : { event_type = event_type, arn = lambda.lambda_arn }
  ]
  acm_certificate_arn = module.certificate.certificate_arn
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

| Name                                                                                                                                    | Type     |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| [aws_cloudfront_distribution.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution) | resource |
| [aws_s3_bucket_object.object](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object)             | resource |

#### Inputs

| Name                                                                                                                           | Description                                                 | Type                                                                      | Default            | Required |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------ | :------: |
| <a name="input_acm_certificate_arn"></a> [acm_certificate_arn](#input_acm_certificate_arn)                                     | Amazon Resource Name of the ACM certificate                 | `string`                                                                  | n/a                |   yes    |
| <a name="input_app_name"></a> [app_name](#input_app_name)                                                                      | Name of the app (kebab-case)                                | `string`                                                                  | n/a                |   yes    |
| <a name="input_bucket_name"></a> [bucket_name](#input_bucket_name)                                                             | The S3 origin bucket name.                                  | `string`                                                                  | n/a                |   yes    |
| <a name="input_bucket_regional_domain_name"></a> [bucket_regional_domain_name](#input_bucket_regional_domain_name)             | The S3 origin bucket region-specific domain name.           | `string`                                                                  | n/a                |   yes    |
| <a name="input_cloudfront_access_identity_path"></a> [cloudfront_access_identity_path](#input_cloudfront_access_identity_path) | A shortcut to the full path for the origin access identity. | `string`                                                                  | n/a                |   yes    |
| <a name="input_cloudfront_price_class"></a> [cloudfront_price_class](#input_cloudfront_price_class)                            | CloudFront distribution price class                         | `string`                                                                  | `"PriceClass_100"` |    no    |
| <a name="input_domain_name"></a> [domain_name](#input_domain_name)                                                             | App domain name                                             | `string`                                                                  | n/a                |   yes    |
| <a name="input_edge_lambdas"></a> [edge_lambdas](#input_edge_lambdas)                                                          | List of Lambda@Edge lambdas to associate                    | <pre>list(object({<br> event_type = string<br> arn = string<br> }))</pre> | n/a                |   yes    |
| <a name="input_env"></a> [env](#input_env)                                                                                     | Environment (production/staging)                            | `string`                                                                  | n/a                |   yes    |

#### Outputs

| Name                                                                                   | Description |
| -------------------------------------------------------------------------------------- | ----------- |
| <a name="output_cf_domain_name"></a> [cf_domain_name](#output_cf_domain_name)          | n/a         |
| <a name="output_cf_hosted_zone_id"></a> [cf_hosted_zone_id](#output_cf_hosted_zone_id) | n/a         |

<!-- END_TF_DOCS -->
