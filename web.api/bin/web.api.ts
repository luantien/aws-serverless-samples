#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebApiStack } from '../lib/web.api-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App();
new WebApiStack(app, 'WebApiStack', {
    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */
    env: { account: process.env.AWS_ACCOUNT, region: process.env.AWS_REGION },
});
