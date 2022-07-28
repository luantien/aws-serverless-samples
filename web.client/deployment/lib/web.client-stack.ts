import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

export class WebClientStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'Bucket', {
            bucketName: process.env.S3_BUCKET_NAME,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            autoDeleteObjects: true,
            removalPolicy: RemovalPolicy.DESTROY,
            websiteIndexDocument: 'index.html',
        });

        const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
            comment: `OAI for ${bucket.bucketName}`,
        });

        const distribution = new cloudfront.CloudFrontWebDistribution(
            this,
            'Distribution',
            {
                originConfigs: [
                    {
                        s3OriginSource: {
                            s3BucketSource: bucket,
                            originAccessIdentity: oai,
                        },
                        behaviors: [{ isDefaultBehavior: true }],
                    },
                ],
            }
        );
        bucket.grantRead(oai);

        // 👇 create an Output
        new CfnOutput(this, 'bucketName', {
            value: bucket.bucketName,
            description: 'The name of the S3 bucket',
            exportName: 'web-client-bucket-name',
        });

        new CfnOutput(this, 'distributionDomainName', {
            value: distribution.distributionDomainName,
            description: 'The domain name of the CloudFront distribution',
            exportName: 'web-client-distribution-domain-name',
        });
    }
}
